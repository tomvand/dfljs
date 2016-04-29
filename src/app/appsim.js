/**
 * AppSim.
 *
 * This is the main function to run simulations with the particle filter in a
 * browser.
 */

// Particle filter
var AuxPhd = require('../auxphd/auxphd.js');

// Simulation environment
var environment = require('./environment/first_floor.js');
var measure = require('../sim/measure.js');
var Actor = require('../sim/actor.js');

// User interface
var draw = require('../draw/draw.js');
var drawAuxPhd = require('../draw/draw_auxphd.js');
var keyboard = require('../sim/keyboardcontroller.js');




// Set up the tracking filter
var NMaxTargets = 5;
var NParticlesPerTarget = 100;
var NAuxiliaryParticles = 100;
var initInfo = environment.bounds;
var alm = new AuxPhd(NMaxTargets, NParticlesPerTarget, NAuxiliaryParticles, initInfo, environment.bounds);



// Set up actors
var actors = [
    new Actor(
            environment.bounds.xmin + Math.random() * (environment.bounds.xmax - environment.bounds.xmin),
            environment.bounds.ymin + Math.random() * (environment.bounds.ymax - environment.bounds.ymin),
            Math.random() * 2 * Math.PI)
];


// Set up keyboard controller
document.onkeydown = keyboard.onKeyPress;
keyboard.posess(actors[0]);


// Set up simulation state
var state = {
    beacons: environment.all_beacons,
    actors: actors,
    measurements: []
};


// Set up drawing
draw.attach(document.getElementById('canvas'));
draw.setView(environment.bounds.xmin - 1.0,
        -environment.bounds.ymax - 1.0,
        environment.bounds.xmax - environment.bounds.xmin + 2.0,
        environment.bounds.ymax - environment.bounds.ymin + 2.0);


// Set up measurement updates
var meas_period = 0.25;
var meas_probability = 0.40;


// Start simulation
interval = setInterval(function () {
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
}, meas_period * 1000);
