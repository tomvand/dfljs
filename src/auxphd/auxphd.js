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
    this.clusterAssignments = [];
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
    if (observations.length <= 0) {
        return;
    }
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
    // 24: Target number estimation
    this.Np = this.silhouette();
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
    var clusterInfo = this.cluster(this.Np);
    this.clusters = clusterInfo.clusters;
    this.clusterAssignments = clusterInfo.assignments;
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


AuxPhdFilter.prototype.cluster = function (N) {
    // Prepare for clustering
    var clusters = [];
    var clusterAssignments = [];
    for (var i = 0; i < N; i++) {
        if (this.clusters[i]) {
            clusters[i] = clone(this.clusters[i]);
            clusters[i].weight = 0;
        } else {
            var j = Math.floor(Math.random() * this.particles.length);
            clusters[i] = {
                x: this.particles[j].state.x,
                y: this.particles[j].state.y,
                weight: 0
            };
        }
    }
    // Iterate until converged or maximum number of steps reached
    var stepsRemaining = 100;
    var isConverged;
    do {
        isConverged = true;
        // Assignment step
        for (var i = 0; i < this.particles.length; i++) {
            var pi = this.particles[i];
            var minDist = Number.POSITIVE_INFINITY;
            var minCluster = 0;
            for (var j = 0; j < N; j++) {
                var dist = distance(pi.state, clusters[j]);
                if (dist < minDist) {
                    minDist = dist;
                    minCluster = j;
                }
            }
            if (clusterAssignments[i] !== minCluster) {
                isConverged = false;
            }
            clusterAssignments[i] = minCluster;
        }
        // Update step
        for (var i = 0; i < N; i++) {
            clusters[i].weight = 0.0;
        }
        for (var i = 0; i < this.particles.length; i++) {
            var pi = this.particles[i];
            var j = clusterAssignments[i];
            if (clusters[j].weight + pi.weight > 0) {
                clusters[j].x = (clusters[j].x * clusters[j].weight +
                        pi.state.x * pi.weight) / (clusters[j].weight + pi.weight);
                clusters[j].y = (clusters[j].y * clusters[j].weight +
                        pi.state.y * pi.weight) / (clusters[j].weight + pi.weight);
                clusters[j].weight += pi.weight;
            }
        }
        // Decrease max remaining steps
        stepsRemaining--;
    } while (!isConverged && stepsRemaining > 0);

    return {
        clusters: clusters,
        assignments: clusterAssignments
    };
};


AuxPhdFilter.prototype.silhouette = function () {
    var bestSilhouette = -1.0;
    var bestn = 2;
    for (var n = 2; n < this.Nmax; n++) {
        var silhouette = 0;
        var clusterInfo = this.cluster(n);
        for (var i = 0; i < this.particles.length; i++) {
            var pi = this.particles[i];
            var l1i = 0;
            var w1i = 0;
            for (var j = 0; j < this.particles.length; j++) {
                if (clusterInfo.assignments[j] !== clusterInfo.assignments[i] ||
                        i === j) {
                    continue;
                }
                var pj = this.particles[j];
                if (w1i + pi.weight * pj.weight > 0) {
                    l1i = (l1i * w1i + distance(pi.state, pj.state) * pi.weight * pj.weight) /
                            (w1i + pi.weight + pj.weight);
                    w1i += pi.weight * pj.weight;
                }
            }

            var l2i = 0;
            var w2i = 0;
            for (var j = 0; j < n; j++) {
                if (j === clusterInfo.assignments[i]) {
                    continue;
                }
                if (w2i + pi.weight * clusterInfo.clusters[j].weight > 0) {
                    l2i = (l2i * w2i + distance(pi.state, clusterInfo.clusters[j]) * pi.weight * clusterInfo.clusters[j].weight) /
                            (w2i + pi.weight * clusterInfo.clusters[j].weight);
                    w2i += pi.weight * clusterInfo.clusters[j].weight;
                }
            }

            silhouette += (l2i - l1i) / Math.max(l1i, l2i) / this.particles.length;
        }

        if (silhouette > bestSilhouette) {
            bestSilhouette = silhouette;
            bestn = n;
        }
    }

    return bestn;
};


function distance(pos1, pos2) {
    var dx = pos1.x - pos2.x;
    var dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}


function approx_normpdf(e, invSigma) {
    var p = Math.exp(-0.5 * mathjs.det(mathjs.multiply(mathjs.multiply(mathjs.transpose(e), invSigma), e)));
    return p;
}