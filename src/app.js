var Beacon = require('./sim/beacon.js');
var Actor = require('./sim/actor.js');
var measure = require('./sim/measure.js');
var draw = require('./sim/draw.js');

var Alm = require('./alm/alm.js');

var keyboard = require('./sim/keyboardcontroller.js');

var tx_only = [
    new Beacon(4.07, 0.0, 'Hans'),
    new Beacon(8.20 - 2.01, 0.0, 'C2:92:09:5F:04:78'),
    new Beacon(0.0, 2.85, 'Muting'),
    new Beacon(0.0, 5.50, 'Hallway 0'),
    new Beacon(0.0, 12.40 - 2.66, 'C0:82:3E:B9:F5:7B'),
    new Beacon(8.20, 12.40 - 6.90 + 3.50 + 2.36, 'Hallway 1'),
    new Beacon(8.20 - 2.449, 12.40 - 6.90 + 0.442, 'Peet')
];
var beacons = [
    new Beacon(3.05, 4.05, 'ACM0'),
    new Beacon(3.05, 2.20, 'ACM1'),
    new Beacon(3.36, 0.00, 'ACM2'),
    new Beacon(5.25, 0.60, 'ACM0'),
    new Beacon(5.25, 1.90, 'ACM1'),
    new Beacon(5.25, 3.95, 'ACM2')
];
var all_beacons = tx_only.concat(beacons);

var actor = new Actor(2.0, 5.0, 0.0);
var stationary = new Actor(6.0, 3.0, Math.PI);
var actors = [actor, stationary];

var Ntargets = 2;
var Nparticles = 50;
var initInfo = {
    xmin: 0.0,
    xmax: 8.20,
    ymin: 0.0,
    ymax: 12.40
};
var bounds = initInfo;

var alm = new Alm(Ntargets, Nparticles, initInfo, bounds);

var state = {
    beacons: all_beacons,
    actors: actors,
    measurements: []
};

document.onkeydown = keyboard.onKeyPress;
keyboard.posess(actor);

draw.attach(document.getElementById('canvas'));
draw.setView(-1.0, -13.40, 10.20, 14.40);


// Measurement loop
var meas_probability = 0.80;
var meas_period = 1000;
setInterval(function () {
    // Update measurements
    state.measurements = [];
    tx_only.forEach(function (transmitter) {
        beacons.forEach(function (receiver) {
            if (Math.random() <= meas_probability) {
                state.measurements.push(measure.measure(receiver, transmitter, actors));
            }
        });
    });
    beacons.forEach(function (receiver) {
        beacons.forEach(function (transmitter) {
            if (receiver !== transmitter) {
                if (Math.random() <= meas_probability) {
                    state.measurements.push(measure.measure(receiver, transmitter, actors));
                }
            }
        });
    });
    // Update ALM filter
    alm.observe(state.measurements);
}, meas_period);

// Time update loop
var time_period = 100;
setInterval(function () {
    // Draw the current state
    draw.draw(state);
    draw.drawAlm(alm);
    // Update the ALM filter
    alm.predict(time_period / 1000.0);
}, time_period);
