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

    var beacons = [
        {x: -5.0, y: 0.0},
        {x: 5.0, y: 0.0}
    ];

    var deltaT = 0.1;

    describe('constructor', function () {
        it('initializes particles', function () {
            var alm = new Alm(Ntargets, Nparticles, initInfo, beacons);

            assert.equal(alm.particles.length, Ntargets * Nparticles);
            alm.particles.forEach(function (particle) {
                assert(particle.state.x >= initInfo.xmin);
                assert(particle.state.x <= initInfo.xmax);
                assert(particle.state.y >= initInfo.ymin);
                assert(particle.state.y <= initInfo.ymax);
            });
        });
    });

    describe('step()', function () {
        var moreBeacons = [
            {x: -5.0, y: -5.0},
            {x: 5.0, y: -5.0},
            {x: 5.0, y: 5.0},
            {x: -5.0, y: 5.0}
        ];

        var alm = new Alm(Ntargets, Nparticles, initInfo, moreBeacons);

        it('particles keep a valid state', function () {
            alm.particles.forEach(function (particle) {
                assert(!isNaN(particle.state.x));
                assert(!isNaN(particle.state.y));
            });
            alm.step(deltaT);
            alm.particles.forEach(function (particle) {
                assert(!isNaN(particle.state.x));
                assert(!isNaN(particle.state.y));
            });
        });
    });
});