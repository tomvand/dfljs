var Beacon = require('./sim/beacon.js');
var Actor = require('./sim/actor.js');
var measure = require('./sim/measure.js');
var draw = require('./sim/draw.js');

var keyboard = require('./sim/keyboardcontroller.js');

var beacon1 = new Beacon(-5.0, 5.0, 'test1');
var beacon2 = new Beacon(5.0, 2.0, 'test2');
var beacons = [beacon1, beacon2];

var actor = new Actor(0.0, 0.0, 0.0);
var actors = [actor];

var state = {
    beacons: beacons,
    actors: actors
};

document.onkeydown = keyboard.onKeyPress;
keyboard.posess(actor);

draw.attach(document.getElementById('canvas'));
draw.setView(-10.0, -10.0, 20.0, 20.0);


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