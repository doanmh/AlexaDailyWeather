'use strict';

var Alexa = require('alexa-sdk');
var http = require('https');
var stateHandlers = require('./stateHandlers');
var config = require('./config');

var alexa;

exports.handler = function(event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.registerHandlers(stateHandlers.newSessionHandlers, stateHandlers.startSessionHandlers, stateHandlers.currentWeatherModeIntentHandlers, stateHandlers.forecastModeIntentHandlers, stateHandlers.adviceModeIntentHandlers);
    alexa.execute();
}