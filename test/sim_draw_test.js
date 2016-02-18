var assert = require('assert');

var draw = require('../src/sim/draw.js');

describe('draw', function () {
    describe('.attach()', function () {
        it('gets a 2d rendering context', function () {
            draw.attach({
                getContext: function (context_type) {
                    assert.equal(context_type, '2d');
                }
            });
        });
    });
});
