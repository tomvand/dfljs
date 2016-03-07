"use strict";

module.exports = AuxPhdFilter;

var assert = require('assert');

var State = require('../model/state.js');
var observation = require('../model/observation.js');

var mathjs = require('mathjs');
var randn = require('../util/randn.js');

var clone = require('clone');

function AuxPhdFilter(maxTargets, particlesPerTarget, auxiliaryParticles, initInfo, bounds) {
    this.Nmax = maxTargets;
    this.Nppt = particlesPerTarget;
    this.Jp = auxiliaryParticles;
    this.initializeParticles(initInfo);

    this.gamma2_p = 0.9;
    this.gamma2_sigma = Math.sqrt(0.25);

    this.initInfo = initInfo;
    this.bounds = bounds;

    this.clusters = [];
}

AuxPhdFilter.prototype.initializeParticles = function (initInfo) {
    this.particles = [];
    for (var i = 0; i < this.Nmax * this.Nppt + this.Jp; i++) {
        this.particles.push({
            state: new State(initInfo),
            weight: 1 / (this.Nmax * this.Nppt + this.Jp)
        });
    }
};

AuxPhdFilter.prototype.predict = function (deltaT) {
    this.particles.forEach(function (particle) {
        particle.state.predict(deltaT);
        particle.weight *= particle.state.survive();
    });
};

/**
 *
 * @param {object[]} observations
 *  @property {Beacon[]} beacons - beacon that describe this link
 *  @property {number} delta_rssi - change in RSSI on this link
 */
AuxPhdFilter.prototype.observe = function (observations) {
    // Time update is a separate function
    // Auxiliary proposal
    //      Add NAux new particles according to gamma1 and pb
    var Npk = this.Nmax * this.Nppt;
    for (var i = Npk; i < Npk + this.Jp; i++) {
        // Assume gamma1 uniform over the entire area
        var state = new State(this.initInfo);
        this.particles[i] = {
            state: state,
            weight: state.birth() / this.Jp
        };
    }
    //      Update the weights of all particles
    this.updateWeights(observations);
    //      Overwrite the new particles with new proposals according to gamma2
    var auxiliaryWeight = 0.0;
    var oldAuxiliaryParticles = [];
    for (var i = Npk; i < Npk + this.Jp; i++) {
        auxiliaryWeight += this.particles[i].weight;
        oldAuxiliaryParticles[i] = this.particles[i];
    }

    for (var i = Npk; i < Npk + this.Jp; i++) {
        // Assume gamma2 as described in thesis_santosh.pdf
        if (Math.random() < this.gamma2_p) {
            // Draw an auxiliary particle proportional to its weight
            var U = Math.random() * auxiliaryWeight;
            var j = Npk;
            var c = oldAuxiliaryParticles[j].weight;
            while (U > c) {
                j++;
                c += oldAuxiliaryParticles.weight;
            }
            // Clone and randomly offset by gamma2_sigma
            var newState = clone(oldAuxiliaryParticles[j].state);
            newState.x += this.gamma2_sigma * randn();
            newState.y += this.gamma2_sigma * randn();
            this.particles[i] = {
                state: newState,
                weight: newState.birth() / this.Jp
            };
        } else {
            // Draw from birth intensity function (uniform!)
            var state = new State(this.initInfo);
            this.particles[i] = {
                state: state,
                weight: state.birth() / this.Jp
            };
        }
    }
    //      Normalize the weights of the new particles (why??)
    // Skipped because weight is already pb!

    // Weight update and state estimation
    //      Update the weights of all particles
    this.updateWeights(observations);
    //      Resample
    this.resample();
};

AuxPhdFilter.prototype.updateWeights = function (observations) {
    if (observations.length > 0) {
        var gx = function (x) {
            var g = [];
            observations.forEach(function (obs) {
                g.push(observation.observe(obs.beacons[0], obs.beacons[1], x));
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

        // Measurement variance Sigma_z
        var diag = [];
        observations.forEach(function (observation) {
            assert.ok(observation.link_variance, 'link variance is not ok');
            assert(!isNaN(observation.link_variance), 'link variance is NaN');
            diag.push(observation.link_variance);
        });
        var Sigma_z = mathjs.diag(diag);


        // Weight update
        var zk = [];
        observations.forEach(function (obs) {
            zk.push(obs.delta_rssi);
        });
        zk = mathjs.transpose(mathjs.matrix([zk]));

        var Sigma = mathjs.add(Sigmahat_k, Sigma_z);
        var invSigma = mathjs.inv(Sigma);

        var Fk_num = approx_normpdf(zk, muhat_k, invSigma);
        if (!Fk_num) {
            console.log('! Fk_num');
            debugger;
        }
        assert.ok(Fk_num, 'Fk_num is not ok :(');
        this.particles.forEach(function (particle) {
            var Fk_den = approx_normpdf(zk, mathjs.add(gx(particle.state), muhat_k), invSigma);
            particle.weight = particle.weight * Fk_den / Fk_num;
            // TODO fix precision errors
            if (isNaN(particle.weight)) {
                console.log('particle weight is NaN');
                debugger;
            }
            assert(!isNaN(particle.weight), 'particle weight is NaN :( :( :(');
        });
    }
};

AuxPhdFilter.prototype.normalize = function () {
    var total_weight = 0.0;
    this.particles.forEach(function (particle) {
        total_weight += particle.weight;
    });
    this.total_weight = total_weight; // For debug purposes

    this.particles.forEach(function (particle) {
        particle.weight /= total_weight;
    });
};

AuxPhdFilter.prototype.resample = function () {
    // Normalize
    this.normalize();

    // Calculate the effective sample size
    var Swk2 = 0.0;
    this.particles.forEach(function (particle) {
        Swk2 += particle.weight * particle.weight;
    });
    var Neff = 1.0 / Swk2;

    if (Neff > this.Nmax * this.Nppt / 10.0) {
        return;
    }

    var new_particles = [];
    var M = this.Nmax * this.Nppt;
    var r = Math.random() / M;
    var c = this.particles[0].weight;
    var i = 0;

    for (var m = 0; m < M; m++) {
        var U = r + m / M;
        while (U > c) {
            i++;
            c += this.particles[i].weight;
        }
        new_particles[m] = clone(this.particles[i]);
        new_particles[m].weight = 1 / M;
    }
    this.particles = new_particles;
};

function approx_normpdf(x, mu, invSigma) {
    var e = mathjs.subtract(x, mu);
    var p = Math.exp(-0.5 * mathjs.det(mathjs.multiply(mathjs.multiply(mathjs.transpose(e), invSigma), e)));
    assert.equal(typeof (p), 'number', 'p is not a number');
    assert(!isNaN(p), 'p is NaN');
    if (p === Infinity) {
        console.log('p is inifnity');
        debugger;
    }
    return p;
    // TODO fix precision errors
}


