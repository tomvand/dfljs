/* global log */
require('../device/replay/log-2016-03-10.json');

var replay = require('../device/replay/replay.js');
var rssifilter = require('../device/filter.js');
var AuxPhd = require('../auxphd/auxphd.js');
var draw = require('../draw/draw.js');
var drawAuxPhd = require('../draw/draw_auxphd.js');
var environment = require('./environment/office_small.js');

// Set up the replay device
replay.open(log, receiveMeasurement); // Note: variable 'log' is set by including log.json in index.html.

// Set up the RSSI filter to interpret replayed data
function getMeasurements() {
    var link_measurements = replay.getMeasurements(environment.beacons);
    return rssifilter.filter(link_measurements, environment.beacons);
}

// Set up the tracking filter
var NMaxTargets = 5;
var NParticlesperTarget = 200;
var NAuxiliaryParticles = 400;
var initInfo = environment.bounds;
var alm = new AuxPhd(NMaxTargets, NParticlesperTarget, NAuxiliaryParticles, initInfo, environment.bounds);

// Set up drawing
draw.attach(document.getElementById('canvas'));
draw.setView(2.05, -5.05, 4, 6);

// Get measurements until one of the filters is fully initialized and
// returning data.
var state = {
    measurements: [],
    actors: [],
    beacons: environment.beacons // TODO fix in draw
};

// Set up measurement updates
var firstMeasurementReceived = false;
function receiveMeasurement(deltaT) {
    // Update the ALM filter
    alm.predict(deltaT);
    // Update measurements
    state.measurements = getMeasurements();
    if (!firstMeasurementReceived && state.measurements.length > 0) {
        firstMeasurementReceived = true;
    }
    document.getElementById('clock').innerHTML = new Date(replay.getCurrentTime() * 1000);
    // Update ALM filter
    alm.observe(state.measurements);
    document.getElementById('filter').innerHTML = alm.total_weight;
    // Draw the current state
    draw.draw(state);
    drawAuxPhd(alm);
}

// Skip until the first filtered measurement is received
while (!firstMeasurementReceived) {
    replay.handleThis();
}

// Start the replaying
replay.start();
