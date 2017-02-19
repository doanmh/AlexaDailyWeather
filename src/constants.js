'use strict';

module.exports = Object.freeze({
	states : {
		START_MODE : '_START_MODE',
	    CURRENT_WEATHER_MODE : '_CURRENT_WEATHER_MODE',
	    FORECAST_MODE : '_FORECAST_MODE',
	    ADVICE_MODE : '_ADVICE_MODE'
	},
	weatherUrl: "https://api.darksky.net/forecast/"
});