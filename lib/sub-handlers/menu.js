const { read } = require('../data');
const { verifyToken } = require('./tokens');
const { authTokenLength } = require('../config');

const menu = {};

//Return a list of mneu items to the client
//Required --> auth token and email
menu.get = (data, callback) => {
  const email =
    typeof data.queryStringObj.email === 'string' &&
    data.queryStringObj.email.trim().length > 0
      ? data.queryStringObj.email.trim()
      : false;
  if (email) {
    const token =
      typeof data.headers.authorization === 'string' &&
      data.headers.authorization.trim().length == authTokenLength
        ? data.headers.authorization.trim()
        : false;
    verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        //get menu
        read('menuItems', 'menu', (err, menuItems) => {
          if (!err && menuItems) {
            callback(200, menuItems);
          } else {
            callback(500, { error: 'Error fetching menu items.' });
          }
        });
      } else {
        callback(401, { error: 'Unauthorized.' });
      }
    });
  } else {
    callback(400, { error: 'Email is required.' });
  }
};

module.exports = menu;
