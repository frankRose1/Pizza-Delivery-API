/**
 * Background worker related tasks
 */
const { list, remove, read } = require('./data');
const { workersInterval } = require('./config');
const { append } = require('./logs');

const workers = {};

workers.deleteExpiredTokens = () => {
  //get all tokens that currently exist
  list('tokens', (err, tokens) => {
    if (!err && tokens && tokens.length > 0) {
      tokens.forEach(tokenId => {
        read('tokens', tokenId, (err, tokenData) => {
          if (!err && tokenData) {
            //see which are expired and delete them
            if (tokenData.expires < Date.now()) {
              remove('tokens', tokenId, err => {
                if (err) {
                  workers.logError(
                    tokenId,
                    'remove',
                    `WORKERS: Error removing token file: ${tokenId}`
                  );
                }
              });
            }
          } else {
            workers.logError(
              tokenId,
              'read',
              `WORKERS: Error reading token file: ${tokenId}.`
            );
          }
        });
      });
    }
  });
};

workers.logError = (tokenId, action, error) => {
  const logData = {
    action,
    tokenId,
    error,
    occurredOn: Date.now()
  };

  const logString = JSON.stringify(logData);

  append(tokenId, logString, err => {
    if (err) {
      console.log(err);
    }
  });
};

workers.loop = () => {
  setInterval(() => {
    workers.deleteExpiredTokens();
  }, workersInterval);
};

workers.init = () => {
  //delete any expired tokens immediately
  workers.deleteExpiredTokens();

  //initiate a loop that will run once every 24 hours that will continue to delete tokens
  workers.loop();
};

module.exports = workers;
