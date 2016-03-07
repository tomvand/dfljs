"use strict";

module.exports = AuxPhdFilter;

var assert = require('assert');

var State = require('../model/state.js');
var observation = require('../model/observation.js');

var mathjs = require('mathjs');

var clone = require('clone');

function AuxPhdFilter(Ntargets, Nparticles, initInfo, bounds) {
    this.Ntargets = Ntargets;
    this.Nparticles = Nparticles;
    this.initializeParticles(initInfo);

    this.bounds = bounds;

    this.clusters = [];
}

AuxPhdFilter.prototype.initializeParticles = function (initInfo) {
    this.particles = [];
    for (var i = 0; i < this.Ntargets * this.Nparticles; i++) {
        this.particles.push({
            state: new State(initInfo),
            weight: 1 / (this.Ntargets * this.Nparticles),
            cluster: Math.floor(Math.random() * this.Ntargets)
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
    // Auxiliary proposal
    //      Add NAux new particles according to gamma1 and pb
    //      Update the weights of all particles
    //      Overwrite the new particles with new proposals according to gamma2
    //      Normalize the weights of the new particles

    // Weight update and state estimation
    //      Update the weights of all particles
    this.updateWeights(observations);
    //      Estimate the number of targets
    //      Resample for the new number of targets
    this.normalize();
    this.resample();
    //      Cluster (if applicable) -> is separate method! keep that way or not?
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
    // Calculate the effective sample size
    var Swk2 = 0.0;
    this.particles.forEach(function (particle) {
        Swk2 += particle.weight * particle.weight;
    });
    var Neff = 1.0 / Swk2;

    if (Neff > this.Ntargets * this.Nparticles / 10.0) {
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

AuxPhdFilter.prototype.cluster = function () {
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


