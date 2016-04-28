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

/**
 * Moves the actor by the given change in x- and y-coordinates.
 * @param {type} dx
 * @param {type} dy
 */
Actor.prototype.move_cart = function (dx, dy) {
    this.x += dx;
    this.y += dy;
    this.direction = Math.atan2(dy, dx);
};