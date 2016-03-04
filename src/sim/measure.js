var randn = require('../util/randn.js');

exports.measure = measure;

/**
 * @property {number} phi Attenuation in dB.
 * @property {number} sigma_l Beam width.
 */
var params = {
    phi: -9.0,
    sigma_l: 0.2,
    sigma_z: 1.0
};
exports.params = params;

/**
 * @typedef Measurement
 * @property {Beacon} receiver - beacon from which the measurement is performed
 * @property {Beacon} transmitter - beacon that is observed
 * @property {number} delta_rssi - change in rssi in dB
 */

/**
 *
 * @param {Beacon} receiver - beacon from which the measurement is performed
 * @param {Beacon} transmitter - beacon that is observed
 * @param {Actor[]} actors - actors that can interfere with the signal
 * @returns {Measurement} - observed change in rssi
 */
function measure(receiver, transmitter, actors) {
    // Exponential model as described in Nannuro et al. 2013.
    delta_rssi = 0.0;
    actors.forEach(function (actor) {
        delta_rssi += params.phi * Math.exp(-lambda(receiver, transmitter, actor) / params.sigma_l);
    });
    delta_rssi += params.sigma_z * randn()
    return {
        receiver: receiver,
        transmitter: transmitter,
        delta_rssi: delta_rssi,
        link_variance: params.sigma_z
    };
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function lambda(from, to, actor) {
    return distance(from.x, from.y, actor.x, actor.y) + distance(to.x, to.y, actor.x, actor.y) - distance(from.x, from.y, to.x, to.y);
}