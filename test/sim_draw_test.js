var assert = require('assert');
var draw = require('../src/sim/draw.js');
describe('draw', function () {
    describe('.attach(canvas)', function () {
        it('gets a 2d rendering context', function () {
            draw.attach({
                getContext: function (context_type) {
                    assert.equal(context_type, '2d');
                }
            });
        });
    });
    describe('.setView(left, top, width, height)', function () {
        it('calls setTransform with appropriate arguments', function () {
            var left = -10.0;
            var top = -5.0;
            var width = 20.0;
            var height = 10.0;
            var canvas_width = 300;
            var canvas_height = 300;
            draw.attach({
                getContext: function () {
                    return {
                        setTransform: function (a, b, c, d, e, f) {
                            var scale = canvas_width / width;
                            assert.equal(a, scale);
                            assert.equal(b, 0);
                            assert.equal(c, 0);
                            assert.equal(d, -scale);
                            assert.equal(e, -left * scale);
                            assert.equal(f, -top * scale);
                        },
                        canvas: {
                            clientWidth: canvas_width,
                            clientHeight: canvas_height
                        }
                    };
                }
            });
            draw.setView(left, top, width, height);
        });
    });
});
