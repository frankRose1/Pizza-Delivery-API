/**
 *  Main file for the API
 * 
 */

const server = require('./lib/server');

const app = {};

app.init = () => {
    server.init();
};

//Start the app
app.init();

module.exports = app;