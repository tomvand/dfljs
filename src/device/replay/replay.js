/**
 * The device/replay module collects data from a log object specified using
 * open(), and transforms this into RSSI data that can be used by the filter
 * to provide data for the tracking algorithm.
 * @module
 */

"use strict";

module.exports.open = open;
module.exports.getMeasurements = getMeasurements;
module.exports.getCurrentTime = getCurrentTime;

var log;
var currentTime;

function open(log_obj) {
    log = log_obj;
    currentTime = log_obj.startTimestamp;
}

function getCurrentTime() {
    return currentTime;
}

/**
 * Get a measurements vector of the next timestep.
 * @param {Beacon[]} beacons - list of beacons
 * @returns {undefined}
 */
function getMeasurements(beacons) {
    if (currentTime > log.endTimestamp) {
        return [];
    }

    var now = log.data[currentTime.toString() + '.0'];
    var measurements = []; // Array of {receiver, transmitter, rssi}

    for (var rxAddress in now) {
        for (var txAddress in now[rxAddress]) {
            measurements.push({
                receiver: rxAddress,
                transmitter: txAddress,
                rssi: now[rxAddress][txAddress]
            });
        }
    }

    currentTime++;

    return measurements;
}
