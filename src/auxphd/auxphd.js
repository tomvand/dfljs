"use strict";

module.exports = AuxPhdFilter;

var State = require('../model/state.js');
var observation = require('../model/observation.js');

var mathjs = require('mathjs');
var randn = require('../util/randn.js');

var clone = require('clone');

/**
 * Auxiliary particle filter-based PHD filter
 *
 * This filter follows the algorithm described in Nannuru 2015 "Multitarget
 * multisensor tracking"
 * http://networks.ece.mcgill.ca/sites/default/files/PhD_Thesis_Santosh.pdf
 *
 * The filter can be updated by calling the predict() and observe() functions.
 *
 * @param {number} maxTargets - Max number of targets (for k-means/silhouette clustering)
 * @param {number} particlesPerTarget - Number of particles per target
 * @param {number} auxiliaryParticles - Number of auxiliary particles
 * @param {object} initInfo - Initialization info to pass to State constructor
 * @param {object} bounds - Bounds of the tracking filter {xmin, xmax, ymin, ymax}
 */
function AuxPhdFilter(maxTargets, particlesPerTarget, auxiliaryParticles, initInfo, bounds) {
    // Initialize particle filter
    this.Np = 0;
    this.Nmax = maxTargets;
    this.Nppt = particlesPerTarget;
    this.Jp = auxiliaryParticles;
    this.initialize(initInfo);

    // Auxiliary particle filter tuning
    this.gamma2_p = 0.9;
    this.gamma2_sigma = Math.sqrt(0.25);

    // Bounds
    this.initInfo = initInfo;
    this.bounds = bounds;

    // DBSCAN parameters
    this.eps = 0.6;
    this.minPts = 0.2 * particlesPerTarget;

    // Clusters and list of cluster assignments per particle
    this.clusters = [];
    this.clusterAssignments = [];

    /**
     * Clustering settings
     *
     * Adjust these values to set the clustering methods.
     * clusterMethod: 'dbscan' or 'kmeans'
     * fixedNumberOfTargets: number of targets, or null for variable/unknown
     */
    this.clusterMethod = 'dbscan'; // 'dbscan' or 'kmeans'
    this.fixedNumberOfTargets = null;
}

// Initialize particles
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

/**
 * Perform time prediction step of the particle filter
 * @param {number} deltaT - Length of timestep
 */
AuxPhdFilter.prototype.predict = function (deltaT) {
    // 3: Npk
    var Npk = this.Np * this.Nppt;
    // 5-7 update target particles
    for (var i = 0; i < Npk; i++) {
        this.particles[i].state.predict(deltaT);
        this.particles[i].weight *= this.particles[i].state.survive();
    }
};

/**
 * Perform observation step of the particle filter
 * @param {array} observations - Array of observations [{receiver, transmitter, delta_rssi, link_variance}, ...]
 */
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
    if (this.fixedNumberOfTargets) {
        this.Np = this.fixedNumberOfTargets;
    } else {
        var clusterInfo;
        if (this.clusterMethod === 'dbscan') {
            clusterInfo = this.DBSCAN();
        } else {
            clusterInfo = this.kmeans(this.best_silhouette());
        }
        this.Np = Math.min(this.Nmax, clusterInfo.clusters.length - 1);
    }
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
    if (this.fixedNumberOfTargets) {
        clusterInfo = this.kmeans(this.Np);
    } else {
        if (this.clusterMethod === 'dbscan') {
            clusterInfo = this.DBSCAN();
        } else {
            clusterInfo = this.kmeans(this.best_silhouette());
        }
    }
    this.clusters = clusterInfo.clusters;
    this.clusterAssignments = clusterInfo.assignments;
};

// Update particle weights
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

// Apply k-means clustering
AuxPhdFilter.prototype.kmeans = function (N) {
    // Prepare for clustering
    var clusters = [];
    var clusterAssignments = [];
    for (var i = 0; i < N + 1; i++) {
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
            for (var j = 1; j < N + 1; j++) {
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

// Apply k-means for 2 to Nmax targets. Select the clusters with the best
// average silhouette.
AuxPhdFilter.prototype.best_silhouette = function () {
    var bestSilhouette = -1.0;
    var bestn = 2;
    for (var n = 2; n < this.Nmax; n++) {
        var silhouette = 0;
        var clusterInfo = this.kmeans(n);
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


// DBSCAN clustering
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

// Calculate distance matrix for all particles
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

// Find particles within distance 'eps' of the particle at index 'index',
// using the previously computed distance matrix 'dist'
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

// Add position to cluster and keep track of weighted mean.
function addWeightedPosition(cluster, particle) {
    if (cluster.weight + particle.weight > 0) {
        cluster.x = (cluster.x * cluster.weight + particle.state.x * particle.weight) /
                (cluster.weight + particle.weight);
        cluster.y = (cluster.y * cluster.weight + particle.state.y * particle.weight) /
                (cluster.weight + particle.weight);
        cluster.weight += particle.weight;
    }
}

// Calculate distance between positions.
function distance(pos1, pos2) {
    var dx = pos1.x - pos2.x;
    var dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}


function approx_normpdf(e, invSigma) {
    var p = Math.exp(-0.5 * mathjs.det(mathjs.multiply(mathjs.multiply(mathjs.transpose(e), invSigma), e)));
    return p;
}