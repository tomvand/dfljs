module.exports = drawAuxPhd;

function drawAuxPhd(auxPhd) {
    var drawingData = require('./draw.js')._getDrawingData();
    var ctx = drawingData.ctx;
    var world_coordinates = drawingData.world_coordinates;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    var topleft = world_coordinates.transform(auxPhd.bounds.xmin, auxPhd.bounds.ymin);
    var bottomright = world_coordinates.transform(auxPhd.bounds.xmax, auxPhd.bounds.ymax);
    ctx.strokeRect(topleft.x, topleft.y, bottomright.x - topleft.x, bottomright.y - topleft.y);

    auxPhd.particles.forEach(function (particle) {
        var size = 5.0;
        var alpha = Math.max(0, Math.min(1, particle.weight * auxPhd.particles.length) / 2);
        var pos = world_coordinates.transform(particle.state.x, particle.state.y);
        ctx.fillStyle = 'rgba(100,100,100,' + alpha + ')';
        ctx.fillRect(pos.x - 0.5 * size, pos.y - 0.5 * size, size, size);
    });
}
;
