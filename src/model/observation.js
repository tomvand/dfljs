/**
 * Observation model
 */

/**
 * Parameters for the magnitude model described in
 * Nannuru et al. 2013 "Radio frequency tomography for passive indoor multi-
 * target tracking"
 * http://networks.ece.mcgill.ca/sites/default/files/paper_outline_v17.pdf
 */
var params = {
    phi: -9.0,
    sigma_l: 0.2
};
exports.params = params;

exports.observe_all = observe_all;

exports.observe = observe;

exports.lambda = lambda;
exports.distance = distance;

///**
// * Given all beacons and the current actor states, collect all observations.
// * @param {array} beacons - Beacons [{x, y, address}, ...]
// * @param {array} states - Actor states [actor, ...]
// * @returns {observe_all.observation|nm$_observation.observe_all.observation|Array}
// */
//function observe_all(beacons, states) {
//    var observation = [];
//    for (i = 0; i < beacons.length; i++) {
//        for (j = i + 1; j < beacons.length; j++) {
//            var deltaRSSI = 0.0;
//            states.forEach(function (state) {
//                deltaRSSI += observe(beacons[i], beacons[j], state);
//            });
//            observation.push({
//                beacons: [beacons[i], beacons[j]],
//                deltaRSSI: deltaRSSI
//            });
//        }
//    }
//    return observation;
//}

/**
 * Predict change in RSSI between transmitter and receiver caused by a target at
 * the position indicated by state.
 * @param {object} receiver - Receiving beacon {x, y, address}
 * @param {object} transmitter - Transmitting beacon {x, y, address}
 * @param {object} state - State of the target {x, y, ...}
 * @returns {Number} Change in RSSI
 */
function observe(receiver, transmitter, state) {
    return params.phi * Math.exp(-lambda(receiver, transmitter, state) / params.sigma_l);
}

// Ellipsoidal distance
function lambda(from, to, actor) {
    return distance(from.x, from.y, actor.x, actor.y) + distance(to.x, to.y, actor.x, actor.y) - distance(from.x, from.y, to.x, to.y);
}

// Euclidean Distance
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}