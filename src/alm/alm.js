module.exports = AlmFilter;

var State = require('../model/state.js');
var observation = require('../model/observation.js');

var mathjs = require('mathjs');
var normpdf = require('../util/normpdf.js');

function AlmFilter(Ntargets, Nparticles, initInfo) {
    this.Ntargets = Ntargets;
    this.Nparticles = Nparticles;
    this.initializeParticles(initInfo);
}

AlmFilter.prototype.initializeParticles = function (initInfo) {
    this.particles = [];
    for (var i = 0; i < this.Ntargets * this.Nparticles; i++) {
        this.particles.push({
            state: new State(initInfo),
            weight: 1 / (this.Ntargets * this.Nparticles)});
    }
};

AlmFilter.prototype.predict = function (deltaT) {
    this.particles.forEach(function (particle) {
        particle.state.predict(deltaT);
    });
};

/**
 *
 * @param {object[]} observations
 *  @property {Beacon} receiver - beacon that received this measurement
 *  @property {Beacon} transmitter - beacon that transmitted the advertisement
 *  @property {number} deltaRSSI - change in RSSI on this link
 */
AlmFilter.prototype.observe = function (observations) {
    /**
     *
     * @param {State} x - state considered for this observation
     * @returns {Array} - array of expected change in RSSI
     */
    var gx = function (x) {
        var g = [];
        observations.forEach(function (obs) {
            g.push(observation.observe(obs.receiver, obs.transmitter, x));
        });
        return mathjs.transpose(mathjs.matrix([g]));
    };

    var muhat_k = 0;
    this.particles.forEach(function (particle) {
        muhat_k = mathjs.add(muhat_k, mathjs.multiply(particle.weight, gx(particle.state)));
    });

    var Sigmahat_k = 0;
    this.particles.forEach(function (particle) {
        Sigmahat_k_j = mathjs.multiply(gx(particle.state), mathjs.transpose(gx(particle.state)));
        Sigmahat_k = mathjs.add(Sigmahat_k, mathjs.multiply(particle.weight, Sigmahat_k_j));
    });

    // Weight update
    var Sigma_z = mathjs.multiply(observation.params.sigma_z, mathjs.eye(observations.length));
    var zk = [];
    observations.forEach(function (obs) {
        zk.push(obs.deltaRSSI);
    });
    zk = mathjs.transpose(mathjs.matrix([zk]));

    var total = 0.0;
    this.particles.forEach(function (particle) {
        var Fk = normpdf(zk, muhat_k, mathjs.add(Sigmahat_k, Sigma_z)) /
                normpdf(zk, mathjs.add(gx(particle.state), muhat_k), mathjs.add(Sigmahat_k, Sigma_z));
        particle.weight = particle.weight / Fk;
        total += particle.weight;
    });
    this.particles.forEach(function (particle) {
        particle.weight = particle.weight / total;
    });
};

