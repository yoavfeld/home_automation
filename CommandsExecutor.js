'use strict';

//const gpio = require('rpi-gpio');
const _ = require('lodash')
const sleep = require('sleep')
const debug = require('debug')

var p = CommandsExecutor.prototype;

function CommandsExecutor(config) {
    this._config = config
    this._status = []
    this._timeouts = []
    this._debug = debug('CommandsExecutor');
    this._initGPIO()
}

p._initGPIO = function() {
    this._debug('_initGPIO')
    for (let i = 0; i < this._config.numOfButtons; i++) {
        let button = this._config.buttons[i]
        if (button && button.pin) {
            gpio.setup(button.pin, gpio.DIR_OUT, write);
            this._setGPIO(button.pin, false)
        }
        this._status[i] = false
    }
}

p._setGPIO = function(pin, status) {
    this._debug('_setGPIO', arguments)
    gpio.write(pin, (status ? 1 : 0), function(err) {
        if (err) {
            throw err;
        } 
        console.log('pin ' + pin + ' changed to ' + status);
    });
}

p._handleTimer = function(index, conf) {
    this._debug('_handleTimer', arguments)
    let status = this._status[index]
    let timeoutId = this._timeouts[index]
    if (status != !!timeoutId) {
        console.log("ERROR: status and timeout are not correlated. button: " + index)
        return
    }
    if (timeoutId != null) {
        this._stopTimer(index, timeoutId)
        return
    }
    this._setGPIO(conf.pin, true)
    this._status[index] = true
    this._timeouts[index] = setTimeout(_.bind(this._turnOff, this, index, conf.pin), conf.delay*1000)
}

p._turnOff = function(index, pin) {
    this._debug('_turnOff', arguments)
    this._setGPIO(pin, false)
    this._status[index] = false
    this._timeouts[index] = null
}

p._stopTimer = function(index, timeoutId){
    this._debug('_stopTimer', arguments)
    clearTimeout(timeoutId)
    this._timeouts[index] = null 
    this._status[index] = false
}
p._handleSchedule = function(index, conf) {
    this._debug('_handleSchedule', arguments)
    let status = this._status[index]
    let timeoutId = this._timeouts[index]
    if (status != !!timeoutId) {
        console.log("ERROR: status and timeout are not correlated. button: " + index)
        return
    }
    if (timeoutId != null) {
        this._stopTimer(index, timeoutId)
        return
    }
    this._status[index] = true
    let id = setInterval(_.bind(this._startOnTime, this, conf.button, conf.startHour, index), 60*1000)
    this._timeouts[index] = id
}   
p._startOnTime = function(index, hour, parentIndex) {
    this._debug('_startOnTime', arguments)
    let conf = this._config.buttons[index]
    let dateTime = new Date();
    if (dateTime.getHours() === hour) {
        this._handleTimer(index, conf)
        clearInterval(this._timeouts[parentIndex])
        this._timeouts[parentIndex] = null
        this._status[parentIndex] = false
    }
}

p.execute = function(params) {
    this._debug('execute', arguments)
    switch (params.cmd) {
        case 'update':
            let button = this._config.buttons[params.value]
            switch (button.type) {
                case 'timer': {
                    this._handleTimer(params.value, button)
                    break;    
                }
                case 'schedule': {
                    this._handleSchedule(params.value, button)
                    break;    
                }
            }
            return this.getStatus()
            break;
        case 'get':
            if (params.value = 'status') {
                return this._status
            }
    }
}

p.getStatus = function() {
    this._debug('getStatus')
    let status = []
    for (let i = 0; i < this._status.length; i++) {
        status[i] = (this._status[i] ? 0 : 1) // an opposite condition
    }
    return status
}

module.exports = CommandsExecutor;