/**
 *  Main file for the API
 * 
 */

const server = require('./lib/server');
const cli = require('./lib/cli');

const app = {};

app.init = () => {
    server.init();

    //start the cli last
    setTimeout(() => {
        cli.init();
    }, 100);
};

//Start the app
app.init();

module.exports = app;