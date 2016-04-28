/**
 * The filter module collects bluetooth data as provided by the modules in
 * /device. The data is matched with beacons in the model (or rejected if the
 * addresses are unknown), and is then filtered to remove the background RSSI.
 * @module
 */

var mathjs = require('mathjs');

var RunVar = require('../util/runningvariance.js');

module.exports.filter = filter;

/**
 * Filter settings.
 */
var settings = {
    /**
     * Minimum value for estimated variance. Used to provide a
     * nonzero estimate of variance if RSSI quantization errors
     * provide an underestimated value. Also reduces some
     * numerical issues in the AuxPHD filter.
     */
    minimum_variance: 2.0,
    /**
     * Length of the window used to estimate the average RSSI and its variance.
     */
    backgroundWindow: 100,
    /**
     * Number of standard deviations past which an observation is considered an outlier.
     */
    r: 2.0
};
module.exports.settings = settings;


/**
 * Moving average and -variance filters per link
 */
var link_filters = [];

/**
 * Convert raw RSSI data into a list of observations.
 * @param {array} rssiData - List of raw RSSI measurements {receiver, transmitter, rssi}
 *      as returned by replay.getMeasurements().
 * @param {array} modelBeacons - List of beacons {x, y, address} that should be
 *      included in the filtered observations
 * @returns {array} List of filtered observations {beacons: {receiver, transmitter},
 *      delta_rssi, isOutlier, link_variance}
 */
function filter(rssiData, modelBeacons) {
    var linkRSSI = getAverageLinkRSSI(rssiData, modelBeacons);
    return subtractBackground(linkRSSI);
}

function getAverageLinkRSSI(rssiData, modelBeacons) {
    var link_observations = [];

    // Collect RSSI data per link
    rssiData.forEach(function (observation) {
        var rx = getBeaconByAddress(modelBeacons, observation.receiver);
        var tx = getBeaconByAddress(modelBeacons, observation.transmitter);
        if (!rx || !tx) {
            return;
        }

        var beacons = [rx, tx];
        var link_name = beacons[0].address + beacons[1].address;

        var link = link_observations.filter(function (l) {
            return l.name === link_name;
        })[0];
        if (!link) {
            link = {
                name: link_name,
                beacons: beacons,
                rssi: []
            };
            link_observations.push(link);
        }
        link.rssi.push(observation.rssi);
    });

    // Find the average RSSI per link
    link_observations.forEach(function (observation) {
        observation.rssi = mathjs.mean(observation.rssi);
    });

    return link_observations;
}

function subtractBackground(linkRSSI) {
    var observations = [];
    linkRSSI.forEach(function (link) {
        if (!link_filters[link.name]) {
            link_filters[link.name] = new RunVar(settings.backgroundWindow);
        }
        var filter = link_filters[link.name];

        if (!filter.isInitialized()) {
            filter.filter(link.rssi);
            return;
        } else {
            var variance = Math.max(settings.minimum_variance, filter.variance());
            var isOutlier = link.rssi > filter.average() + settings.r * variance ||
                    link.rssi < filter.average() - settings.r * variance;
            observations.push({
                beacons: link.beacons,
                delta_rssi: -Math.abs(link.rssi - filter.average()),
                isOutlier: isOutlier,
                link_variance: variance
            });
        }
    });
    return observations;
}

function getBeaconByAddress(beacons, address) {
    var b = beacons.filter(function (b) {
        return b.address.toLowerCase() === address.toLowerCase();
    });
    return b[0];
}