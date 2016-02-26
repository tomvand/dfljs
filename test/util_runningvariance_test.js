var assert = require('assert');

var randn = require('../src/util/randn.js');

var RunVar = require('../src/util/runningvariance.js');

describe('RunningVariance', function () {
    var average = -70.0;
    var variance = 5.0;

    var numSamples = 100;
    var samples = [];
    for (var i = 0; i < numSamples; i++) {
        samples.push(Math.sqrt(variance) * randn() + average);
    }

    var runVar = new RunVar(numSamples);
    var runVar_long = new RunVar(3 * numSamples);
    samples.forEach(function (sample) {
        runVar.filter(sample);
        runVar_long.filter(sample);
    });

    it('is a function (constructor)', function () {
        assert.equal(typeof (RunVar), 'function');
    });

    describe('.average()', function () {
        it('estimates the average', function () {
            assert(Math.abs(runVar.average() - average) < 0.5);
        });
    });

    describe('.variance()', function () {
        it('estimates the variance', function () {
            assert(Math.abs(runVar.variance() - variance) < 1.5);
        });
    });

    describe('.isInitialized()', function () {
        it('returns whether the filter has seen enough samples to provide an estimate', function () {
            assert(runVar.isInitialized());
            assert(!runVar_long.isInitialized());
        });
    });
});