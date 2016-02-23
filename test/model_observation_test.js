var assert = require('assert');

var observation = require('../src/model/observation.js');

describe('observation', function () {
    var receiver = {x: -5.0, y: 0.0};
    var transmitter = {x: 5.0, y: 0.0};

    describe('.observe_all()', function () {
        it('returns an array of links with two beacons and delta-rssi', function () {
            var states = [{x: 0.0, y: 0.0}];
            var obs = observation.observe_all([receiver, transmitter], states);

            assert.equal(obs[0].beacons[0], receiver);
            assert.equal(obs[0].beacons[1], transmitter);
            assert.equal(obs.length, 1);
            assert.equal(obs[0].beacons.length, 2);
            assert(obs[0].deltaRSSI < 0);
        });

        it('returns a negative change in rssi when blocked', function () {
            var states = [{x: 0.0, y: 0.0}];
            var obs = observation.observe_all([receiver, transmitter], states);
            assert(obs[0].deltaRSSI < 0.0);
        });

        it('returns a smaller change when not completely blocked', function () {
            var states0 = [{x: 0.0, y: 0.0}];
            var obs0 = observation.observe_all([receiver, transmitter], states0);
            var states = [{x: 0.0, y: 2.0}];
            var obs = observation.observe_all([receiver, transmitter], states);
            assert(obs[0].deltaRSSI > obs0[0].deltaRSSI);
        });

        it('returns a larger change when blocked by multiple actors', function () {
            var states0 = [{x: 0.0, y: 0.0}];
            var obs0 = observation.observe_all([receiver, transmitter], states0);
            var states = [{x: -2.0, y: 0.0}, {x: 2.0, y: 0.0}];
            var obs = observation.observe_all([receiver, transmitter], states);
            assert(obs[0].deltaRSSI < obs0[0].deltaRSSI);
        });
    });

    describe('.params', function () {
        it('exposes model parameters', function () {
            assert.equal(typeof (observation.params.phi), 'number');
            assert.equal(typeof (observation.params.sigma_l), 'number');
        });
    });
});