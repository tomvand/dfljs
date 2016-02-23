"use strict";

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
            weight: 1 / (this.Ntargets * this.Nparticles)
        });
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
 *  @property {number} delta_rssi - change in RSSI on this link
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
    var Sigmahat_k = 0;
    this.particles.forEach(function (particle) {
        var gxj = gx(particle.state);
        muhat_k = mathjs.add(muhat_k, mathjs.multiply(particle.weight, gxj));
        var Sigmahat_k_j = mathjs.multiply(gxj, mathjs.transpose(gxj));
        Sigmahat_k = mathjs.add(Sigmahat_k, mathjs.multiply(particle.weight, Sigmahat_k_j));
    });


    // Weight update
    var Sigma_z = mathjs.multiply(observation.params.sigma_z, mathjs.eye(observations.length));
    var zk = [];
    observations.forEach(function (obs) {
        zk.push(obs.delta_rssi);
    });
    zk = mathjs.transpose(mathjs.matrix([zk]));

    var pzk = normpdf(zk, muhat_k, mathjs.add(Sigmahat_k, Sigma_z));
    this.particles.forEach(function (particle) {
        var Fk = pzk / normpdf(zk, mathjs.add(gx(particle.state), muhat_k), mathjs.add(Sigmahat_k, Sigma_z));
        particle.weight /= Fk;
    });

    // Normalize
    this.normalize();

    // Resample
    this.resample();
};

AlmFilter.prototype.normalize = function () {
    var total_weight = 0.0;
    this.particles.forEach(function (particle) {
        total_weight += particle.weight;
    });
    console.log('total weight: ' + total_weight);

    var total_normalized_weight = 0.0;
    this.particles.forEach(function (particle) {
        particle.weight /= total_weight;
        total_normalized_weight += particle.weight;
    });
    console.log('total weight after normalization: ' + total_normalized_weight);

    var total2 = 0.0;
    this.particles.forEach(function (particle) {
        total2 += particle.weight;
    });
    console.log('total weight after normalization: ' + total2);
};

AlmFilter.prototype.resample = function () {
    var new_particles = [];
    var M = this.Ntargets * this.Nparticles;
    var r = Math.random() / M;
    var c = this.particles[0].weight;
    var i = 0;

    var total = 0.0;
    this.particles.forEach(function (particle) {
        total += particle.weight;
    });
    console.log('total at start of resampling: ' + total);

    for (var m = 0; m < M; m++) {
        var U = r + m / M;
        while (U > c) {
            console.log('m=' + m + ' U=' + U + ' M=' + M + ' r=' + r + ' c=' + c + ' i=' + i)
            i++;
            c += this.particles[i].weight;
        }
        new_particles.push({
            state: this.particles[i].state,
            weight: 1.0 / M
        });
    }
    this.particles = new_particles;
};

