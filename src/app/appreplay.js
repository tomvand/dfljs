/* global log */
require('../device/replay/log-2016-03-15.json');

var replay = require('../device/replay/replay.js');
var rssifilter = require('../device/filter.js');
var AuxPhd = require('../auxphd/auxphd.js');
var draw = require('../draw/draw.js');
var drawAuxPhd = require('../draw/draw_auxphd.js');
var environment = require('./environment/first_floor.js');

// Set up the replay device
replay.open(log, update); // Note: variable 'log' is set by including log.json in index.html.

// Set up the RSSI filter to interpret replayed data
function getMeasurements() {
    var link_measurements = replay.getMeasurements(environment.beacons);
    return rssifilter.filter(link_measurements, environment.beacons);
}

// Set up the tracking filter
var NMaxTargets = 5;
var NParticlesperTarget = 500;
var NAuxiliaryParticles = 500;
var initInfo = environment.bounds;
var alm = new AuxPhd(NMaxTargets, NParticlesperTarget, NAuxiliaryParticles, initInfo, environment.bounds);

// Set up drawing
draw.attach(document.getElementById('canvas'));
draw.setView(-1.0, -9.0, 7.5, 10.0);

// Get measurements until one of the filters is fully initialized and
// returning data.
var state = {
    measurements: [],
    actors: [],
    beacons: environment.beacons // TODO fix in draw
};

// Set up measurement updates
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

var dateStart = 1458043980000; // 2016-03-15 13:13:00 CET
function startAtTime() {
    if (replay.getCurrentTime() * 1000 < dateStart) {
        replay.runOnce(updateAndDraw);
        document.getElementById('clock').innerHTML = new Date(replay.getCurrentTime() * 1000) + ' (FAST FORWARDING...)';
        setTimeout(startAtTime, 10);
    } else {
        replay.run(updateAndDraw);
    }
}

startAtTime();
