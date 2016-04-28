/**
 * Random Controller module
 *
 * Controller that will send random movements to actors.
 */

module.exports = RandomController;

var randn = require('../util/randn.js');

/**
 * Instantiate random controller and attach to actor.
 * @param {type} actor
 * @returns {nm$_randomcontroller.RandomController}
 */
function RandomController(actor) {
    var std_v0 = 0.0;
    this.vx = std_v0 * randn();
    this.vy = std_v0 * randn();
    this.sigma_v = Math.sqrt(0.05);

    this.controlled_actor = actor;
}

/**
 * Randomly move the actor.
 * @param {number} deltaT - Length of timestep
 * @param {object} bounds - Environment bounds, or null if the actor is allowed to leave the environment
 */
RandomController.prototype.update = function (deltaT, bounds) {
    var ax = this.sigma_v * randn();
    var ay = this.sigma_v * randn();
    this.controlled_actor.move_cart(deltaT * this.vx + (deltaT * deltaT / 2) * ax,
            deltaT * this.vy + (deltaT * deltaT / 2) * ay);
    this.vx += ax;
    this.vy += ay;

    if (bounds) {
        if ((this.vx < 0 && this.controlled_actor.x < bounds.xmin + 1.0) ||
                (this.vx > 0 && this.controlled_actor.x > bounds.xmax - 1.0)) {
            this.vx = -0.5 * this.vx;
        }
        if ((this.vy < 0 && this.controlled_actor.y < bounds.ymin + 1.0) ||
                (this.vy > 0 && this.controlled_actor.y > bounds.ymax - 1.0)) {
            this.vy = -0.5 * this.vy;
        }
    }
};