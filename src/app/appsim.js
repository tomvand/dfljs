var Alm = require('../alm/alm.js');
var draw = require('../sim/draw.js');
var environment = require('./environment/office_full.js');

var Actor = require('../sim/actor.js');
var measure = require('../sim/measure.js');
var keyboard = require('../sim/keyboardcontroller.js');

// Set up the tracking filter
var Ntargets = 2;
var Nparticles = 500;
var initInfo = environment.bounds;
var alm = new Alm(Ntargets, Nparticles, initInfo, environment.bounds);

// Set up actors
var actor = new Actor(2.0, 5.0, 0.0);
var stationary = new Actor(6.0, 3.0, Math.PI);
var actors = [actor, stationary];

document.onkeydown = keyboard.onKeyPress;
keyboard.posess(actor);

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
var meas_period = 1.000;
var meas_probability = 0.40;
setInterval(function () {
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
    alm.observe(state.measurements);
    document.getElementById('filter').innerHTML = alm.total_weight;
    alm.cluster();
}, meas_period * 1000);

// Set up time updates
var time_period = 0.100;
setInterval(function () {
    // Draw the current state
    draw.draw(state);
    draw.drawAlm(alm);
    // Update the ALM filter
    alm.predict(time_period);
}, time_period * 1000);