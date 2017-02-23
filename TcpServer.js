'use strict'

const _ = require('lodash')
const net = require('net');
const RequestHandler = require('./RequestHandler.js');
const config = require('./config.json')
const CommandsExecutor = require('./CommandsExecutor.js')
const StringDecoder = require('string_decoder')

function TcpServer(config, CommandsExecutor) {
    this._config = config
    this._commandsExecutor = new CommandsExecutor(this._config, this.sendResponse)
    this._server = net.createServer(_.bind(this._onConnecionStart, this))
    this._sockets = {}
    this._decoder = new StringDecoder.StringDecoder('utf8')
}

var p = TcpServer.prototype;

p.run = function() {
    this._server.listen(this._config.port, '0.0.0.0')
}

p._onConnecionStart = function(socket) {
    let self = this
    socket.auth = false
    console.log('conn start')
    self._sockets[socket.remoteAddress] = socket
    socket.on('data', function (data) {
        console.log('got data' + data)
        self._onRequest(socket, data)
    });
    socket.on('end', function () {
        console.log(socket.remoteAddress + " disconnected")
        delete self._sockets[socket.id]
    });
    this.sendResponse(socket, {ctx: 'sendcode', status: ''})
}

p._onRequest = function(socket, data) { 
   let reqParams = this._parseRequest(data)
    if (reqParams.cmd === 'password') {
        socket.auth = this._authenticate(socket, reqParams.value)
        console.log(this._authenticate(socket, reqParams.value))
        if (socket.auth) {
            console.log('got good pass')
            let status = this._commandsExecutor.getStatus()
            //console.log(status)
            this.sendResponse(socket, {ctx:'password', status: status})
        } else {
            console.log('got bad pass')
            this.sendResponse(socket, {ctx: 'password', status:'codenotok'})
            socket.end()
        }
    } else if (socket.auth) {
        let status = this._commandsExecutor.execute(reqParams)
        let response = {ctx: 'update', status: status}
        this.sendResponse(socket, response)
    }
};

p._parseRequest = function(data) {
    //console.log('_parseRequest' + data)
    let info = this._decoder.write(data)
    let list = info.split(' ')
    let params = {
        cmd: list[0],
        value: list[1]
    }
    return params
};

p._authenticate = function(socket, password) {
     return (password === this._config.password) 
}

p.sendResponse = function(socket, response) {
    socket.write(JSON.stringify(response));
}

let server = new TcpServer(config, CommandsExecutor)
server.run()