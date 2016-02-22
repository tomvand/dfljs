module.exports = AlmFilter;

var State = require('../model/state.js');
var observation = require('../model/observation.js');

function AlmFilter(Ntargets, Nparticles, initInfo, beacons) {
    this.beacons = beacons;
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

AlmFilter.prototype.step = function (deltaT, observation) {
    this.proposal(deltaT);
    var dens = this.approximateDensity();
};

AlmFilter.prototype.proposal = function (deltaT) {
    this.particles.forEach(function (particle) {
        particle.state.predict(deltaT);
    });
};

AlmFilter.prototype.approximateDensity = function () {
    var beacons = this.beacons;
    mu_k_hat = [];
    Sigma_k_hat = [[]];
    this.particles.forEach(function (particle) {

        g = observation.observe(beacons, [particle.state]);
        for (i = 0; i < g.length; i++) {
            if (mu_k_hat[i] === undefined) {
                mu_k_hat[i] = 0.0;
            }
            mu_k_hat[i] += particle.weight * g[i].deltaRSSI;
        }

        for (i = 0; i < g.length; i++) {
            for (j = 0; j < g.length; j++) {
                if (Sigma_k_hat[i] === undefined) {
                    Sigma_k_hat[i] = [];
                }
                if (Sigma_k_hat[i][j] === undefined) {
                    Sigma_k_hat[i][j] = 0.0;
                }
                Sigma_k_hat[i][j] += particle.weight * g[i].deltaRSSI * g[j].deltaRSSI;
            }
        }
    });

    console.log(mu_k_hat);
    console.log(Sigma_k_hat);

    return {
        mu_k_hat: mu_k_hat,
        Sigma_k_hat: Sigma_k_hat
    };
};