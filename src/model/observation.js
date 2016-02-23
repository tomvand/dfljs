var params = {
    phi: -5.0,
    sigma_l: 0.2,
    sigma_z: 1.0
};
exports.params = params;

exports.observe = observe;

function observe(beacons, states) {
    var observation = [];
    for (i = 0; i < beacons.length; i++) {
        for (j = i + 1; j < beacons.length; j++) {
            var deltaRSSI = 0.0;
            states.forEach(function (state) {
                deltaRSSI += params.phi * Math.exp(-lambda(beacons[i], beacons[j], state) / params.sigma_l);
            });
            observation.push({
                beacons: [beacons[i], beacons[j]],
                deltaRSSI: deltaRSSI
            });
        }
    }
    return observation;
}

function lambda(from, to, actor) {
    return distance(from.x, from.y, actor.x, actor.y) + distance(to.x, to.y, actor.x, actor.y) - distance(from.x, from.y, to.x, to.y);
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}