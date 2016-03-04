module.exports = drawAlm;

function drawAlm(alm) {
    var drawingData = require('./draw.js')._getDrawingData();
    var ctx = drawingData.ctx;
    var world_coordinates = drawingData.world_coordinates;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    var topleft = world_coordinates.transform(alm.bounds.xmin, alm.bounds.ymin);
    var bottomright = world_coordinates.transform(alm.bounds.xmax, alm.bounds.ymax);
    ctx.strokeRect(topleft.x, topleft.y, bottomright.x - topleft.x, bottomright.y - topleft.y);

    alm.particles.forEach(function (particle) {
        var size = 5.0;
        var alpha = Math.max(0, Math.min(1, particle.weight * alm.particles.length) / 2);
        var pos = world_coordinates.transform(particle.state.x, particle.state.y);
        ctx.fillStyle = 'hsla(' + particle.cluster / alm.Ntargets * 360.0 + ',50%,50%,' + alpha + ')';
        ctx.fillRect(pos.x - 0.5 * size, pos.y - 0.5 * size, size, size);
    });

    alm.clusters.forEach(function (cluster, index) {
        var pos = world_coordinates.transform(cluster.value.x, cluster.value.y);
        var r = world_coordinates.transform(0.30);
        ctx.strokeStyle = 'hsl(' + index / alm.clusters.length * 360.0 + ',100%,50%)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
        ctx.stroke();
    });
}
;
