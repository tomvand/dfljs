module.exports = State;

randn = require('../util/randn.js');

function State(initInfo) {
    this.x = 0.0;
    this.y = 0.0;

    this.initialize(initInfo);
}

State.prototype.initialize = function (initInfo) {
    this.x = initInfo.xmin + Math.random() * (initInfo.xmax - initInfo.xmin);
    this.y = initInfo.ymin + Math.random() * (initInfo.ymax - initInfo.ymin);
};

State.prototype.predict = function (deltaT) {
    var vx = 3.0 * randn();
    var vy = 3.0 * randn();

    this.x += vx * deltaT;
    this.y += vy * deltaT;
};