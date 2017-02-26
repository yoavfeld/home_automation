'use strict';

const gpio = require('rpi-gpio');
const _ = require('lodash')
const debug = require('debug')
const sleep = require('sleep')
const log4js = require('log4js')

var p = CommandsExecutor.prototype;

function CommandsExecutor(config, updateFunc) {
    this._config = config
    this._updateAll = updateFunc
    this._status = []
    this._timings = []
    this._debug = debug('CommandsExecutor');
    this._log = log4js.getLogger('CommandsExecutor');
}

p.Init = function() {
    this._debug('Init')
    for (let i = 0; i < this._config.numOfButtons; i++) {
        let button = this._config.buttons[i]
        if (button && button.pin) {
            gpio.setup(button.pin, gpio.DIR_OUT, _.bind(this._onSetupDone, this, i));
        } else {
            this._setButton(i, false)
        }
    }
};

p._onSetupDone = function(index, err) {
    this._checkError()
    this._setButton(index, false)
};

p._checkError = function(err) {
    if (err) {
        throw err;
    }
    debug('gpio action done')
};

p._setButton = function(index, state) {
    let conf = this._config.buttons[index]
    this._log.info('set button ' + index + ' to ' + state)
    this._status[index] = state
    if (conf.pin) {
        this._setGPIO(conf.pin, state)
    }
    this._updateAll()
}

p._setGPIO = function(pin, status) {
    this._debug('_setGPIO', arguments)
    gpio.write(pin, (status ? 1 : 0), this._checkError)
};

p.execute = function(params) {
    this._debug('execute', arguments)
    switch (params.cmd) {
        case 'update':
            let button = this._config.buttons[params.value]
            switch (button.type) {
                case 'schedule':
                case 'timer': {
                    this._handleTiming(params.value, button)
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

p._handleTiming = function(index, conf) {
    this._debug('_handleSchedule', arguments)
    let status = this._status[index]
    let timeoutId = this._timings[index]
    if (status != !!timeoutId) {
        this._log.error("ERROR: status and timeout are not correlated. button: " + index)
        return
    }
    if (timeoutId != null) {
        this._stopTimer(index, timeoutId)
        return
    }
    this._setButton(index, true)
    switch (conf.type) {
        case 'timer': {
            this._timings[index] = setTimeout(_.bind(this._turnOff, this, index, conf.pin), conf.delay*1000)
            break;
        }
        case 'schedule': {
            let id = setInterval(_.bind(this._startOnTime, this, conf.button, conf.startHour, index), 60*1000)
            this._timings[index] = id
            break;
        }
    }
}

p._stopTimer = function(index, timeoutId){
    this._debug('_stopTimer', index)
    clearTimeout(timeoutId)
    this._timings[index] = null
    this._setButton(index, false)
};

p._turnOff = function(index, pin) {
    this._debug('_turnOff', arguments)
    this._setButton(index, false)
    this._timings[index] = null
};

p._startOnTime = function(index, hour, parentIndex) {
    this._debug('_startOnTime', arguments)
    let conf = this._config.buttons[index]
    let dateTime = new Date();
    if (dateTime.getHours() === hour) {
        this._handleTiming(index, conf)
        clearInterval(this._timings[parentIndex])
        this._timings[parentIndex] = null
        this._setButton(parentIndex, false)
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