/**
 * Draw module.
 *
 * Draws the current state of the simulation.
 * @module
 */

exports.attach = attach;
exports.draw = draw;

/**
 * @description Rendering context that all drawing functions should draw to.
 * @type CanvasRenderingContext2D
 */
var ctx;

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
    state.beacons.forEach(drawBeacon);
}

function drawBeacon(beacon) {
    ctx.strokeStyle = 'stroke-width: 1px; color: black';
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, 0.5, 0, 2 * Math.PI);
    ctx.stroke();
}
