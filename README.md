Pretty niche use case for Minecraft server hosts. 

I have two Google Cloud VMs. One hosts a reverse-proxy (Traefik) through which players connect to the Minecraft server VM. To save costs, the Minecraft server VM shuts down after 10 minutes of inactivity. 

This code can be run on the reverse-proxy VM, and hosts a 'dummy' server that is always online. When players try to connect, it starts the 'real' Minecraft server VM, and when it's up, it will automatically redirect traffic to the 'real' Minecraft server VM. This allows for a more seamless experience.

I am not good at Javascript so it's a messy. 

There are several parts in the code where you need to edit in IP addresses, and VM names. I've labelled these with 'TODO'.

Credentials for checking the status of and starting Google Cloud VMs is required also. This is automatically available on a Google Cloud VM.
