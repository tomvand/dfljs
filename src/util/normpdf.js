var mathjs = require('mathjs');

module.exports = normpdf;

function normpdf(x, mu, Sigma) {
    console.log('hello');
    k = x.length;
    console.log(k);
    e = mathjs.subtract(x, mu);
    console.log(e);
    return mathjs.inv(Math.sqrt(Math.pow(2 * Math.PI, k) * mathjs.det(Sigma))) *
            Math.exp(mathjs.multiply(-0.5, mathjs.multiply(mathjs.multiply(mathjs.transpose(e), mathjs.inv(Sigma)), e)));
}