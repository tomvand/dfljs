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
}

function drawBeacon(beacon) {
    ctx.lineWidth = 0.01 * pxPerMeter;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, 0.2, 0, 2 * Math.PI);
    ctx.stroke();
}
