dfljs (Device-free Localization for JavaScript)
===============================================

What is dfljs
-------------
DfLjs is a Device-free Localization example in JavaScript.
A particle filter is used to track a person, by observing his/her shadowing effect on Bluetooth signals between beacons.
The code provided here contains an implementation of the auxiliary particle filter-based Probability Hypothesis Density filter (as presented by S. Nannuru in http://networks.ece.mcgill.ca/sites/default/files/PhD_Thesis_Santosh.pdf) and a small simulated environment for demonstration.

This project is no longer maintained.

Build
-----
Before the demonstration can be used, the project needs to be built.
Download dependencies by running `npm install` in the project folder.
Then, build the project using `npm run build-js`.

Use
---
### Browser
Open `www/index.html`.

### Cordova
First add a platform to cordova. From the dfljs/ folder: `cordova platform add ...`.
Then use `cordova build ...` and `cordova run ...` to run the project.
(Note: this project has not been tested on mobile devices)
