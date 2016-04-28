/**
 * This module can be used to calculate a rolling average and variance on the
 * fly.
 * Based on:
 * http://stackoverflow.com/questions/5147378/rolling-variance-algorithm
 */

module.exports = RunningVariance;

/**
 * Create a running variance filter
 * @param {number} window - Size of the window
 * @returns {RunningVariance} Running variance filter
 */
function RunningVariance(window) {
    this._window = window;
    this._remainingInitialSamples = window;

    this._psa = 0.0;
    this._sma = 0.0;

    this.queue = [];
    for (var i = 0; i < window; i++) {
        this.queue[i] = 0.0;
    }
}

/**
 * Update the filter
 * @param {number} value - New sample
 */
RunningVariance.prototype.filter = function (value) {
    var old = this.queue.shift();
    this.queue.push(value);

    this._sma += (value - old) / this._window;
    this._psa += (value * value - old * old) / this._window;

    if (this._remainingInitialSamples > 0) {
        this._remainingInitialSamples--;
    }
};

/**
 * Get the variance over the past window
 * @returns {Number} variance
 */
RunningVariance.prototype.variance = function () {
    return this._psa - this._sma * this._sma;
};

/**
 * Get the average over the past window
 * @returns {Number} average
 */
RunningVariance.prototype.average = function () {
    return this._sma;
};

/**
 * Is the filter initialized?
 * @returns {Boolean} True when enough samples have been observed to fill the
 *      entire window.
 */
RunningVariance.prototype.isInitialized = function () {
    return this._remainingInitialSamples === 0;
};