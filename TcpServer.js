'use strict'

const _ = require('lodash')
const net = require('net');
const config = require('./config.json')
const CommandsExecutor = require('./CommandsExecutor.js')
const StringDecoder = require('string_decoder')
const debug = require('debug')

function TcpServer(config, CommandsExecutor) {
    this._config = config
    this._commandsExecutor = new CommandsExecutor(this._config, _.bind(this._updateAll, this))
    this._server = net.createServer(_.bind(this._onConnecionStart, this))
    this._sockets = {}
    this._decoder = new StringDecoder.StringDecoder('utf8')
    this._debug = debug('TcpServer')
}

var p = TcpServer.prototype;

p.run = function() {
    this._server.listen(this._config.port, '0.0.0.0')
};

p._onConnecionStart = function(socket) {
    this._debug('_onConnecionStart')
    let self = this
    socket.auth = false
    console.log(socket.remoteAddress + " connected")
    self._sockets[socket.remoteAddress] = socket
    socket.on('data', function (data) {
        self._onRequest(socket, data)
    });
    socket.on('end', function () {
        console.log(socket.remoteAddress + " disconnected")
        delete self._sockets[socket.id]
    });
    this.sendResponse(socket, {ctx: 'sendcode', status: ''})
};

p._onRequest = function(socket, data) { 
    this._debug('_onRequest', data)
    let reqParams = this._parseRequest(data)
    if (reqParams.cmd === 'password') {
        socket.auth = this._authenticate(socket, reqParams.value)
        if (socket.auth) {
            this._debug('got good pass')
            let status = this._commandsExecutor.getStatus()
            this.sendResponse(socket, {ctx:'password', status: status})
        } else {
            console.log('got wrong password')
            this.sendResponse(socket, {ctx: 'password', status:'codenotok'})
            socket.end()
        }
    } else if (socket.auth) {
        this._commandsExecutor.execute(reqParams)
    }
};

p._parseRequest = function(data) {
    this._debug('_parseRequest', arguments)
    let info = this._decoder.write(data)
    let list = info.split(' ')
    let params = {
        cmd: list[0],
        value: list[1]
    }
    return params
};

p._updateAll = function() {
    this._debug('_updateAll')
    let status = this._commandsExecutor.getStatus()
    for (let id in this._sockets) {
        let socket = this._sockets[id]
        this.sendResponse(socket, {ctx: 'update', status:status})
    }
};

p._authenticate = function(socket, password) {
     return (password === this._config.password) 
};

p.sendResponse = function(socket, response) {
    socket.write(JSON.stringify(response)); // still not working
};

let server = new TcpServer(config, CommandsExecutor)
server.run()