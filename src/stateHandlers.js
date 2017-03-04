'use strict';

var Alexa = require('alexa-sdk');
var http = require('https');
var constants = require('./constants');
var config = require('./config');

var weatherID = config.weatherId;
var location = config.location;
var weatherUrl = constants.weatherUrl + weatherID + "/" + location + "?exclude=" + config.exclude + "&units=" + config.units;

var dateMap = {
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
    "sunday": 0
}

var welcomeMessage = "Hello, welcome to Daily Weather. How may I help you?";
var helpMessage = "Here is something you can say: Get curernt weather information. Get weather information for tomorrow. What should I wear?";

var stateHandlers = {
	newSessionHandlers : {
	    'LaunchRequest': function() {
	        this.handler.state = constants.states.START_MODE;
	        this.emit(':ask', welcomeMessage, welcomeMessage);
	    },
	    'CurrentWeatherIntent': function() {
	        this.handler.state = constants.states.CURRENT_WEATHER_MODE;
	        this.emitWithState("CurrentWeatherIntent");
	    },
	    'ForecastIntent' : function() {
	        this.handler.state = constants.states.FORECAST_MODE;
	        this.emitWithState("ForecastIntent");
	    },
	    'AdviceIntent' : function() {
	        this.handler.state = constants.states.ADVICE_MODE;
	        this.emitWithState("AdviceIntent");
	    },
	    'Unhandled': function() {
	        this.emit(':ask', helpMessage, helpMessage);
	    }
	},
	startSessionHandlers : Alexa.CreateStateHandler(constants.states.START_MODE, {
	    'CurrentWeatherIntent': function() {
	        this.handler.state = constants.states.CURRENT_WEATHER_MODE;
	        this.emitWithState("CurrentWeatherIntent");
	    },
	    'ForecastIntent' : function() {
	        this.handler.state = constants.states.FORECAST_MODE;
	        this.emitWithState("ForecastIntent");
	    },
	    'AdviceIntent' : function() {
	        this.handler.state = constants.states.ADVICE_MODE;
	        this.emitWithState("AdviceIntent");
	    },
	    'AMAZON.StopIntent': function() {
	        this.emit(':tell', 'Goodbye!');
	    },
	    'SessionEndedRequest': function() {
	        this.emit('AMAZON.StopIntent');
	    },
	    'Unhandled': function() {
	        this.emit(':ask', helpMessage, helpMessage);
	    }
	}),
	currentWeatherModeIntentHandlers : Alexa.CreateStateHandler(constants.states.CURRENT_WEATHER_MODE, {
	    'CurrentWeatherIntent': function() {
	        var currentWeather = this;
	        parseJsonWeather(weatherUrl, function(weather) {
	            var temp = Math.round(weather.currently.temperature);
	            var apparentTemp = Math.round(weather.currently.apparentTemperature);
	            var description = weather.currently.summary;
	            var speechText = "It is " + description + " now. ";
	            speechText += "The current temperature is " + temp + " degree Celcius. ";
	            if (temp != apparentTemp) {
	                speechText += "But it feels like " + apparentTemp + " degree Celcius. ";
	            } 
	            var windSpeed = weather.currently.windSpeed;
	            speechText += analyzeWind(windSpeed) + "; as the wind speed is " + windSpeed + " meter per second.";
	            
	            currentWeather.emit(':tell', speechText);
	        });
	    },
	    'AMAZON.StopIntent': function() {
	        this.emit(':tell', 'Goodbye!');
	    },
	    'SessionEndedRequest': function() {
	        this.emit('AMAZON.StopIntent');
	    },
	    'Unhandled': function() {
	        this.emit(':ask', helpMessage, helpMessage);
	    }
	}),
	forecastModeIntentHandlers : Alexa.CreateStateHandler(constants.states.FORECAST_MODE, {
	    'ForecastIntent': function() {
	        var forecastWeather = this;
	        parseJsonWeather(weatherUrl, function(weather) {
	            var date = new Date();
	            date = date.getDay();
	            if ("value" in forecastWeather.event.request.intent.slots.date) {
	        		var slotValue = forecastWeather.event.request.intent.slots.date.value.toLowerCase();
		            var dataIndex;
		            if (slotValue == "tomorrow") {
		                dataIndex = 1;
		            } else if (slotValue == "today") {
		                dataIndex = 0;
		            } else {
		                dataIndex = dateMap[slotValue] - date;    
		                if (dataIndex == 0) {
		                    dataIndex = 7;
		                }
		            }
	        	} else {
	        		dataIndex = 0;
	        		slotValue = "Today";
	        	}
	            var minTemp = Math.round(weather.daily.data[dataIndex].temperatureMin);
	            var maxTemp = Math.round(weather.daily.data[dataIndex].temperatureMax);
	            var description = weather.daily.data[dataIndex].summary;
	            var precipType = weather.daily.data[dataIndex].precipType;
	            var precipChance = weather.daily.data[dataIndex].precipProbability;
	            var windSpeed = weather.daily.data[dataIndex].windSpeed;
	            var speechText = "Weather forecast for " + slotValue + ": " + description + " ";
	            if (precipType) {
	                speechText += "The chance of " + precipType + " is " + precipChance*100 + " percent. ";
	            }
	            speechText += "The minimum temperature is " + minTemp + " degree Celcius; and the maximum temperature is " + maxTemp + " degree Celcius. ";
	            speechText += analyzeWind(windSpeed) + "; as the wind speed is " + windSpeed + " meter per second";

	            forecastWeather.emit(':tell', speechText);
	        });
	    },
	    'AMAZON.StopIntent': function() {
	        this.emit(':tell', 'Goodbye');
	    },
	    'SessionEndedRequest': function() {
	        this.emit('AMAZON.StopIntent');
	    },
	    'Unhandled': function() {
	        this.emit(':ask', helpMessage, helpMessage);
	    }
	}),
	adviceModeIntentHandlers : Alexa.CreateStateHandler(constants.states.ADVICE_MODE, {
	    'AdviceIntent': function() {
	        var advice = this;
	        parseJsonWeather(weatherUrl, function(weather) {
	        	var date = new Date();
	        	date = date.getDay();
	        	if ("value" in advice.event.request.intent.slots.date) {
	        		var slotValue = advice.event.request.intent.slots.date.value.toLowerCase();
		            var dataIndex;
		            if (slotValue == "tomorrow") {
		                dataIndex = 1;
		            } else if (slotValue == "today") {
		                dataIndex = 0;
		            } else {
		                dataIndex = dateMap[slotValue] - date;    
		                if (dataIndex == 0) {
		                    dataIndex = 7;
		                }
		            }
	        	} else {
	        		dataIndex = 0;
	        		slotValue = "Today";
	        	}
	            var minTemp = Math.round(weather.daily.data[dataIndex].apparentTemperatureMin);
	            var maxTemp = Math.round(weather.daily.data[dataIndex].apparentTemperatureMax);
	            var averageTemp = (minTemp + maxTemp)/2;
	            var precipChance = weather.daily.data[dataIndex].precipProbability;
	            var mainWeather = weather.daily.data[dataIndex].icon;
	            var speechText = "";
	            if (averageTemp <= -5) {
	                speechText += slotValue + " is very cold. You should wear something really warm. A coat is a good idea. Don't forget your gloves and scarf. ";
	            } else if (averageTemp > -5 && averageTemp <= 5) {
	                speechText += slotValue + " is cold. You should consider wearing a sweat shirt inside. Gloves and scarf may be a good idea. ";
	            } else if (averageTemp > 5 && averageTemp <= 10) {
	                speechText += slotValue + " is not very cold. You can just wear a hoodie. ";
	            } else if (averageTemp > 10 && averageTemp <= 20) {
	                speechText += slotValue + " is warm. You can just wear a long-sleeve shirt or a hoodie is also ok. ";
	                if (mainWeather.toLowerCase() == "clear-day") {
	                    speechText += "It will be sunny during the day so sunglasses is not a good choice. ";
	                }
	            } else if (averageTemp > 20 && averageTemp <= 30) {
	                speechText += slotValue + " is very warm. You can just wear a T-shirt. ";
	                if (mainWeather.toLowerCase() == "clear-day") {
	                    speechText += "It will be sunny during the day so sunglasses is not a good choice. ";
	                }
	            } else {
	                speechText += slotValue + " is really hot. You should wear something cool. May be shorts and a T-shirt. ";
	                if (mainWeather.toLowerCase() == "clear-day") {
	                    speechText += "It will be sunny during the day so sunglasses is not a good choice. ";
	                }
	            }

	            if (mainWeather.toLowerCase() == "rain" && precipChance > 0.5) {
	                speechText += "It may rain today so you should consider bringing un umbrella or a raincoat and wear water proof shoes! If you're driving, please be careful! ";
	            } else if (mainWeather.toLowerCase() == "snow" && precipChance > 0.5) {
	                speechText += "It may snow today so you should wear water proof shoes. If you're driving, please be careful since the road may be slippery! ";
	            }

	            advice.emit(':tell', speechText);
	        });
	    },
	    'AMAZON.StopIntent': function() {
	        this.emit(':tell', 'Goodbye');
	    },
	    'SessionEndedRequest': function() {
	        this.emit('AMAZON.StopIntent');
	    },
	    'Unhandled': function() {
	        this.emit(':ask', helpMessage, helpMessage);
	    }
	})
};

module.exports = stateHandlers;

function parseJsonWeather(url, eventCallBack) {
    http.get(url, function(res) {
        var body = "";

        res.on("data", function(chunk) {
            body += chunk;
        });

        res.on("end", function() {
            var result = JSON.parse(body);
            eventCallBack(result);
        });
    }).on("error", function(err) {
        console.log(err);
    });
};

function analyzeWind(speed) {
    if (speed < 1) {
        return "Also, There will be light wind ";
    } else if (speed < 5 && speed >= 1) {
        return "Also, be aware of the moderate wind ";
    } else if (speed >= 5 && speed < 10) {
        return "Also, please be careful of the pretty strong wind ";
    } else if (speed >= 10 && speed < 20) {
        return "Please be cautious of the strong wind ";
    } else if (speed >= 20 && speed < 30) {
        return 
    } else {
        return "Please be very cautious of the extremely strong wind ";
    }
};