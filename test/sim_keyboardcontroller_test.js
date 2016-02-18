var assert = require('assert');

var keyboard = require('../src/sim/keyboardcontroller.js');

describe('keyboardcontroller', function () {
    describe('onKeyPress(event)', function () {
        it('moves the actor forward when up is pressed', function () {
            var actor_mock = {
                move: function (angle, distance) {
                    assert.equal(angle, 0);
                    assert(distance > 0);
                }
            };
            keyboard.posess(actor_mock);
            keyboard.onKeyPress({keyCode: 38});
        });
        it('moves the actor backward when down is pressed', function () {
            var actor_mock = {
                move: function (angle, distance) {
                    assert.equal(angle, 0);
                    assert(distance < 0);
                }
            };
            keyboard.posess(actor_mock);
            keyboard.onKeyPress({keyCode: 40});
        });
        it('rotates the actor counterclockwise when left is pressed', function () {
            var actor_mock = {
                move: function (angle, distance) {
                    assert.equal(distance, 0);
                    assert(angle > 0);
                }
            };
            keyboard.posess(actor_mock);
            keyboard.onKeyPress({keyCode: 37});
        });
        it('rotates the actor clockwise when right is pressed', function () {
            var actor_mock = {
                move: function (angle, distance) {
                    assert.equal(distance, 0);
                    assert(angle < 0);
                }
            };
            keyboard.posess(actor_mock);
            keyboard.onKeyPress({keyCode: 39});
        });
    });
});