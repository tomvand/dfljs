(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var Beacon = require('./sim/beacon.js');
var Actor = require('./sim/actor.js');
var draw = require('./sim/draw.js');

var beacon1 = new Beacon(-5.0, 5.0, 'test1');
var beacon2 = new Beacon(5.0, 5.0, 'test2');

var actor = new Actor(0.0, 0.0, 0.0);

var state = {
    beacons: [beacon1, beacon2],
    actors: [actor]
};

draw.attach(document.getElementById('canvas'));
draw.setView(-10.0, -10.0, 20.0, 20.0);
draw.draw(state);
},{"./sim/actor.js":2,"./sim/beacon.js":3,"./sim/draw.js":4}],2:[function(require,module,exports){
module.exports = Actor;

/**
 * Create an Actor.
 * @constructor
 * @param {number} x - x position of the actor.
 * @param {number} y - y position of the actor.
 * @param {number} direction - direction of the actor.
 * @returns {Actor}
 */
function Actor(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
}

/**
 * Turns the actor by the given angle and then moves the given distance.
 * @param {number} angle
 * @param {number} distance
 */
Actor.prototype.move = function (angle, distance) {
    this.direction += angle;
    this.x += distance * Math.cos(this.direction);
    this.y += distance * Math.sin(this.direction);
};
},{}],3:[function(require,module,exports){
module.exports = Beacon;

/**
 * @constructor
 * @param {number} x - x position of the beacon.
 * @param {number} y - y position of the beacon.
 * @param {string} address - identifier of the beacon (e.g. 'CF:5E:84:EF:00:91').
 * @returns {Beacon}
 */
function Beacon(x, y, address) {
    this.x = x;
    this.y = y;
    this.address = address;
}
},{}],4:[function(require,module,exports){
/**
 * Draw module.
 *
 * Draws the current state of the simulation.
 * @module
 */

exports.attach = attach;
exports.setView = setView;
exports.draw = draw;

/**
 * @description Rendering context that all drawing functions should draw to.
 * @type CanvasRenderingContext2D
 */
var ctx;

/**
 * @description Scale of the view (pixels/meter).
 * @type Number
 */
var pxPerMeter = 1.0;

/**
 * Font for labels.
 * @constant
 * @type String
 */
var FONT_LABEL = '5px Arial';

/**
 * Open a rendering context on the specified canvas. All subsequent draw calls
 * will be performed in this context.
 * @function
 * @param {Canvas} canvas - canvas to draw to.
 */
function attach(canvas) {
    ctx = canvas.getContext('2d');
}

/**
 * Set the viewport of the simulation
 * @function
 * @param {number} left - left position of the viewport.
 * @param {number} top - top position of the viewport.
 * @param {number} width - width of the viewport.
 * @param {number} height - height of the viewport.
 */
function setView(left, top, width, height) {
    var canvas_width = ctx.canvas.clientWidth;
    var canvas_height = ctx.canvas.clientHeight;

    pxPerMeter = Math.min(canvas_width / width, canvas_height / height);

    ctx.setTransform(pxPerMeter, 0, 0, -pxPerMeter, -left * pxPerMeter, -top * pxPerMeter);
}

/**
 * A collection of objects in the simulation, that fully describes the current
 * state.
 * @typedef {Object} State
 * @property {Beacon[]} beacons - All beacons in the simulation.
 * @property {Actor[]} actors - All actors in the simulation.
 */

/**
 * Draw the current state of the simulation to the canvas.
 * @see attach
 * @function
 * @param {State} state
 * @returns {undefined}
 */
function draw(state) {
    // Clear the canvas before drawing the current state.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
    ctx.restore();

    // Draw the current state of the simulation.
    state.beacons.forEach(drawBeacon);
    state.actors.forEach(drawActor);
}

function drawBeacon(beacon) {
    ctx.lineWidth = 0.01 * pxPerMeter;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, 0.1, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawActor(actor) {
    var r = 0.3;

    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, r, 0, 2 * Math.PI);
    ctx.fill();

    ctx.lineWidth = 0.01 * pxPerMeter;
    ctx.beginPath();
    ctx.moveTo(actor.x, actor.y);
    ctx.lineTo(actor.x + r * Math.cos(actor.direction), actor.y + r * Math.sin(actor.direction));
    ctx.stroke();
}

},{}]},{},[1]);
