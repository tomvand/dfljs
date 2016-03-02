var assert = require('assert');

var Alm = require('../src/alm/alm.js');

describe('ALM particle filter', function () {
    it('is a function (constructor)', function () {
        assert.equal(typeof (Alm), 'function');
    });

    var Ntargets = 1;
    var Nparticles = 100;

    var initInfo = {
        xmin: -8,
        xmax: 4,
        ymin: -4,
        ymax: 4
    };

    var bounds = {
        xmin: -10,
        xmax: 10,
        ymin: -10,
        ymax: 10
    };

    var deltaT = 0.1;

    describe('constructor', function () {
        it('initializes particles', function () {
            var alm = new Alm(Ntargets, Nparticles, initInfo, bounds);

            assert.equal(alm.particles.length, Ntargets * Nparticles);
            assert(alm.particles[0]);
            alm.particles.forEach(function (particle) {
                assert(particle.state.x >= initInfo.xmin);
                assert(particle.state.x <= initInfo.xmax);
                assert(particle.state.y >= initInfo.ymin);
                assert(particle.state.y <= initInfo.ymax);
            });
        });

        it('assigns particles to clusters', function () {
            var alm = new Alm(2, Nparticles, initInfo, bounds);

            var detect0 = false;
            var detect1 = false;
            alm.particles.forEach(function (particle) {
                detect0 = detect0 || particle.cluster === 0;
                detect1 = detect1 || particle.cluster === 1;
            });
            assert(detect0 && detect1);
        });
    });

    describe('.predict(deltaT)', function () {
        var alm = new Alm(Ntargets, Nparticles, initInfo, bounds);

        it('particles keep a valid state', function () {
            alm.particles.forEach(function (particle) {
                assert(!isNaN(particle.state.x));
                assert(!isNaN(particle.state.y));
            });
            alm.predict(deltaT);
            alm.particles.forEach(function (particle) {
                assert(!isNaN(particle.state.x));
                assert(!isNaN(particle.state.y));
            });
        });
    });

    describe('.observe(observations)', function () {
        var alm = new Alm(Ntargets, Nparticles, initInfo, bounds);

        var beacons = [
            {x: -4.0, y: 0.0},
            {x: 4.0, y: 0.0},
            {x: 0.0, y: 4.0},
            {x: 0.0, y: -4.0}
        ];
        var observations = [
            {beacons: [beacons[0], beacons[1]], delta_rssi: -5.0},
            {beacons: [beacons[0], beacons[2]], delta_rssi: 0.0}
        ];

        alm.predict(0.100);
        for (i = 0; i < 200; i++) {
            alm.observe(observations);
        }

        it('particles keep a valid weight', function () {
            alm.particles.forEach(function (particle) {
                assert(!isNaN(particle.weight));
            });
        });

        it('particle weight are normalized', function () {
            var total = 0.0;
            alm.particles.forEach(function (particle) {
                total += particle.weight;
            });
            assert(Math.abs(1.0 - total) < 0.00001);
        });

        it('resamples the same number of particles', function () {
            assert.equal(alm.particles.length, Ntargets * Nparticles);
        });
    });

    describe('.cluster()', function () {
        it('does not crash', function () {
            var alm = new Alm(2, Nparticles, initInfo, bounds);
            for (var i = 0; i < 100; i++) {
                alm.cluster();
            }
        });
        it('assigns particles to clusters', function () {
            var alm = new Alm(2, Nparticles, initInfo, bounds);
            alm.cluster();

            var detect = [0, 0];
            alm.particles.forEach(function (particle) {
                detect[particle.cluster]++;
            });
            assert(detect[0] > 0);
            assert(detect[1] > 0);
            console.log(detect[0]);
            console.log(detect[1]);
        });
        it('reports cluster means', function () {
            var alm = new Alm(2, Nparticles, initInfo, bounds);
            alm.cluster();

            assert.ok(alm.clusters[0].value.x);
            assert.ok(alm.clusters[0].value.y);
        });
    });
});