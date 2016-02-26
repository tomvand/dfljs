var assert = require('assert');

var randn = require('../src/util/randn.js');

var rssifilter = require('../src/device/filter.js');


describe('filter', function () {
    var beacons = [
        {x: -5.0, y: 0.0, address: '0'},
        {x: 5.0, y: 0.0, address: '1'}
    ];

    var average = -70.0;
    var variance = 5.0;

    var samples_per_measurement = 5;
    var measurements = [];
    for (var i = 0; i < samples_per_measurement; i++) {
        measurements.push({
            receiver: '0',
            transmitter: '1',
            rssi: average + Math.sqrt(variance) * randn()
        });
    }

    describe('.filter()', function () {
        var obs = rssifilter.filter(measurements, beacons);
        it('does not give results from uninitialized filters', function () {
            assert.equal(obs.length, 0);
        });

        it('subtracts background noise if enough samples have been received', function () {
            var obs;
            for (var i = 0; i < 200; i++) {
                obs = rssifilter.filter(measurements, beacons);
            }
            assert.equal(obs.length, 1);
            assert.equal(obs[0].beacons[0].address, beacons[0].address);
            assert.equal(obs[0].beacons[1].address, beacons[1].address);
            assert(Math.abs(obs[0].delta_rssi) < 0.5);

            obs = rssifilter.filter([{receiver: beacons[0].address, transmitter: beacons[1].address, rssi: -65.0}], beacons);
            assert(Math.abs(obs[0].delta_rssi - 5.0) < 1.0);
        });
    });
});