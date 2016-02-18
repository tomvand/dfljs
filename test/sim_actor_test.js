var assert = require('assert');

var Actor = require('../src/sim/actor.js');

function almostEqual(value, expected) {
    return Math.abs(value - expected) < 1e-6;
}

describe('Actor', function () {
    it('is a function (constructor)', function () {
        assert.equal(typeof (Actor), 'function');
    });

    describe('constructor', function () {
        var x = 45.2;
        var y = -3.2;
        var direction = 0.5 * Math.PI;

        var actor = new Actor(x, y, direction);

        it('sets x, y and direction', function () {
            assert.equal(actor.x, x);
            assert.equal(actor.y, y);
            assert.equal(actor.direction, direction);
        });
    });

    describe('.move(angle, distance)', function () {
        it('turns, then moves the actor', function () {
            var x = 1.0;
            var y = 0.1;
            var direction = 0.5 * Math.PI;

            var angle = -0.25 * Math.PI;
            var distance = Math.sqrt(8);

            var actor = new Actor(x, y, direction);
            actor.move(angle, distance);

            assert(almostEqual(actor.x, x + 2.0));
            assert(almostEqual(actor.y, y + 2.0));
            assert(almostEqual(actor.direction, 0.25 * Math.PI));
        });
    });
});