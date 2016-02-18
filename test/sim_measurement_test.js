var assert = require('assert');

var measure = require('../src/sim/measure.js');

describe('measure', function () {
    var receiver = {x: -5.0, y: 0.0};
    var transmitter = {x: 5.0, y: 0.0};

    it('returns the receiver, transmitter and change in rssi', function () {
        var actors = [{x: 0.0, y: 0.0}];
        var measurement = measure.measure(receiver, transmitter, actors);

        assert.equal(measurement.receiver, receiver);
        assert.equal(measurement.transmitter, transmitter);
        assert(measurement.delta_rssi < 0);
    });

    it('returns a negative change in rssi when blocked', function () {
        var actors = [{x: 0.0, y: 0.0}];
        var measurement = measure.measure(receiver, transmitter, actors);
        assert(measurement.delta_rssi < 0.0);
    });

    it('returns a smaller change when not completely blocked', function () {
        var actors0 = [{x: 0.0, y: 0.0}];
        var measurement0 = measure.measure(receiver, transmitter, actors0);
        var actors = [{x: 0.0, y: 2.0}];
        var measurement = measure.measure(receiver, transmitter, actors);
        assert(measurement.delta_rssi > measurement0.delta_rssi);
    });

    it('returns a larger change when blocked by multiple actors', function () {
        var actors0 = [{x: 0.0, y: 0.0}];
        var measurement0 = measure.measure(receiver, transmitter, actors0);
        var actors = [{x: -2.0, y: 0.0}, {x: 2.0, y: 0.0}];
        var measurement = measure.measure(receiver, transmitter, actors);
        assert(measurement.delta_rssi < measurement0.delta_rssi);
    });

    it('exposes model parameters', function () {
        assert(measure.params.phi);
        assert(measure.params.sigma_l);
    });
});