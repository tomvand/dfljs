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
exports.drawAlm = drawAlm;

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
    state.measurements.forEach(drawMeasurement);
    state.beacons.forEach(drawBeacon);
    drawActors(state.actors);
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

function drawActors(actors) {
    actors.forEach(function (actor, index) {
        var pos = world_coordinates.transform(actor.x, actor.y);
        var r = world_coordinates.transform(0.30);
        ctx.fillStyle = 'hsl(' + index / actors.length * 360.0 + ',100%,50%)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + r * Math.cos(actor.direction), pos.y - r * Math.sin(actor.direction));
        ctx.stroke();
    });
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
    var rx = world_coordinates.transform(measurement.beacons[0].x, measurement.beacons[0].y);
    var tx = world_coordinates.transform(measurement.beacons[1].x, measurement.beacons[1].y);

    var x = 0.5 * (rx.x + tx.x);
    var y = 0.5 * (rx.y + tx.y);
    var angle = Math.atan2(rx.y - tx.y, rx.x - tx.x);
    var ma_a = distance(rx.x, rx.y, tx.x, tx.y) + 4 * world_coordinates.transform(measure.params.sigma_l);
    var mi_a = 4 * world_coordinates.transform(measure.params.sigma_l);

    var alpha = Math.max(0.0, Math.min(1.0, measurement.delta_rssi / (5 * measure.params.phi)));
    var red = measurement.isBlocked ? 255 : 0;
    ctx.fillStyle = 'rgba(' + red + ', 0, 0, ' + alpha + ')';
    ctx.beginPath();
    var pos = ellipse(0.0, x, y, angle, ma_a, mi_a);
    ctx.moveTo(pos.x, pos.y);
    for (phase = 0.0; phase < 2 * Math.PI; phase += 0.1) {
        pos = ellipse(phase, x, y, angle, ma_a, mi_a);
        ctx.lineTo(pos.x, pos.y);
    }
    var old_operation = ctx.globalCompositeOperation;
    ctx.fill();

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

function drawAlm(alm) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    var topleft = world_coordinates.transform(alm.bounds.xmin, alm.bounds.ymin);
    var bottomright = world_coordinates.transform(alm.bounds.xmax, alm.bounds.ymax);
    ctx.strokeRect(topleft.x, topleft.y, bottomright.x - topleft.x, bottomright.y - topleft.y);

    alm.particles.forEach(function (particle) {
        var size = 5.0 * alm.particles.length * particle.weight;
        var pos = world_coordinates.transform(particle.state.x, particle.state.y);
        ctx.fillStyle = 'hsl(' + particle.cluster / alm.Ntargets * 360.0 + ',50%,50%)';
        ctx.fillRect(pos.x - 0.5 * size, pos.y - 0.5 * size, size, size);
    });

    alm.clusters.forEach(function (cluster, index) {
        var pos = world_coordinates.transform(cluster.value.x, cluster.value.y);
        var r = world_coordinates.transform(0.30);
        ctx.strokeStyle = 'hsl(' + index / alm.clusters.length * 360.0 + ',100%,50%)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
        ctx.stroke();
    });
}
