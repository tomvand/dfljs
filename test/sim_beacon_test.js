var assert = require('assert');

var Beacon = require('../src/sim/beacon.js');

describe('Beacon', function () {
    var x = 5.1;
    var y = -2.3;
    var address = 'ab:cd:ef:01:23';

    var beacon = new Beacon(x, y, address);

    it('is a function (a constructor)', function () {
        assert.equal(typeof (Beacon), 'function');
    });

    describe('constructor', function () {
        it('sets x, y and address', function () {
            assert.equal(beacon.x, x);
            assert.equal(beacon.y, y);
            assert.equal(beacon.address, address);
        });
    });
});