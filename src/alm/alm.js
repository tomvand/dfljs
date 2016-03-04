"use strict";

/**
 * @module alm/alm
 * The ALM module exposes functions to create and use an Additive Likelihood
 * Moment filter.
 */

/** ALM filter constructor */
module.exports = AlmFilter;

var assert = require('assert');

var State = require('../model/state.js');
var observation = require('../model/observation.js');

var mathjs = require('mathjs');

var clone = require('clone');

/**
 * @typedef {Object} Bounds - A rectangle that should contain all particles
 * @property {number} xmin - Minimum value of x
 * @property {number} xmax - Maxmimum value of x
 * @property {number} ymin - Minimum value of y
 * @property {number} ymax - Maximum value of y
 */

/**
 * @typedef {Object} Cluster - A cluster of particles that represents a person
 *  @property {Object} value - Estimated position of the cluster
 *   @property {number} value.x - X position of the cluster
 *   @property {number} value.y - Y position of the cluster
 *  @property {number} weight - Summed weight of all particles that belong to this cluster
 */

/**
 * @typedef {Object} Particle - An object that represents a possible state of a person
 *  @property {module:model/state~State} state - State of the particle
 *  @property {number} weight - Representation of the likelihood of this state
 */

/**
 * Additive Likelihood Moment filter
 * @class
 * @param {number} Ntargets - Number of targets to track
 * @param {number} Nparticles - Number of particles to use per target
 * @param {module:model/state~initInfo} initInfo - Initialization info for particle states
 * @param {module:alm/alm~Bounds} bounds - Outer edges of the observed area
 * @property {Particle[]} particles - Particles used by this filter
 * @property {Cluster[]} clusters - Estimated clusters
 * @returns {alm/alm.AlmFilter}
 */
function AlmFilter(Ntargets, Nparticles, initInfo, bounds) {
    this._Ntargets = Ntargets;
    this._Nparticles = Nparticles;
    this._initializeParticles(initInfo);

    this._bounds = bounds;

    this.clusters = [];
}

/**
 * Initialize all particles using initInfo
 * @private
 * @param {module:model/state~initInfo} initInfo
 */
AlmFilter.prototype._initializeParticles = function (initInfo) {
    this.particles = [];
    for (var i = 0; i < this._Ntargets * this._Nparticles; i++) {
        this.particles.push({
            state: new State(initInfo),
            weight: 1 / (this._Ntargets * this._Nparticles),
            cluster: Math.floor(Math.random() * this._Ntargets)
        });
    }
};

/**
 * Predict the next state of all particles
 * @param {number} deltaT - Prediction timestep length
 */
AlmFilter.prototype.predict = function (deltaT) {
    this.particles.forEach(function (particle) {
        particle.state.predict(deltaT);
    });

    var bounds = this._bounds;
    this.particles.forEach(function (particle) {
        if (!_inBounds(particle.state, bounds)) {
            particle.state.initialize(bounds);
            particle.weight = 0.0;
        }
    });
};

/**
 * Update the particle weights according to the given observation, and resample
 * if necessary.
 * @param {module:device/filter~observation[]} observations - Current observations
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

        var Fk_num = _approx_normpdf(zk, muhat_k, invSigma);
        assert.ok(Fk_num, 'Fk_num is not ok :(');
        this.particles.forEach(function (particle) {
            var Fk_den = _approx_normpdf(zk, mathjs.add(gx(particle.state), muhat_k), invSigma);
            particle.weight = particle.weight * Fk_den / Fk_num;
            // TODO fix precision errors
            if (isNaN(particle.weight)) {
                console.log('particle weight is NaN');
                debugger;
            }
            assert(!isNaN(particle.weight), 'particle weight is NaN :( :( :(');
        });
    }

    // Normalize
    this._normalize();

    // Resample
    this._resample();
};

/**
 * Normalize the weights of all particles
 * @private
 */
AlmFilter.prototype._normalize = function () {
    var total_weight = 0.0;
    this.particles.forEach(function (particle) {
        total_weight += particle.weight;
    });
    this.total_weight = total_weight; // For debug purposes

    this.particles.forEach(function (particle) {
        particle.weight /= total_weight;
    });
};

/**
 * Resample particles according to their weights
 * @private
 */
AlmFilter.prototype._resample = function () {
    // Calculate the effective sample size
    var Swk2 = 0.0;
    this.particles.forEach(function (particle) {
        Swk2 += particle.weight * particle.weight;
    });
    var Neff = 1.0 / Swk2;

    if (Neff > this._Ntargets * this._Nparticles / 2.0) {
        return;
    }

    var new_particles = [];
    var M = this._Ntargets * this._Nparticles;
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

/**
 * Estimate cluster positions from the current particle states
 *
 * The estimated clusters are stored in this.clusters.
 */
AlmFilter.prototype.cluster = function () {
    // Apply k-means clustering
    var clusters = [];
    var iterations = 100;
    do {
        var converged = true;
        // Initialize clusters
        clusters = [];
        for (var i = 0; i < this._Ntargets; i++) {
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
        var Ntargets = this._Ntargets;
        this.particles.forEach(function (particle) {
            particle.cluster = (particle.cluster < Ntargets) ? particle.cluster : 0;
            var c = clusters[particle.cluster];
            if (c.weight + particle.weight > 0) {
                c.value.x = (c.value.x * c.weight + particle.state.x * particle.weight) / (c.weight + particle.weight);
                c.value.y = (c.value.y * c.weight + particle.state.y * particle.weight) / (c.weight + particle.weight);
                c.weight = c.weight + particle.weight;
            }
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

/**
 * Approximate normal probability density function.
 * Caution: this function returns a scaled value of the actual pdf!
 * @private
 * @param {module:mathjs~vector} x
 * @param {module:mathjs~vector} mu
 * @param {module:mathjs~matrix} invSigma
 * @returns {Number}
 */
function _approx_normpdf(x, mu, invSigma) {
    var e = mathjs.subtract(x, mu);
    var p = Math.exp(-0.5 * mathjs.det(mathjs.multiply(mathjs.multiply(mathjs.transpose(e), invSigma), e)));
    assert.equal(typeof (p), 'number', 'p is not a number');
    assert(!isNaN(p), 'p is NaN');
    if (p === Infinity) { /* global Infinity */
        console.log('p is inifnity');
        debugger;
    }
    return p;
    // TODO fix precision errors
}

/**
 * Check whether a state is within the given bounds
 * @private
 * @param {module:model/state~State} state
 * @param {Bounds} bounds
 * @returns {Boolean} True if the state is within the given bounds
 */
function _inBounds(state, bounds) {
    return state.x >= bounds.xmin &&
            state.x <= bounds.xmax &&
            state.y >= bounds.ymin &&
            state.y <= bounds.ymax;
}

