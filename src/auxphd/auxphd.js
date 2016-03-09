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

    this.eps = 0.3;
    this.minPts = 0.10 * particlesPerTarget;

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
        if (!(this.clusterAssignments[i] > 0)) {
            this.particles[i].weight *= 0.20;
        }
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
    var clusterInfo = this.DBSCAN();
    this.Np = Math.min(this.Nmax, clusterInfo.clusters.length - 1);
    // 25: Resample
    var newParticles = [];
    if (this.Np > 0) {
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
    }
    this.particles = newParticles;
    // 26: Clustering
    clusterInfo = this.DBSCAN();
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


AuxPhdFilter.prototype.DBSCAN = function () {
    // Pre-calculate a distance matrix
    var dist = this.distanceMatrix();
    // Keep track of assignments
    // undefined: not visited
    // 0: outlier
    // 1-n: cluster
    var assignments = [];
    var clusters = [undefined];
    var C = 0;

    for (var i = 0; i < this.particles.length; i++) {
        if (assignments[i] !== undefined) {
            continue;
        }
        assignments[i] = 0;
        var neighbourIndices = regionQuery(dist, i, this.eps);
        if (neighbourIndices.length >= this.minPts) {
            C++;
            clusters[C] = {
                x: 0,
                y: 0,
                weight: 0
            };
            // Expand cluster
            assignments[i] = C;
            addWeightedPosition(clusters[C], this.particles[i]);
            for (var j = 0; j < neighbourIndices.length; j++) {
                var prime = neighbourIndices[j];
                if (assignments[prime] === undefined) {
                    assignments[prime] = 0;
                    var primeNeighbourIndices = regionQuery(dist, prime, this.eps);
                    if (primeNeighbourIndices.length >= this.minPts) {
                        Array.prototype.push.apply(neighbourIndices, primeNeighbourIndices);
                    }
                }
                if (assignments[prime] === 0) {
                    assignments[prime] = C;
                    addWeightedPosition(clusters[C], this.particles[prime]);
                }
            }
        }
    }

    return {
        clusters: clusters,
        assignments: assignments
    };
};


AuxPhdFilter.prototype.distanceMatrix = function () {
    var dist = [];
    for (var i = 0; i < this.particles.length; i++) {
        dist[i] = [];
        for (var j = i + 1; j < this.particles.length; j++) {
            dist[i][j] = distance(this.particles[i].state, this.particles[j].state);
        }
    }
    return dist;
};

function regionQuery(dist, index, eps) {
    var result = [];
    for (var i = 0; i < index; i++) {
        if (dist[i][index] < eps) {
            result.push(i);
        }
    }
    for (var i = index + 1; i < dist[index].length; i++) {
        if (dist[index][i] < eps) {
            result.push(i);
        }
    }
    return result;
}

function addWeightedPosition(cluster, particle) {
    if (cluster.weight + particle.weight > 0) {
        cluster.x = (cluster.x * cluster.weight + particle.state.x * particle.weight) /
                (cluster.weight + particle.weight);
        cluster.y = (cluster.y * cluster.weight + particle.state.y * particle.weight) /
                (cluster.weight + particle.weight);
        cluster.weight += particle.weight;
    }
}


function distance(pos1, pos2) {
    var dx = pos1.x - pos2.x;
    var dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}


function approx_normpdf(e, invSigma) {
    var p = Math.exp(-0.5 * mathjs.det(mathjs.multiply(mathjs.multiply(mathjs.transpose(e), invSigma), e)));
    return p;
}