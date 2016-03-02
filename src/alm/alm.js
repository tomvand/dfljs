"use strict";

module.exports = AlmFilter;

var assert = require('assert');

var State = require('../model/state.js');
var observation = require('../model/observation.js');

var mathjs = require('mathjs');

var clone = require('clone');

function AlmFilter(Ntargets, Nparticles, initInfo, bounds) {
    this.Ntargets = Ntargets;
    this.Nparticles = Nparticles;
    this.initializeParticles(initInfo);

    this.bounds = bounds;

    this.clusters = [];
}

AlmFilter.prototype.initializeParticles = function (initInfo) {
    this.particles = [];
    for (var i = 0; i < this.Ntargets * this.Nparticles; i++) {
        this.particles.push({
            state: new State(initInfo),
            weight: 1 / (this.Ntargets * this.Nparticles),
            cluster: Math.floor(Math.random() * this.Ntargets)
        });
    }
};

AlmFilter.prototype.predict = function (deltaT) {
    this.particles.forEach(function (particle) {
        particle.state.predict(deltaT);
    });

    var bounds = this.bounds;
    this.particles.forEach(function (particle) {
        if (!inBounds(particle.state, bounds)) {
            particle.state.initialize(bounds);
            particle.weight = 0.0;
        }
    });
};

/**
 *
 * @param {object[]} observations
 *  @property {Beacon[]} beacons - beacon that describe this link
 *  @property {number} delta_rssi - change in RSSI on this link
 */
AlmFilter.prototype.observe = function (observations) {
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


        // Weight update
        var Sigma_z = mathjs.multiply(observation.params.sigma_z, mathjs.eye(observations.length));
        var zk = [];
        observations.forEach(function (obs) {
            zk.push(obs.delta_rssi);
        });
        zk = mathjs.transpose(mathjs.matrix([zk]));

        var Sigma = mathjs.add(Sigmahat_k, Sigma_z);
        var invSigma = mathjs.inv(Sigma);

        var pzk = approx_normpdf(zk, muhat_k, invSigma);
        this.particles.forEach(function (particle) {
            var Fk = pzk / approx_normpdf(zk, mathjs.add(gx(particle.state), muhat_k), invSigma);
            particle.weight /= Fk;
            assert(!isNaN(particle.weight));
        });
    }

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
    this.total_weight = total_weight; // For debug purposes

    this.particles.forEach(function (particle) {
        particle.weight /= total_weight;
    });
};

AlmFilter.prototype.resample = function () {
    // Calculate the effective sample size
    var Swk2 = 0.0;
    this.particles.forEach(function (particle) {
        Swk2 += particle.weight * particle.weight;
    });
    var Neff = 1.0 / Swk2;

    if (Neff > this.Ntargets * this.Nparticles / 2.0) {
        return;
    }

    var new_particles = [];
    var M = this.Ntargets * this.Nparticles;
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
        new_particles[m].weight = 1.0 / M;
    }
    this.particles = new_particles;
};

AlmFilter.prototype.cluster = function () {
    // Apply k-means clustering
    var clusters = [];
    var iterations = 100;
    do {
        var converged = true;
        // Initialize clusters
        clusters = [];
        for (var i = 0; i < this.Ntargets; i++) {
            var initial = Math.floor(Math.random() * this.particles.length);
            clusters[i] = {
                value: {
                    x: this.particles[initial].state.x,
                    y: this.particles[initial].state.y
                },
                weight: 0.0
            };
        }
        // Find the current means
        var Ntargets = this.Ntargets;
        this.particles.forEach(function (particle) {
            particle.cluster = (particle.cluster < Ntargets) ? particle.cluster : 0;
            var c = clusters[particle.cluster];
            c.value.x = (c.value.x * c.weight + particle.state.x * particle.weight) / (c.weight + particle.weight);
            c.value.y = (c.value.y * c.weight + particle.state.y * particle.weight) / (c.weight + particle.weight);
            c.weight = c.weight + particle.weight;
        });
        // Reassign
        this.particles.forEach(function (particle) {
            var shortest_dist2 = Number.POSITIVE_INFINITY;
            var nearest_cluster = 0;
            clusters.forEach(function (cluster, index) {
                var dx = particle.state.x - cluster.value.x;
                var dy = particle.state.y - cluster.value.y;
                var dist2 = dx * dx + dy * dy;
                if (dist2 < shortest_dist2) {
                    shortest_dist2 = dist2;
                    nearest_cluster = index;
                }
            });
            if (particle.cluster !== nearest_cluster) {
                particle.cluster = nearest_cluster;
                converged = false;
            }
        });
        iterations--;
    } while (!converged && iterations > 0);
    this.clusters = clusters;
};

function approx_normpdf(x, mu, invSigma) {
    var e = mathjs.subtract(x, mu);
    var p = Math.exp(-0.5 * mathjs.det(mathjs.multiply(mathjs.multiply(mathjs.transpose(e), invSigma), e)));
    assert.equal(typeof (p), 'number');
    assert(!isNaN(p));
    assert.ok(p);
    return p;
}

function inBounds(state, bounds) {
    return state.x >= bounds.xmin &&
            state.x <= bounds.xmax &&
            state.y >= bounds.ymin &&
            state.y <= bounds.ymax;
}

