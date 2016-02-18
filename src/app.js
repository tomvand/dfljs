/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var Beacon = require('./sim/beacon.js');
var draw = require('./sim/draw.js');

var beacon1 = new Beacon(-5.0, 5.0, 'test1');
var beacon2 = new Beacon(5.0, 5.0, 'test2');
var state = {
    beacons: [beacon1, beacon2]
};

draw.attach(document.getElementById('canvas'));
draw.setView(-10.0, -10.0, 20.0, 20.0);
draw.draw(state);