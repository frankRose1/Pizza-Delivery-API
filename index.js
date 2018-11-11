/**
 *  Main file for the API
 *
 */

const server = require('./lib/server');
const cli = require('./lib/cli');
const workers = require('./lib/workers');

const app = {};

app.init = () => {
  server.init();

  workers.init();

  //start the cli last
  setTimeout(() => {
    cli.init();
  }, 100);
};

//Start the app
app.init();

module.exports = app;
