/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var Beacon = require('./sim/beacon.js');
var draw = require('./sim/draw.js');

var beacon = new Beacon(0.0, 0.0, 'test');
var state = {
    beacons: [beacon]
};

draw.attach(document.getElementById('canvas'));
draw.draw(state);