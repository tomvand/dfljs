/**
 * Particle state model including prediction
 */

module.exports = State;

randn = require('../util/randn.js');

/**
 * Particle state
 * @param {object} initInfo - Initialization info object that contains bounds of the environment {xmin, xmax, ymin, ymax}
 * @param {bool} jumpstate - Set to true to use a jump-state markov model, otherwise a random walking model is used
 */
function State(initInfo, jumpstate) {
    this.initInfo = initInfo;
    this.initialize(initInfo);
    if (jumpstate) {
        this.predict = predict_jumpstate;
    } else {
        this.predict = predict_random;
    }
}

// Initialize particles randomly
State.prototype.initialize = function (initInfo) {
    this.x = initInfo.xmin + Math.random() * (initInfo.xmax - initInfo.xmin);
    this.y = initInfo.ymin + Math.random() * (initInfo.ymax - initInfo.ymin);
    this.direction = 2 * Math.PI * Math.random();
    this.speed = 0.0;
};

// Random walking time update
function predict_random(deltaT) {
    var sigma_v = 1.5;
    this.x += sigma_v * randn() * deltaT;
    this.y += sigma_v * randn() * deltaT;
}

// Jump-state markov model
function predict_jumpstate(deltaT) {
    var isStationary = Math.abs(this.speed) < 0.05;
    if (isStationary && Math.random() < 0.10) {
        this.direction = 2 * Math.PI * Math.random();
        this.speed = 0.5 + 0.7 * randn();
    } else if (!isStationary && Math.random() < 0.10) {
        this.speed = 0.0;
    }
    this.direction += 0.10 * Math.PI * randn();

    this.x += Math.cos(this.direction) * this.speed * deltaT;
    this.y += Math.sin(this.direction) * this.speed * deltaT;
}

/**
 * Get particle survival probability. This probability is set to 0 when the
 * state is out of bounds (as given in initInfo).
 * @returns {Number} Survival probability
 */
State.prototype.survive = function () {
    var isInBounds = this.x >= this.initInfo.xmin &&
            this.x <= this.initInfo.xmax &&
            this.y >= this.initInfo.ymin &&
            this.y <= this.initInfo.ymax;
    if (isInBounds) {
        return 0.95;
    } else {
        return 0.0;
    }
};

/**
 * Get particle birth rate
 * @returns {Number} - Birth rate
 */
State.prototype.birth = function () {
    return 0.2;
};