/*
 * Configuration of the physical test setup on the second floor of the Almende
 * building.
 */

/** Array of beacons {x, y, address} */
exports.beacons = [
    {x: 3.05, y: 4.05, address: 'C4:4C:CA:D7:A6:ED'},
    {x: 3.05, y: 2.20, address: 'EB:ED:23:6F:2E:C5'},
    {x: 3.36, y: 0.00, address: 'E0:0B:E5:5C:6B:9B'},
    {x: 5.25, y: 0.60, address: 'C0:D1:8D:33:4E:29'},
    {x: 5.25, y: 1.90, address: 'C6:D6:56:79:24:03'},
    {x: 5.25, y: 3.95, address: 'E1:05:D3:D7:D9:81'}
];

/** Array of beacons {x, y, address} that do not perform measurements */
exports.tx_only = [
    {x: 4.07, y: 0.0, address: 'F8:27:73:28:DA:FE'},
    {x: 8.20 - 2.01, y: 0.0, address: 'C2:92:09:5F:04:78'},
    {x: 0.0, y: 2.85, address: 'E1:89:95:C1:06:04'},
    {x: 0.0, y: 5.50, address: 'F0:20:A1:2C:57:D4'},
    {x: 0.0, y: 12.40 - 2.66, address: 'C0:82:3E:B9:F5:7B'},
    {x: 8.20, y: 12.40 - 6.90 + 3.50 + 2.36, address: 'E0:31:D7:C5:CA:FF'},
    {x: 8.20 - 2.449, y: 12.40 - 6.90 + 0.442, address: 'D7:D5:51:82:49:43'}
];

/** Array of all beacons {x, y, address} */
exports.all_beacons = exports.beacons.concat(exports.tx_only);

/** Bounds of the environment {xmin, xmax, ymin, ymax} */
exports.bounds = {
    xmin: 0.00,
    xmax: 8.20,
    ymin: 0.00,
    ymax: 12.40
};