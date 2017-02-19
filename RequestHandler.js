'use strict'

const StringDecoder = require('string_decoder')

function RequestHandler(config) {
    this._decoder = new StringDecoder.StringDecoder('utf8');
    this._auth = false
    this._config = config
}

var p = RequestHandler.prototype;

p.execute = function(socket) {
    let reqParams = this._parseRequest(socket)

    if (reqParams.cmd === 'password') {
        this._authenticate(socket, reqParams.data)
    } else if (this._auth) {
        console.log('authorized')
    }
};

p._parseRequest = function(socket) {
    let data = this._decoder.write(socket)
    let list = data.split(' ')
    let params = {
        cmd: list[0],
        data: list[1]
    }
    return params
};

p._authenticate = function(socket, password) {
     if (password === this._config.password) {
        console.log('got good pass')
        this._auth = true
        this.sendResponse(socket, 'password', "inputs")
     } else {
         console.log('got bad pass')
        this.sendResponse(socket, 'password', 'codenotok')
        socket.end()
     }
     return this._auth 
}

p.sendResponse = function(socket, ctx, status) {
    let response = {}
    response['ctx'] = ctx
    response['status'] = status
    socket.write(JSON.stringify(response));
}
module.exports = RequestHandler;