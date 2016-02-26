module.exports = State;

randn = require('../util/randn.js');

function State(initInfo) {
    this.x = 0.0;
    this.y = 0.0;

    this.initInfo = initInfo;
    this.initialize(initInfo);
}

State.prototype.initialize = function (initInfo) {
    this.x = initInfo.xmin + Math.random() * (initInfo.xmax - initInfo.xmin);
    this.y = initInfo.ymin + Math.random() * (initInfo.ymax - initInfo.ymin);
};

State.prototype.predict = function (deltaT) {
    var vx = 1.0 * randn();
    var vy = 1.0 * randn();

    this.x += vx * deltaT;
    this.y += vy * deltaT;

    if (this._outOfBounds()) {
        this.initialize(this.initInfo);
    }
};

State.prototype._outOfBounds = function () {
    return  this.x < this.initInfo.xmin ||
            this.x > this.initInfo.xmax ||
            this.y < this.initInfo.ymin ||
            this.y > this.initInfo.ymax;
};