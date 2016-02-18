var Beacon = require('./sim/beacon.js');
var Actor = require('./sim/actor.js');
var draw = require('./sim/draw.js');

var keyboard = require('./sim/keyboardcontroller.js');

var beacon1 = new Beacon(-5.0, 5.0, 'test1');
var beacon2 = new Beacon(5.0, 5.0, 'test2');

var actor = new Actor(0.0, 0.0, 0.0);

var state = {
    beacons: [beacon1, beacon2],
    actors: [actor]
};

document.onkeydown = keyboard.onKeyPress;
keyboard.posess(actor);

draw.attach(document.getElementById('canvas'));
draw.setView(-10.0, -10.0, 20.0, 20.0);


setInterval(function () {
    draw.draw(state);
}, 50);