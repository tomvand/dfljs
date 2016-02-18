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
