/*
 * Configuration of the physical test setup on the first floor of the Almende
 * building.
 */

/** Array of beacons {x, y, address} */
exports.beacons = [
    {x: -0.40, y: 0.55, address: 'E0:0B:E5:5C:6B:9B'},
    {x: 0.0, y: 0.55 + 3.50, address: 'C4:4C:CA:D7:A6:ED'},
    {x: 0.60, y: 0.55 + 3.50 + 4.00, address: 'C6:D6:56:79:24:03'},
    {x: 0.60 + 4.35, y: 0.55 + 3.50 + 4.00, address: 'E1:05:D3:D7:D9:81'},
    {x: 0.60 + 4.36 + 0.65, y: 4.50, address: 'EB:ED:23:6F:2E:C5'},
    {x: 0.60 + 4.35 + 0.65 - 0.70, y: 0.0, address: 'C0:D1:8D:33:4E:29'}
];

/** Array of beacons {x, y, address} that do not perform measurements */
exports.tx_only = [];

/** Array of all beacons {x, y, address} */
exports.all_beacons = exports.beacons;

/** Bounds of the environment {xmin, xmax, ymin, ymax} */
exports.bounds = {
    xmin: 0.00,
    xmax: 0.60 + 4.35 + 0.65,
    ymin: 0.00,
    ymax: 0.55 + 3.50 + 4.00
};