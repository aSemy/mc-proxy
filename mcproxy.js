const McStatusChecker = require('./McStatusChecker');
const mcp = require('minecraft-protocol');
const net = require('net')
const Compute = require('@google-cloud/compute');
const compute = new Compute();

const minecraftVersion = "1.15.2";

const localHost = '0.0.0.0';
const localPort = 25565;
const remoteHost = 'TODO'; // put the internal IP of the Minecraft server here
const remotePort = 25565;
const fakeHost = '0.0.0.0';
const fakePort = 24465;

let isRemoteUp = null;

const offlineMessage = "My MC server. Status: offline. Try connecting to turn the server on!";
const startingMessage = "My MC server. Status: starting. Keep refreshing until it's online!";
const onlineMessage = "My MC server. Status: online. This message shouldn't be visible...";

const nodeServer = mcp.createServer({
    'online-mode': true,
    encryption: true,
    host: fakeHost,
    port: fakePort,
    motd: offlineMessage,
    version: minecraftVersion
});
nodeServer.on('error', function (error) {
    console.log('nodeServer Error:', error);
});
nodeServer.on('listening', function () {
    console.log('nodeServer listening on %s:%s',
        nodeServer.socketServer.address().address,
        nodeServer.socketServer.address().port);
});
nodeServer.on('login', function (client) {
    console.log('Start the real server!!');
    client.end(startingMessage);
    (async () => await startInstance())();
});

const statusChecker = new McStatusChecker(remoteHost, remotePort);
statusChecker.on('mcUp', function (status) {
    isRemoteUp = true;
    nodeServer.motd = onlineMessage + " [" + status + "]";
    console.log('mcUp action');
});
statusChecker.on('vmUp', function (status) {
    isRemoteUp = false;
    nodeServer.motd = startingMessage + " [" + status + "]";
    console.log('vmUp action');
});
statusChecker.on('vmDown', function () {
    isRemoteUp = false;
    nodeServer.motd = offlineMessage;
    console.log('vmDown action');
});
statusChecker.check();

const forwardingServer = net.createServer(function (localSocket) {

    const remoteSocket = new net.Socket();
    remoteSocket.connect(remotePort, remoteHost);
    const nodeServerSocket = new net.Socket();
    nodeServerSocket.connect(fakePort, fakeHost);

    localSocket.on('data', function (data) {
        //console.log('local > data (isRemoteUp: %s)', isRemoteUp);
        if (isRemoteUp === null)
            return;
        const flushed = isRemoteUp ? remoteSocket.write(data) : nodeServerSocket.write(data);
        if (!flushed) {
            console.log("  remote not flushed; pausing local");
            localSocket.pause();
        }
    });
    remoteSocket.on('data', function (data) {
        let writeable = localSocket.writable;
        //console.log('remote > data (writeable: %s)', writeable);
        if (writeable) {
            const flushed = localSocket.write(data);
            if (!flushed) {
                console.log("  local not flushed; pausing remote");
                remoteSocket.pause();
            }
        }
    });
    nodeServerSocket.on('data', function (data) {
        let writeable = localSocket.writable;
        //console.log('nodeServer > data (writeable: %s)', writeable);
        if (writeable) {
            const flushed = localSocket.write(data);
            if (!flushed) {
                console.log("  local not flushed; pausing remote");
                remoteSocket.pause();
            }
        }
    });
    localSocket.on('connect', function (data) {
        //console.log('local > connect');
    });
    localSocket.on('drain', function () {
        //console.log('local > drain');
        remoteSocket.resume();
    });
    localSocket.on('close', function () {
        //console.log('local > close');
        remoteSocket.end();
    });
    remoteSocket.on('drain', function () {
        //console.log('remote > drain');
        localSocket.resume();
    });
    remoteSocket.on('ready', function () {
        //console.log('remote > ready');
    });
    remoteSocket.on('error', function (error) {
        //console.log('remote > error');
        localSocket.end();
    });
    remoteSocket.on('timeout', function () {
        //console.log('remote > timeout');
    });
});

const targetVM = 'mc-server-n1';
const targetZone = 'europe-west4-a';
const zone = compute.zone(targetZone);
const vm = zone.vm(targetVM);

// async function sleep(milliseconds) {
//     return new Promise(function (resolve, reject) {
//         setTimeout(resolve, milliseconds);
//     });
// }

async function startInstance() {

    console.log('zone.id: ' + zone.id);
    console.log('vm.id: ' + vm.id);

    // Start the VM
    console.log('about to start VM ' + targetVM);
    vm.start(function (err, operation, apiResponse) {

        console.log('err: ' + err);
        console.log('operation: ' + operation);
        console.log('apiResponse: ' + apiResponse);

        console.log('instance start successfully');
    });
    console.log('the server is starting');
    // while (!isRemoteUp) {
    //     console.log('Server is not ready, waiting 5 seconds...');
    //     await sleep(5000);
    //     console.log('Checking server readiness again...');
    // }
    // console.log('the server is ready');
    return true;
}

forwardingServer.listen(localPort, localHost);
