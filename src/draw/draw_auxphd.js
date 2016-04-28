/**
 * Draw AuxPHD module
 *
 * This module draws the state of the AuxPHD particle filter.
 */
module.exports = drawAuxPhd;

/**
 * Draw the state of the AuxPHD filter.
 * @param {object} auxPhd - Filter to draw
 */
function drawAuxPhd(auxPhd) {
    var drawingData = require('./draw.js')._getDrawingData();
    var ctx = drawingData.ctx;
    var world_coordinates = drawingData.world_coordinates;

    // Draw filter bounds
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    var topleft = world_coordinates.transform(auxPhd.bounds.xmin, auxPhd.bounds.ymin);
    var bottomright = world_coordinates.transform(auxPhd.bounds.xmax, auxPhd.bounds.ymax);
    ctx.strokeRect(topleft.x, topleft.y, bottomright.x - topleft.x, bottomright.y - topleft.y);

    // Draw particles
    auxPhd.particles.forEach(function (particle, index) {
        var size = 5.0;
        var alpha = Math.max(0, Math.min(1, particle.weight * auxPhd.particles.length) / 2);
        var pos = world_coordinates.transform(particle.state.x, particle.state.y);
        if (auxPhd.clusterAssignments[index]) {
            ctx.fillStyle = 'hsla(' + auxPhd.clusterAssignments[index] / auxPhd.clusters.length * 360.0 + ',50%,50%,' + alpha + ')';
        } else {
            ctx.fillStyle = 'rgba(100,100,100,' + alpha + ')';
        }
        ctx.fillRect(pos.x - 0.5 * size, pos.y - 0.5 * size, size, size);
    });

    // Draw clusters
    for (var i = 1; i < auxPhd.clusters.length; i++) {
        var cluster = auxPhd.clusters[i];
        var pos = world_coordinates.transform(cluster.x, cluster.y);
        var r = world_coordinates.transform(0.30);
        ctx.strokeStyle = 'hsl(' + i / auxPhd.clusters.length * 360.0 + ',100%,50%)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

