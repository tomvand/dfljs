var mathjs = require('mathjs');

module.exports = normpdf;

function normpdf(x, mu, Sigma) {
    k = x.size()[0];
    e = mathjs.subtract(x, mu);
    return mathjs.inv(Math.sqrt(Math.pow(2 * Math.PI, k) * mathjs.det(Sigma))) *
            Math.exp(mathjs.multiply(-0.5, mathjs.multiply(mathjs.multiply(mathjs.transpose(e), mathjs.inv(Sigma)), e)));
}