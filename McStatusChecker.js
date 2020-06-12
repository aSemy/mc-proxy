const ping = require('minecraft-server-util');
const EventEmitter = require('events').EventEmitter
const Compute = require('@google-cloud/compute');
const compute = new Compute();

const checkIntervalMillis = 1000 * 5;

const targetVM = 'TODO'; // put the name of the Minecraft server here, e.g. 'mc-server'
const targetZone = 'europe-west4-a';
const zone = compute.zone(targetZone);
const vm = zone.vm(targetVM);

class McStatusChecker extends EventEmitter {
    constructor(host, port) {
        super();
        this.currentStatus = 'UNKNOWN';
        this.host = host;
        this.port = port;
    }

    check() {
        const self = this

        setInterval(async function a() {

            let data = await getStatus(self.host, self.port);
            let newStatus = data[0];

            if (self.currentStatus !== newStatus) {
                console.log("status changed - changing from %s to %s [status: %s]", self.currentStatus, newStatus, data[1]);
                self.currentStatus = newStatus;
                if (data[1] !== null)
                    self.emit(self.currentStatus, data[1]);
                else
                    self.emit(self.currentStatus);
            }

            //console.log("---");
            //setTimeout(a, checkIntervalMillis);
        }, checkIntervalMillis);
    }
}

module.exports = McStatusChecker;

async function getStatus(host, port) {

    let vmUp = await checkVm();

    if (vmUp[0]) {
        let mcUp = await checkMc(host, port);
        if (mcUp) {
            //console.log("mcUp - emitting")
            return ['mcUp', vmUp[1]];
        } else {
            //console.log("vmUp (implies mc is down) - emitting")
            return ['vmUp', vmUp[1]];
        }
    } else {
        //console.log("vmDown - emitting")
        return ['vmDown', vmUp[1]];
    }
}

async function checkMc(host, port) {
    return await ping(host, port,
        {
            connectTimeout: (checkIntervalMillis / 5)
        }
    ).then((data) => {
//         if (data === false) {
//        console.log("mc is down");
//         } else {
//       console.log(data);
//        console.log("mc is up");
//         }
        return data !== false;
    }).catch((error) => {
        console.log("mc is down, error: " + error);
        return false;
    })
}

async function checkVm() {
    return await vm.getMetadata()
        .then(function (data) {
            // console.log(data);
            let status = data[0]['status'];
//            console.log(status);
            let isRunning = status === 'RUNNING';
            return [isRunning, status];
        }).catch((error) => {
            console.log('error: ' + error);
            return [true, null];
        });
}
