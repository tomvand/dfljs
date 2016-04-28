/*
 * Template file for environment descriptions
 *
 * Files in this folder contain locations and identities of beacons in several
 * simulated environments and test setups.
 *
 * The following values are exported:
 *  beacons: an array of {x, y, address} objects describing beacons that
 *      can transmit and receive RF signals.
 *  tx_only: an array of {x, y, address} beacons that do not perform RSSI
 *      measurements.
 *  all_beacons: beacons + tx_only.
 *  bounds: {xmin, xmax, ymin, ymax} values indicating the bounds of the
 *      environment.
 */

/** Array of beacons {x, y, address} */
exports.beacons = [
    {x: null, y: null, address: null}
];

/** Array of beacons {x, y, address} that do not perform measurements */
exports.tx_only = [];

/** Array of all beacons {x, y, address} */
exports.all_beacons = exports.beacons.concat(exports.tx_only);

/** Bounds of the environment {xmin, xmax, ymin, ymax} */
exports.bounds = {
    xmin: null,
    xmax: null,
    ymin: null,
    ymax: null
};