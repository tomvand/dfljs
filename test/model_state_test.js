var assert = require('assert');

var State = require('../src/model/state.js');

describe('State', function () {
    it('is a function (constructor)', function () {
        assert.equal(typeof (State), 'function');
    });

    describe('constructor', function () {
        it('initializes a random state using supplied information', function () {
            var initInfo = {
                xmin: -8,
                xmax: 4,
                ymin: -4,
                ymax: 4
            };

            var states = [];
            for (i = 0; i < 100; i++) {
                states.push(new State(initInfo));
            }

            states.forEach(function (state) {
                assert(state.x >= initInfo.xmin);
                assert(state.x <= initInfo.xmax);
                assert(state.y >= initInfo.ymin);
                assert(state.y <= initInfo.ymax);
            });
        });
    });

    describe('predict()', function () {
        it('predicts its next position', function () {
            var initInfo = {
                xmin: 1,
                xmax: 1,
                ymin: 1,
                ymax: 1
            };
            var deltaT = 0.1;

            var state = new State(initInfo);

            state.predict(deltaT);
            assert.ok(state.x);
            assert.ok(state.y);
            assert(!isNaN(state.x));
            assert(!isNaN(state.y));
        });
    });
});