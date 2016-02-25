"use strict";
/* global log - log object loaded by index.html*/

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
    var measurements = []; // Array of {receiver, transmitter, delta_rssi}

    for (var rxAddress in now) {
        var rxBeacon = getBeaconByAddress(beacons, rxAddress);
        if (!rxBeacon) {
            // console.log("Can't find beacon " + rxAddress);
            continue;
        }

        for (var txAddress in now[rxAddress]) {
            var txBeacon = getBeaconByAddress(beacons, txAddress);
            if (!txBeacon) {
                // console.log("Can't find beacon " + txAddress);
                continue;
            }

            var delta_rssi = 0.0;
            now[rxAddress][txAddress].forEach(function (delta) {
                delta_rssi += Number(delta);
            });
            delta_rssi /= now[rxAddress][txAddress].length;

            // TODO remove
            delta_rssi += 70.0;

            measurements.push({
                receiver: rxBeacon,
                transmitter: txBeacon,
                delta_rssi: delta_rssi
            });
        }
    }

    currentTime++;

    return measurements;
}

function getBeaconByAddress(beacons, address) {
    var b = beacons.filter(function (b) {
        return b.address.toLowerCase() === address.toLowerCase();
    });
    return b[0];
}