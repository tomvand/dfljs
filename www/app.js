(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./sim/actor.js":2,"./sim/beacon.js":3,"./sim/draw.js":4,"./sim/keyboardcontroller.js":5,"./sim/measure.js":6}],2:[function(require,module,exports){
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

var measure = require('./measure.js');

exports.attach = attach;
exports.setView = setView;
exports.draw = draw;

/**
 * Font for labels.
 * @constant
 * @type String
 */
var FONT_LABEL = '10px Arial';

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
 * @property {Measurement[]} measurements - All current measurements.
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
    state.measurements.forEach(drawMeasurement);
}

function drawBeacon(beacon) {
    var pos = world_coordinates.transform(beacon.x, beacon.y);
    var r = world_coordinates.transform(0.10);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = '#000000';
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
    ctx.fillStyle = '#0000FF';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + r * Math.cos(actor.direction), pos.y - r * Math.sin(actor.direction));
    ctx.stroke();
}

function ellipse(phase, x, y, angle, major_axis, minor_axis) {
    var x_local = 0.5 * major_axis * Math.cos(phase);
    var y_local = 0.5 * minor_axis * Math.sin(phase);
    return {
        x: x + x_local * Math.cos(angle) - y_local * Math.sin(angle),
        y: y + x_local * Math.sin(angle) + y_local * Math.cos(angle)
    };
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function drawMeasurement(measurement) {
    var rx = world_coordinates.transform(measurement.receiver.x, measurement.receiver.y);
    var tx = world_coordinates.transform(measurement.transmitter.x, measurement.transmitter.y);

    var x = 0.5 * (rx.x + tx.x);
    var y = 0.5 * (rx.y + tx.y);
    var angle = Math.atan2(rx.y - tx.y, rx.x - tx.x);
    var ma_a = distance(rx.x, rx.y, tx.x, tx.y) + 4 * world_coordinates.transform(measure.params.sigma_l);
    var mi_a = 4 * world_coordinates.transform(measure.params.sigma_l);

    var alpha = Math.max(0.0, Math.min(1.0, measurement.delta_rssi / measure.params.phi));
    ctx.fillStyle = 'rgba(255, 0, 0, ' + alpha + ')';
    ctx.beginPath();
    var pos = ellipse(0.0, x, y, angle, ma_a, mi_a);
    ctx.moveTo(pos.x, pos.y);
    for (phase = 0.0; phase < 2 * Math.PI; phase += 0.1) {
        pos = ellipse(phase, x, y, angle, ma_a, mi_a);
        ctx.lineTo(pos.x, pos.y);
    }
    var old_operation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'destination-over'; // Draw behind everything else
    ctx.fill();
    ctx.globalCompositeOperation = old_operation;

    if (measurement.delta_rssi < -1.0) {
        ctx.font = FONT_LABEL;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.fillText(measurement.delta_rssi.toFixed(2) + ' dB',
                0.75 * rx.x + 0.25 * tx.x,
                0.75 * rx.y + 0.25 * tx.y);
    }

}

},{"./measure.js":6}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
exports.measure = measure;

/**
 * @property {number} phi Attenuation in dB.
 * @property {number} sigma_l Beam width.
 */
var params = {
    phi: -5.0,
    sigma_l: 0.2
};
exports.params = params;

/**
 * @typedef Measurement
 * @property {Beacon} receiver - beacon from which the measurement is performed
 * @property {Beacon} transmitter - beacon that is observed
 * @property {number} delta_rssi - change in rssi in dB
 */

/**
 *
 * @param {Beacon} receiver - beacon from which the measurement is performed
 * @param {Beacon} transmitter - beacon that is observed
 * @param {Actor[]} actors - actors that can interfere with the signal
 * @returns {Measurement} - observed change in rssi
 */
function measure(receiver, transmitter, actors) {
    // Exponential model as described in Nannuro et al. 2013.
    delta_rssi = 0.0;
    actors.forEach(function (actor) {
        delta_rssi += params.phi * Math.exp(-lambda(receiver, transmitter, actor) / params.sigma_l);
    });
    return {
        receiver: receiver,
        transmitter: transmitter,
        delta_rssi: delta_rssi
    };
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function lambda(from, to, actor) {
    return distance(from.x, from.y, actor.x, actor.y) + distance(to.x, to.y, actor.x, actor.y) - distance(from.x, from.y, to.x, to.y);
}
},{}]},{},[1]);
