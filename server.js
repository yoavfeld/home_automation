'use strict'

let net = require('net');
let RequestHandler = require('./RequestHandler.js');
const config = require('./config.json')

var server = net.createServer(function(socket) {
	
    
    var requestHandler = new RequestHandler(config);
    socket.on('data', function (data) {
        requestHandler.execute(data);    
    });
    requestHandler.sendResponse(socket, 'sendcode', '')
});

server.listen(config.port, '0.0.0.0');
console.log('server started')