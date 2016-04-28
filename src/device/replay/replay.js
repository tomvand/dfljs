/**
 * The device/replay module collects data from a log object specified using
 * open(), and transforms this into RSSI data that can be used by the filter
 * to provide data for the tracking algorithm.
 */

"use strict";

module.exports.open = open;
module.exports.run = run;
module.exports.runOnce = runOnce;
module.exports.getMeasurements = getMeasurements;
module.exports.getCurrentTime = getCurrentTime;

var log;

var timestamps;
var index;
var callback;

/**
 * Open a log file for replaying.
 * @param {object} log_obj - Log object obtained by require()'ing a file from device/replay/log/.
 * @param {function(elapsed_time)} cb - Function to call each recorded timestep.
 */
function open(log_obj, cb) {
    log = log_obj;
    timestamps = Object.keys(log.data).sort();
    index = 1;
    callback = cb;
}

/**
 * Start file replay at actual speed. After run() is called once, timeouts
 * will be set to keep presenting new measurements at the recorded rate.
 * @param {function(elapsed_time)} cb - Function to call each recorded timestep.
 */
function run(cb) {
    if (cb) {
        callback = cb;
    }
    // Set up the next event
    if (index + 1 >= timestamps.length) {
        return;
    }
    var delta = (timestamps[index + 1] - timestamps[index]) * 1000;
    console.log(timestamps[index]);
    console.log(delta);
    setTimeout(run, delta);
    // Handle the current event
    runOnce();
}

/**
 * Advance the replay of the log file by a single recorded timestep.
 * @param {function(elapsed_time)} cb - Function to call each recorded timestep.
 */
function runOnce(cb) {
    if (cb) {
        callback = cb;
    }
    // Handle the current event
    callback(timestamps[index] - timestamps[index - 1]);
    // Increment index
    index++;
}

/**
 * Get the current time of the recorded data.
 * @returns {number} - Current time.
 */
function getCurrentTime() {
    return timestamps[index];
}

/**
 * Get a measurements vector of the current timestep.
 * @returns {array} - Array of observations {{address} receiver, {address} transmitter, rssi}.
 */
function getMeasurements() {
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
