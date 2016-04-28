var randn = require('../util/randn.js');
var obs = require('../model/observation.js');

var lambda = obs.lambda;

exports.measure = measure;


// measure.js provides its own measurement model and parameters, so a mismatch
// between the world an tracking filter can be simulated.
/**
 * Measurement model parameters
 */
var params = {
    /**
     * Max attenuation in dB by a single target
     */
    phi: -9.0,
    /**
     * Width of the measurement region
     */
    sigma_l: 0.2,
    /**
     * Standard deviation of noise on RSSI measurements
     */
    sigma_z: 1.0
};
exports.params = params;



/**
 * Perform measurement between two beacons obstructed by actors.
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
    delta_rssi += params.sigma_z * randn();
    return {
        receiver: receiver,
        transmitter: transmitter,
        delta_rssi: delta_rssi,
        link_variance: params.sigma_z
    };
}
