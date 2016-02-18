var Beacon = require('./sim/beacon.js');
var Actor = require('./sim/actor.js');
var measure = require('./sim/measure.js');
var draw = require('./sim/draw.js');

var keyboard = require('./sim/keyboardcontroller.js');

var beacons = [
    new Beacon(-5.0, 2.0, 'CF:5E:84:EF:00:91'),
    new Beacon(-5.0, -3.0, 'EB:4D:30:14:6D:C1'),
    new Beacon(-2.0, -2.0, 'D5:A7:34:EC:72:90'),
    new Beacon(0.0, -2.0, 'EF:36:60:78:1F:1D'),
    new Beacon(2.0, -3.0, 'D7:D5:51:82:49:43'),
    new Beacon(2.0, 3.0, 'C0:82:3E:B9:F5:91')
];

var actor = new Actor(0.0, 0.0, 0.0);
var actors = [actor];

var state = {
    beacons: beacons,
    actors: actors
};

document.onkeydown = keyboard.onKeyPress;
keyboard.posess(actor);

draw.attach(document.getElementById('canvas'));
draw.setView(-8.0, -4.0, 12.0, 8.0);


setInterval(function () {
    // Update measurements
    state.measurements = [];
    beacons.forEach(function (receiver) {
        beacons.forEach(function (transmitter) {
            if (receiver !== transmitter) {
                state.measurements.push(measure.measure(receiver, transmitter, actors));
            }
        });
    });
    // Draw the current state
    draw.draw(state);
}, 100);