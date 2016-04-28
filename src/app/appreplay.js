/* global log */
require('../device/replay/log-2016-03-15.json');

var replay = require('../device/replay/replay.js');
var rssifilter = require('../device/filter.js');
var AuxPhd = require('../auxphd/auxphd.js');
var draw = require('../draw/draw.js');
var drawAuxPhd = require('../draw/draw_auxphd.js');
var environment = require('./environment/first_floor.js');
var observation_model = require('../model/observation.js');
var Actor = require('../sim/actor.js');

var clone = require('clone');

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
    actors: [new Actor(1.7, 4.5, 0)],
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

// Set up recording
var record_start = 1458043980;
var record_end = 1458044070;
var recording = {
    info: {
        Nppt: NParticlesperTarget,
        Naux: NAuxiliaryParticles,
        Ts: undefined,
        meas_prob: undefined,
        Tstart: record_start,
        Tend: record_end,
        obs: observation_model.params,
        meas: undefined,
        bounds: environment.bounds,
        beacons: environment.beacons,
        beacons_tx: environment.tx_only,
        filter_eps: alm.eps,
        filter_minpoints: alm.minPts,
        clusterMethod: alm.clusterMethod,
        fixedNumberOfTargets: alm.fixedNumberOfTargets
    },
    log: []
}; // Log format: [{timestamp, actors, clusters}]
var is_recording = true;

function updateAndDraw(deltaT) {
    update(deltaT);
    // Draw the current state
    draw.draw(state);
    drawAuxPhd(alm);
    // Show filter output
    document.getElementById('clock').innerHTML = new Date(replay.getCurrentTime() * 1000);
    // Record data
    var current_time = replay.getCurrentTime();
    if (is_recording && current_time >= record_start) {
        recording.log.push({
            timestamp: current_time,
            actors: clone(state.actors),
            clusters: clone(alm.clusters)
        });
    }
    if (is_recording && current_time >= record_end) {
        document.getElementById('filter').innerHTML = JSON.stringify(recording, null, '\t')
                .replace(/\n/g, '<br />')
                .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
        is_recording = false;
    }
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
