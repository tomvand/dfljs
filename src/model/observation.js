var params = {
    phi: -5.0,
    sigma_l: 0.2,
    sigma_z: 2.0
};
exports.params = params;

exports.observe_all = observe_all;

exports.observe = observe;

function observe_all(beacons, states) {
    var observation = [];
    for (i = 0; i < beacons.length; i++) {
        for (j = i + 1; j < beacons.length; j++) {
            var deltaRSSI = 0.0;
            states.forEach(function (state) {
                deltaRSSI += observe(beacons[i], beacons[j], state);
            });
            observation.push({
                beacons: [beacons[i], beacons[j]],
                deltaRSSI: deltaRSSI
            });
        }
    }
    return observation;
}

function observe(receiver, transmitter, state) {
    return params.phi * Math.exp(-lambda(receiver, transmitter, state) / params.sigma_l);
}

function lambda(from, to, actor) {
    return distance(from.x, from.y, actor.x, actor.y) + distance(to.x, to.y, actor.x, actor.y) - distance(from.x, from.y, to.x, to.y);
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}