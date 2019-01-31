//Requires node.js and mqtt library installed.
var mqtt = require ( 'mqtt' );

// for importing configuration
var config = require ( './config' );
var utils = require ( './utils' );
var data = require ( './obd' );
var trips = require ( './trips' );


var connections = config.trackers.map ( function ( e , index ) {

    // Initialization of mqtt client using Thingsboard host and device access token
	console.log ( 'Connecting to: %s using access token: %s' , config.Host , e.key );
	var client = mqtt.connect ( 'mqtt://' + config.Host , { username : e.key } );
	
	var sequence = e.sequence;

	// Define a A to B road
	var trip = trips[ index ];
	
    // Triggers when client is successfully connected to the Thingsboard server
	client.on ( 'connect' , function () {
		
		
		
		console.log ( 'Client connected!' );
		// Uploads firmware version as device attribute using 'v1/devices/me/attributes' MQTT topic
		client.publish ( 'v1/devices/me/attributes' , JSON.stringify ( e.device ) );
		// Schedules telemetry data upload once per second
		console.log ( 'Uploading position and obdii data once per second...' );
		setInterval ( publishTelemetry , config.Timeout );
	} );
	
	// Uploads telemetry data using 'v1/devices/me/telemetry' MQTT topic
	function publishTelemetry () {
		data.ENGINE_LOAD = utils.randomIntFromInterval ( 1499000 , 1500000 );
		data.LONGITUDE = trip.longitudeValue[ sequence ];
		data.LATITUDE = trip.latitudeValue[ sequence ];
		data.SPEED = utils.randomIntFromInterval ( 65 , 85 );
		data.RPM = utils.randomIntFromInterval ( 1000 , 1500 );
		data.COOLANT_TEMP = utils.randomIntFromInterval ( 70 , 80 );
		data.PID_FUEL_RATE = utils.randomIntFromInterval ( 15 , 100 );
		client.publish ( 'v1/devices/me/telemetry' , JSON.stringify ( data ) );
		
		if ( trip.latitudeValue.length == sequence ) {
			trip.latitudeValue = trip.latitudeValue.reverse ();
			trip.longitudeValue = trip.longitudeValue.reverse ();
			sequence = 0;
		}
		sequence ++;
	}
	
	return client;
} );


//Catches ctrl+c event
process.on ( 'SIGINT' , function () {
	console.log ();
	
	connections.map ( function ( e , index ) {
		console.log ( `Disconnecting Tracker ${index}...` );
		e.end ();
		console.log ( 'Exited!' );
	} );
	
	process.exit ( 2 );
} );

//Catches uncaught exceptions
process.on ( 'uncaughtException' , function ( e ) {
	console.log ( 'Uncaught Exception...' );
	console.log ( e.stack );
	process.exit ( 99 );
} );


