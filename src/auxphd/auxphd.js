"use strict";

module.exports = AuxPhdFilter;

var assert = require('assert');

var State = require('../model/state.js');
var observation = require('../model/observation.js');

var mathjs = require('mathjs');
var randn = require('../util/randn.js');

var clone = require('clone');

function AuxPhdFilter(maxTargets, particlesPerTarget, auxiliaryParticles, initInfo, bounds) {
    this.Np = 0;
    this.Nmax = maxTargets;
    this.Nppt = particlesPerTarget;
    this.Jp = auxiliaryParticles;
    this.initialize(initInfo);

    this.gamma2_p = 0.9;
    this.gamma2_sigma = Math.sqrt(0.25);

    this.initInfo = initInfo;
    this.bounds = bounds;

    this.clusters = [];
}

AuxPhdFilter.prototype.initialize = function (initInfo) {
    // 1: Initialize particles
    this.particles = [];
    for (var i = 0; i < this.Jp; i++) {
        var state = new State(initInfo);
        var weight = 1 / this.Jp;
        this.particles[i] = {
            state: state,
            weight: weight
        };
    }
};

AuxPhdFilter.prototype.predict = function (deltaT) {
    // 3: Npk
    var Npk = this.Np * this.Nppt;
    // 5-7 update target particles
    for (var i = 0; i < Npk; i++) {
        this.particles[i].state.predict(deltaT);
        this.particles[i].weight *= this.particles[i].state.survive();
    }
};

AuxPhdFilter.prototype.observe = function (observations) {
    // 3: Npk
    var Npk = this.Np * this.Nppt;
    // 8-10: Auxiliary proposal
    for (var i = Npk; i < Npk + this.Jp; i++) {
        var state = new State(this.initInfo);
        var weight = state.birth() / this.Jp;
        this.particles[i] = {
            state: state,
            weight: weight
        };
    }
    // 11-14: Weight update
    this.updateWeights(observations);
    var xWeight = 0.0;
    this.particles.forEach(function (particle) {
        xWeight += particle.weight;
    });
    console.log('After auxiliary weight update: ' + xWeight);
    // 15-17: Sample new auxiliary particles
    var auxWeight = 0.0;
    for (var j = Npk; j < Npk + this.Jp; j++) {
        auxWeight += this.particles[j].weight;
    }
    var newStates = [];
    for (var i = Npk; i < Npk + this.Jp; i++) {
        if (Math.random() < this.gamma2_p) {
            // Sample from GM{x[Npk:Npk+Jp-1],w}
            var x = Math.random() * auxWeight;
            var j = Npk;
            var w = this.particles[j].weight;
            while (w < x) {
                j++;
                w += this.particles[j].weight;
            }
            newStates[i] = clone(this.particles[j].state);
            newStates[i].x += this.gamma2_sigma * randn();
            newStates[i].y += this.gamma2_sigma * randn();
        } else {
            newStates[i] = new State(this.initInfo);
        }
    }
    for (var i = Npk; i < Npk + this.Jp; i++) {
        this.particles[i].state = newStates[i];
        this.particles[i].weight = newStates[i].birth() / this.Jp;
    }
    // 20-23: Weight update
    this.updateWeights(observations);
    var xxWeight = 0.0;
    this.particles.forEach(function (particle) {
        xxWeight += particle.weight;
    });
    console.log('After final weight update: ' + xxWeight);
    // 24: Target number estimation
    this.Np = 2; // TODO
    // 25: Resample
    var newParticles = [];
    var totalWeight = 0.0;
    for (var i = 0; i < this.particles.length; i++) {
        totalWeight += this.particles[i].weight;
    }
    var x = Math.random() / (this.Np * this.Nppt);
    var w = this.particles[0].weight;
    var j = 0;
    for (var i = 0; i < this.Np * this.Nppt; i++) {
        var thres = (i / (this.Np * this.Nppt) + x) * totalWeight;
        while (w < thres) {
            j++;
            w += this.particles[j].weight;
        }
        newParticles[i] = {
            state: clone(this.particles[j].state),
            weight: 1 / this.Nppt
        };
    }
    this.particles = newParticles;
    // 26: Clustering
    // TODO
};


AuxPhdFilter.prototype.updateWeights = function (observations) {
    // 11, 20: Gaussian approximation of predicted measurement
    var Npk = this.Np * this.Nppt;
    var g = function (x) {
        var g = [];
        observations.forEach(function (obs) {
            g.push(observation.observe(obs.beacons[0], obs.beacons[1], x));
        });
        return mathjs.transpose(mathjs.matrix([g]));
    };
    var Nhat = 0.0;
    for (var j = 0; j < Npk + this.Jp; j++) {
        Nhat += this.particles[j].weight;
    }
    var mhat = 0;
    var Sigmahat = 0;
    for (j = 0; j < Npk + this.Jp; j++) {
        var pj = this.particles[j];
        var gxj = g(pj.state);
        mhat = mathjs.add(mhat,
                mathjs.multiply(pj.weight / Nhat, gxj));
        Sigmahat = mathjs.add(Sigmahat,
                mathjs.multiply(pj.weight / Nhat, mathjs.multiply(gxj, mathjs.transpose(gxj))));
    }
    // 12-14, 21-23: Weight update
    var zk = [];
    var Sigmaz_diag = [];
    for (var i = 0; i < observations.length; i++) {
        zk[i] = observations[i].delta_rssi;
        Sigmaz_diag[i] = observations[i].link_variance;
    }
    zk = mathjs.transpose(mathjs.matrix([zk]));
    var Sigmaz = mathjs.diag(Sigmaz_diag);
    var Sigmak = mathjs.multiply(Nhat, Sigmahat);
    var mk = mathjs.multiply(Nhat, mhat);
    var invSigma = mathjs.inv(mathjs.add(Sigmaz, Sigmak));
    var den = approx_normpdf(mathjs.subtract(zk, mk), invSigma); // Note: the time index in the algorithm (line 13, 22) does not correspond to the index in the derivation (4.29)!
    for (var i = 0; i < Npk + this.Jp; i++) {
        var gxi = g(this.particles[i].state);
        var num = approx_normpdf(mathjs.subtract(zk, mathjs.add(mk, gxi)), invSigma);
        this.particles[i].weight *= num / den;
        this.particles[i].weight = Math.min(1.0, this.particles[i].weight);
    }
};


function approx_normpdf(e, invSigma) {
    var p = Math.exp(-0.5 * mathjs.det(mathjs.multiply(mathjs.multiply(mathjs.transpose(e), invSigma), e)));
    return p;
}