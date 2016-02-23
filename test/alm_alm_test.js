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

    var deltaT = 0.1;

    describe('constructor', function () {
        it('initializes particles', function () {
            var alm = new Alm(Ntargets, Nparticles, initInfo);

            assert.equal(alm.particles.length, Ntargets * Nparticles);
            assert(alm.particles[0]);
            alm.particles.forEach(function (particle) {
                assert(particle.state.x >= initInfo.xmin);
                assert(particle.state.x <= initInfo.xmax);
                assert(particle.state.y >= initInfo.ymin);
                assert(particle.state.y <= initInfo.ymax);
            });
        });
    });

    describe('.predict(deltaT)', function () {
        var alm = new Alm(Ntargets, Nparticles, initInfo);

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
        var alm = new Alm(Ntargets, Nparticles, initInfo);

        var beacons = [
            {x: -4.0, y: 0.0},
            {x: 4.0, y: 0.0},
            {x: 0.0, y: 4.0},
            {x: 0.0, y: -4.0}
        ];
        var observations = [
            {receiver: beacons[0], transmitter: beacons[1], delta_rssi: -5.0},
            {receiver: beacons[0], transmitter: beacons[2], delta_rssi: 0.0}
        ];

        alm.predict(0.100);
        for (i = 0; i < 2000; i++) {
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
});

describe('RUNNING TOTAL', function () {
    var total = 0.0;
    var array = [{value: 1.0}, {value: 2.0}, {value: 3.0}];
    array.forEach(function (element) {
        element.value /= element.value;
        total += element.value;
    });
    it('works', function () {
        assert.equal(total, 3.0);
    });
});