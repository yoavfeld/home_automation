cd /home/pi/ha_server/
mv forever.log lastlog.log
sudo forever start -l /home/pi/ha_server/forever.log -e /home/pi/ha_server/forever.log -a ./TcpServer.js