exports.onKeyPress = onKeyPress;
exports.posess = posess;

var controlled_actor;

var step_angle = 15 / 180.0 * Math.PI;
var step_distance = 0.5;

/**
 * Set the actor that is moved by the keyboard controller.
 * @function
 * @param {Actor} actor
 */
function posess(actor) {
    controlled_actor = actor;
}

/**
 * Handle keypresses by sending the corresponding movement to the posessed actor.
 * @function
 * @param {type} event - Event data as given by 'document.onkeydown'
 */
function onKeyPress(event) {
    if (!controlled_actor) {
        return;
    }
    event = event || window.event;
    switch (event.keyCode) {
        case 38:
            // Up
            controlled_actor.move(0, step_distance);
            break;
        case 40:
            // Down
            controlled_actor.move(0, -step_distance);
            break;
        case 37:
            // Left
            controlled_actor.move(step_angle, 0);
            break;
        case 39:
            // Right
            controlled_actor.move(-step_angle, 0);
            break;
    }
}