module.exports = State;

randn = require('../util/randn.js');

function State(initInfo) {
    this.initInfo = initInfo;
    this.initialize(initInfo);
}

State.prototype.initialize = function (initInfo) {
    this.x = initInfo.xmin + Math.random() * (initInfo.xmax - initInfo.xmin);
    this.y = initInfo.ymin + Math.random() * (initInfo.ymax - initInfo.ymin);
    this.direction = 2 * Math.PI * Math.random();
    this.speed = 0.0;
};

State.prototype.predict = function (deltaT) {
    var isStationary = Math.abs(this.speed) < 0.05;
    if (isStationary && Math.random() < 0.01) {
        this.direction = 2 * Math.PI * Math.random();
        this.speed = 0.5 + 0.7 * randn();
    } else if (!isStationary && Math.random() < 0.05) {
        this.speed = 0.0;
    }
    this.direction += 0.10 * Math.PI * randn();

    this.x += Math.cos(this.direction) * this.speed * deltaT;
    this.y += Math.sin(this.direction) * this.speed * deltaT;
};

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

State.prototype.birth = function () {
    return 0.05;
};