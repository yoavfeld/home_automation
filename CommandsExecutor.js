'use strict';

const gpio = require('rpi-gpio');
const _ = require('lodash')
const debug = require('debug')
const sleep = require('sleep')

var p = CommandsExecutor.prototype;

function CommandsExecutor(config, updateFunc) {
    this._config = config
    this._updateAll = updateFunc
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
            gpio.setup(button.pin, gpio.DIR_OUT, _.bind(this._onSetupDone, this, button.pin));
        }
        this._status[i] = false
    }
};

p._onSetupDone = function(pin, err) {
    this._checkError()
    this._setGPIO(pin, false)
};

p._checkError = function(err) {
    if (err) {
        throw err;
    }
    debug('gpio action done')
};

p._setGPIO = function(pin, status) {
    console.log('_setGPIO', arguments)
    gpio.write(pin, (status ? 1 : 0), this._checkError)
    this._updateAll()
};

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
        this._setGPIO(conf.pin, false)    
        return
    }
    this._status[index] = true
    this._setGPIO(conf.pin, true)
    this._timeouts[index] = setTimeout(_.bind(this._turnOff, this, index, conf.pin), conf.delay*1000)
}

p._turnOff = function(index, pin) {
    this._debug('_turnOff', arguments)
    this._status[index] = false
    this._setGPIO(pin, false)
    this._timeouts[index] = null
};

p._stopTimer = function(index, timeoutId){
    this._debug('_stopTimer', index)
    clearTimeout(timeoutId)
    this._timeouts[index] = null 
    this._status[index] = false
};

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
        this._updateAll()
        return
    }
    this._status[index] = true
    let id = setInterval(_.bind(this._startOnTime, this, conf.button, conf.startHour, index), 60*1000)
    this._timeouts[index] = id
    this._updateAll()
};

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
};

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
                return this.getStatus()
            }
    }
};

p.getStatus = function() {
    this._debug('getStatus')
    let status = []
    for (let i = 0; i < this._status.length; i++) {
        status[i] = (this._status[i] ? 0 : 1) // an opposite condition
    }
    return status
};

module.exports = CommandsExecutor;