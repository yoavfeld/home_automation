'use strict';

const gpio = require('rpi-gpio');
const runAsyncGen = require('run-async-gen');

var p = CommandsExecutor.prototype;

function CommandsExecutor(config) {
    this._config = config
    this._buttonsStat = []
    this._initGPIO()
}

p._initGPIO = function() {
    for (let i = 0; i < this._config.buttons; i++) {
        button = this._config.buttons[i]
        gpio.setup(button.pin, gpio.DIR_OUT, write);
        this._setGPIO(button.pin, false)
        this._buttonsStat[i] = false
    }
}

p._setGPIO = function(pin, status) {
    gpio.write(pin, status, function(err) {
        if (err) {
            throw err;
        } 
        console.log('Written to pin ' + pin);
    });
}

p._flipGPIO = function(pin) {
}

p._startOnTime = function() {

}

p._timer = function(index, pin, delay) {
    this._setGPIO(pin, true)
    this._buttonsStat[index] = true
    setTimeout(function() {
        this._setGPIO(pin, false)
        this._buttonsStat[index] = false
    }, delay)
}

p.execute = function(params) {
    switch (params.cmd) {
        case 'update':
            button = this._config.buttons[params.value]
            switch (button.type) {
                case 'timer': {
                    runAsyncGen(this._timer(params.value, buttonConf.pin, button.delay), null)
                    return this._buttonsStat
                    break;    
                }
                case 'schedule': {
                    break;    
                }
            }
            break;
        case 'get':
            if (params.value = 'status') {
                return this._buttonsStat
            }
    }
}

p.getStatus = function() {
    return this._buttonsStat
}


module.exports = CommandsExecutor;