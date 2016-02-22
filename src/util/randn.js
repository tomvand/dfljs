// The code in this file is copied from
// http://www.meredithdodge.com/2012/05/30/a-great-little-javascript-function-for-generating-random-gaussiannormalbell-curve-numbers/
// The original source (Colin Godsey) is no longer available.

module.exports = function () {
    var x1, x2, rad, y1;
    do {
        x1 = 2 * Math.random() - 1;
        x2 = 2 * Math.random() - 1;
        rad = x1 * x1 + x2 * x2;
    } while (rad >= 1 || rad === 0);
    var c = Math.sqrt(-2 * Math.log(rad) / rad);
    return x1 * c;
};