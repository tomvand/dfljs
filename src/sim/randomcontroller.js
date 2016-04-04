module.exports = RandomController;

var randn = require('../util/randn.js');

function RandomController(actor) {
    var std_v0 = 0.0;
    this.vx = std_v0 * randn();
    this.vy = std_v0 * randn();
    this.sigma_v = Math.sqrt(0.35) / 10;

    this.controlled_actor = actor;
}

RandomController.prototype.update = function (deltaT) {
    var ax = this.sigma_v * randn();
    var ay = this.sigma_v * randn();
    this.controlled_actor.move_cart(deltaT * this.vx + (deltaT * deltaT / 2) * ax,
            deltaT * this.vy + (deltaT * deltaT / 2) * ay);
    this.vx += ax;
    this.vy += ay;
};