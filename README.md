Pretty niche use case for Minecraft server hosts. 

I have two Google Cloud VMs. One hosts a reverse-proxy (Traefik) through which players connect to the other VM, which hosts the Minecraft server. To save costs, the Minecraft server VM shuts down after 10 minutes of inactivity. This NodeJS code will automatically start the Minecraft server VM when players try and join, allowing for a more seamless experience.
