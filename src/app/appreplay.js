/**
 * AppReplay
 *
 * This is the main function to replay data from log files.
 */


// Load the log file to replay
/* global log */
require('../device/replay/log-2016-03-15.json');
var dateStart = 1458043980000; // 2016-03-15 13:13:00 CET

// Particle filter
var AuxPhd = require('../auxphd/auxphd.js');

// Environment
var environment = require('./environment/first_floor.js');

// Replay tools
var replay = require('../device/replay/replay.js');
var rssifilter = require('../device/filter.js');

// User interface
var draw = require('../draw/draw.js');
var drawAuxPhd = require('../draw/draw_auxphd.js');




// Set up the tracking filter
var NMaxTargets = 5;
var NParticlesperTarget = 200;
var NAuxiliaryParticles = 400;
var initInfo = environment.bounds;
var alm = new AuxPhd(NMaxTargets, NParticlesperTarget, NAuxiliaryParticles, initInfo, environment.bounds);




// Set up the replay device
replay.open(log, update); // Note: variable 'log' is set by including log.json in index.html.

// Set up the RSSI filter to interpret replayed data
function getMeasurements() {
    var link_measurements = replay.getMeasurements(environment.beacons);
    return rssifilter.filter(link_measurements, environment.beacons);
}



// Set up drawing
draw.attach(document.getElementById('canvas'));
draw.setView(-1.0, -9.0, 7.5, 10.0);


// Create state object to send beacons to drawing function
var state = {
    measurements: [],
    actors: [],
    beacons: environment.beacons
};


// Function to handle new observations
var firstMeasurementReceived = false;
function update(deltaT) {
    // Update the ALM filter
    alm.predict(deltaT);
    // Update measurements
    state.measurements = getMeasurements();
    if (!firstMeasurementReceived && state.measurements.length > 0) {
        firstMeasurementReceived = true;
    }
    // Update ALM filter
    alm.observe(state.measurements);

}

// Update the particle filter and draw the new state
function updateAndDraw(deltaT) {
    update(deltaT);
    // Draw the current state
    draw.draw(state);
    drawAuxPhd(alm);
    // Show filter output
    document.getElementById('filter').innerHTML = alm.total_weight;
    document.getElementById('clock').innerHTML = new Date(replay.getCurrentTime() * 1000);
}








// Skip until the first filtered measurement is received
while (!firstMeasurementReceived) {
    replay.runOnce();
}

// Fast-forward through observations (estimate baseline etc.) until the actual action begins
function startAtTime() {
    if (replay.getCurrentTime() * 1000 < dateStart) {
        replay.runOnce(updateAndDraw);
        document.getElementById('clock').innerHTML = new Date(replay.getCurrentTime() * 1000) + ' (FAST FORWARDING...)';
        setTimeout(startAtTime, 10);
    } else {
        // Start the replay at the recorded speed
        replay.run(updateAndDraw);
    }
}

startAtTime();
