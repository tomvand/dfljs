(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./sim/actor.js":2,"./sim/beacon.js":3,"./sim/draw.js":4,"./sim/keyboardcontroller.js":5}],2:[function(require,module,exports){
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
 * Font for labels.
 * @constant
 * @type String
 */
var FONT_LABEL = '15px Arial';

/**
 * @description Rendering context that all drawing functions should draw to.
 * @type CanvasRenderingContext2D
 */
var ctx;

/**
 * @description Scale of the view (pixels/meter).
 * @type Number
 */
var world_coordinates;

/**
 * Create a coordinate system.
 * @constructor
 * @param {number} scale
 * @param {number} offsetX
 * @param {number} offsetY
 * @param {boolean} flipX - (optional) invert x axis.
 * @param {boolean} flipY - (optional) invert y axis.
 * @returns {CoordinateSystem}
 */
function CoordinateSystem(scale, offsetX, offsetY, flipX, flipY) {
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.flipX = Boolean(flipX);
    this.flipY = Boolean(flipY);
}

/**
 * Transforms a point in this coordinate system to absolute coordinates.
 * If one argument is given: applies scaling.
 * If two arguments are given: applies scaling and offset.
 * @function
 * @param {number} x - x in this coordinate system.
 * @param {number} y - y in this coordinate system.
 * @returns x in the global system or {x, y} in the global system.
 */
CoordinateSystem.prototype.transform = function (x, y) {
    if (arguments.length === 1) {
        return x * this.scale;
    } else {
        return {
            x: x * this.scale * (this.flipX ? -1 : 1) + this.offsetX,
            y: y * this.scale * (this.flipY ? -1 : 1) + this.offsetY
        };
    }
};

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

    scale = Math.min(canvas_width / width, canvas_height / height);
    world_coordinates = new CoordinateSystem(scale, -left * scale, -top * scale, false, true);
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
    var pos = world_coordinates.transform(beacon.x, beacon.y);
    var r = world_coordinates.transform(0.10);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.font = FONT_LABEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'green';
    ctx.fillText(beacon.address, pos.x, pos.y);
}

function drawActor(actor) {
    var pos = world_coordinates.transform(actor.x, actor.y);
    var r = world_coordinates.transform(0.30);

    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + r * Math.cos(actor.direction), pos.y - r * Math.sin(actor.direction));
    ctx.stroke();
}

},{}],5:[function(require,module,exports){
exports.onKeyPress = onKeyPress;
exports.posess = posess;

var controlled_actor;

var step_angle = 15 / 180.0 * Math.PI;
var step_distance = 0.5;

/**
 * Set the actor that is moved by the keyboard controller.
 * @function
 * @param {Actor} actor
 */
function posess(actor) {
    controlled_actor = actor;
}

/**
 * Handle keypresses by sending the corresponding movement to th eposessed actor.
 * @function
 * @param {type} event
 * @returns {undefined}
 */
function onKeyPress(event) {
    if (!controlled_actor) {
        return;
    }
    event = event || window.event;
    switch (event.keyCode) {
        case 38:
            // Up
            controlled_actor.move(0, step_distance);
            break;
        case 40:
            // Down
            controlled_actor.move(0, -step_distance);
            break;
        case 37:
            // Left
            controlled_actor.move(step_angle, 0);
            break;
        case 39:
            // Right
            controlled_actor.move(-step_angle, 0);
            break;
    }
}
},{}]},{},[1]);
