/**
 * The filter module collects bluetooth data as provided by the modules in
 * /device. The data is matched with beacons in the model (or rejected if the
 * addresses are unknown), and is then filtered to remove the background RSSI.
 * @module
 */

var mathjs = require('mathjs');

var RunVar = require('../util/runningvariance.js');

module.exports.filter = filter;

var settings = {
    backgroundWindow: 60,
    r: 2.0
};
module.exports.settings = settings;



var link_filters = [];

// beacons: [{receiver, transmitter, rssi}]
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

        var beacons = (rx.address < tx.address)
                ? [rx, tx]
                : [tx, rx];
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
            var isBlocked = true;
            if (link.rssi > filter.average() - settings.r * Math.sqrt(filter.variance())) {
                // Update the filter if this is not an outlier.
                filter.filter(link.rssi);
                isBlocked = false;
            }
            observations.push({
                beacons: link.beacons,
                delta_rssi: link.rssi - filter.average(),
                isBlocked: isBlocked
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