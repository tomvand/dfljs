var replay = require('./device/replay/replay.js');
replay.open(log);

var rssifilter = require('./device/filter.js');

var Beacon = require('./sim/beacon.js');
var Actor = require('./sim/actor.js');
var measure = require('./sim/measure.js');
var draw = require('./sim/draw.js');

var Alm = require('./alm/alm.js');

var keyboard = require('./sim/keyboardcontroller.js');

//var tx_only = [
//    new Beacon(4.07, 0.0, 'F8:27:73:28:DA:FE'),
//    new Beacon(8.20 - 2.01, 0.0, 'C2:92:09:5F:04:78'),
//    new Beacon(0.0, 2.85, 'E1:89:95:C1:06:04'),
//    new Beacon(0.0, 5.50, 'F0:20:A1:2C:57:D4'),
//    new Beacon(0.0, 12.40 - 2.66, 'C0:82:3E:B9:F5:7B'),
//    new Beacon(8.20, 12.40 - 6.90 + 3.50 + 2.36, 'E0:31:D7:C5:CA:FF'),
//    new Beacon(8.20 - 2.449, 12.40 - 6.90 + 0.442, 'D7:D5:51:82:49:43')
//];
var beacons = [
    new Beacon(3.05, 4.05, 'C4:4C:CA:D7:A6:ED'),
    new Beacon(3.05, 2.20, 'EB:ED:23:6F:2E:C5'),
    new Beacon(3.36, 0.00, 'E0:0B:E5:5C:6B:9B'),
    new Beacon(5.25, 0.60, 'C0:D1:8D:33:4E:29'),
    new Beacon(5.25, 1.90, 'C6:D6:56:79:24:03'),
    new Beacon(5.25, 3.95, 'E1:05:D3:D7:D9:81')
];
//var all_beacons = tx_only.concat(beacons);
var all_beacons = beacons;

var actor = new Actor(2.0, 5.0, 0.0);
var stationary = new Actor(6.0, 3.0, Math.PI);
var actors = [actor, stationary];

var Ntargets = 1;
var Nparticles = 1000;
var bounds = {
    xmin: 3.05,
    xmax: 5.25,
    ymin: 0.00,
    ymax: 4.05
};
var initInfo = bounds;

var alm = new Alm(Ntargets, Nparticles, initInfo, bounds);

var state = {
    beacons: all_beacons,
//    actors: actors,
    actors: [],
    measurements: []
};

document.onkeydown = keyboard.onKeyPress;
keyboard.posess(actor);

draw.attach(document.getElementById('canvas'));
draw.setView(2.05, -5.05, 4, 6);


function loadMeasurements() {
    var link_measurements = replay.getMeasurements(all_beacons);
    state.measurements = rssifilter.filter(link_measurements, all_beacons);
}

while (!state.measurements.length) {
    loadMeasurements();
}


// Measurement loop
var meas_probability = 0.80;
var meas_period = 1000;
setInterval(function () {
    // Update measurements
    loadMeasurements();
    document.getElementById('clock').innerHTML = new Date(replay.getCurrentTime() * 1000);
    // Update ALM filter
    alm.observe(state.measurements);
    alm.cluster();
}, meas_period);

// Time update loop
var time_period = 100;
setInterval(function () {
    // Draw the current state
    draw.draw(state);
    draw.drawAlm(alm);
    // Update the ALM filter
    alm.predict(time_period / 1000.0);
}, time_period);
