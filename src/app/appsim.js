var AuxPhd = require('../auxphd/auxphd.js');
var draw = require('../draw/draw.js');
var drawAuxPhd = require('../draw/draw_auxphd.js');
var environment = require('./environment/office_full.js');

var Actor = require('../sim/actor.js');
var measure = require('../sim/measure.js');
var keyboard = require('../sim/keyboardcontroller.js');
var RandomController = require('../sim/randomcontroller.js');

var observation_model = require('../model/observation');

var clone = require('clone');

// Set up the tracking filter
var NMaxTargets = 5;
var NParticlesPerTarget = 100;
var NAuxiliaryParticles = 100;
var initInfo = environment.bounds;
var alm = new AuxPhd(NMaxTargets, NParticlesPerTarget, NAuxiliaryParticles, initInfo, environment.bounds);

// Set up actors
var actors = [
    new Actor(2.0, 5.0, 0.0),
    new Actor(6.0, 3.0, Math.PI)
];
var actor_controllers = [];
actors.forEach(function (actor) {
    actor_controllers.push(new RandomController(actor));
});


// Set up simulation state
var state = {
    beacons: environment.all_beacons,
    actors: actors,
    measurements: []
};

// Set up drawing
draw.attach(document.getElementById('canvas'));
draw.setView(-1, -13.4, 10.2, 14.4);

// Set up measurement updates
var meas_period = 0.25;
var meas_probability = 0.40;

// Set up recording
record_start = 0.0;
record_end = 10.0;
recording = {
    info: {
        Nppt: NParticlesPerTarget,
        Naux: NAuxiliaryParticles,
        Ts: meas_period,
        meas_prob: meas_probability,
        Tstart: record_start,
        Tend: record_end,
        obs: observation_model.params,
        meas: measure.params,
        bounds: environment.bounds,
        beacons: environment.beacons,
        beacons_tx: environment.tx_only,
        filter_eps: alm.eps,
        filter_minpoints: alm.minPts
    },
    log: []
}; // Log format: [{timestamp, actors, clusters}]
current_time = 0.0;

interval = setInterval(function () {
    // Update actors
    actor_controllers.forEach(function (controller) {
        controller.update(meas_period);
    });
    // Update measurements
    state.measurements = [];
    environment.beacons.forEach(function (receiver) {
        environment.all_beacons.forEach(function (transmitter) {
            if (Math.random() < meas_probability) {
                var measurement = measure.measure(receiver, transmitter, state.actors);
                state.measurements.push({
                    beacons: [measurement.receiver, measurement.transmitter],
                    delta_rssi: measurement.delta_rssi,
                    link_variance: measurement.link_variance
                });
            }
        });
    });
    // Update ALM filter
    alm.predict(meas_period);
    alm.observe(state.measurements);
    // Draw the current state
    draw.draw(state);
    drawAuxPhd(alm);
    // Record the current state and estimation
    document.getElementById('clock').innerHTML = current_time;
    if (current_time >= record_start) {
        recording.log.push({
            timestamp: current_time,
            actors: clone(actors),
            clusters: clone(alm.clusters)
        });
    }
    if (current_time >= record_end) {
        document.getElementById('filter').innerHTML = JSON.stringify(recording, null, '\t')
                .replace(/\n/g, '<br />')
                .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
        clearInterval(interval);
    }
    current_time += meas_period;
}, meas_period * 1000);
