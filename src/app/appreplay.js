/* global log */
require('../device/replay/log-2016-03-02.json');

var replay = require('../device/replay/replay.js');
var rssifilter = require('../device/filter.js');
var Alm = require('../alm/alm.js');
var draw = require('../draw/draw.js');
var drawAlm = require('../draw/draw_alm.js');
var environment = require('./environment/office_small.js');

// Set up the replay device
replay.open(log); // Note: variable 'log' is set by including log.json in index.html.

// Set up the RSSI filter to interpret replayed data
function getMeasurements() {
    var link_measurements = replay.getMeasurements(environment.beacons);
    return rssifilter.filter(link_measurements, environment.beacons);
}

// Set up the tracking filter
var Ntargets = 1;
var Nparticles = 1000;
var initInfo = environment.bounds;
var alm = new Alm(Ntargets, Nparticles, initInfo, environment.bounds);

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
while (!state.measurements.length) {
    state.measurements = getMeasurements();
}

// Set up measurement updates
var meas_period = 1.000;
setInterval(function () {
    // Update measurements
    state.measurements = getMeasurements();
    document.getElementById('clock').innerHTML = new Date(replay.getCurrentTime() * 1000);
    // Update ALM filter
    alm.observe(state.measurements);
    document.getElementById('filter').innerHTML = alm.total_weight;
    alm.cluster();
}, meas_period * 1000);

// Set up time updates
var time_period = 0.100;
setInterval(function () {
    // Draw the current state
    draw.draw(state);
    drawAlm(alm);
    // Update the ALM filter
    alm.predict(time_period);
}, time_period * 1000);