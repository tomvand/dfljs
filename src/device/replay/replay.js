/**
 * The device/replay module collects data from a log object specified using
 * open(), and transforms this into RSSI data that can be used by the filter
 * to provide data for the tracking algorithm.
 * @module
 */

"use strict";

module.exports.open = open;
module.exports.start = start;
module.exports.handleThis = handleThis;
module.exports.getMeasurements = getMeasurements;
module.exports.getCurrentTime = getCurrentTime;

var log;

var timestamps;
var index;
var callback;

function open(log_obj, cb) {
    log = log_obj;
    timestamps = Object.keys(log.data).sort();
    index = 1;
    callback = cb;
}

function start() {
    run();
}

function run() {
    // Set up the next event
    if (index + 1 >= timestamps.length) {
        return;
    }
    var delta = (timestamps[index + 1] - timestamps[index]) * 1000;
    console.log(timestamps[index]);
    console.log(delta);
    setTimeout(run, delta);
    // Handle the current event
    handleThis();
}

function handleThis() {
    // Handle the current event
    callback(timestamps[index] - timestamps[index - 1]);
    // Increment index
    index++;
}

function getCurrentTime() {
    return timestamps[index];
}

/**
 * Get a measurements vector of the next timestep.
 * @param {Beacon[]} beacons - list of beacons
 * @returns {undefined}
 */
function getMeasurements(beacons) {
    var now = log.data[timestamps[index]];
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
    return measurements;
}
