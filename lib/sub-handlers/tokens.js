const { create, read, update, remove } = require('../data');
const { hashString, createRandomToken } = require('../helpers');
const { authTokenLength } = require('../config');

const tokens = {};

//Required --> email and password
tokens.post = (data, callback) => {
  let { email, password } = data.payload;
  email =
    typeof email == 'string' && email.trim().length > 0 ? email.trim() : false;
  password =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;

  if (email && password) {
    //read in the user to make sure they exist
    read('users', email, (err, userData) => {
      if (!err && userData) {
        //make sure the passwords match
        if (userData.password === hashString(password)) {
          const tokenId = createRandomToken(authTokenLength);
          const expires = Date.now() + 1000 * 60 * 60; //1 hour
          const tokenData = {
            expires,
            email,
            token: tokenId
          };
          //save to the tokens directory
          create('tokens', tokenId, tokenData, err => {
            if (!err) {
              callback(200, tokenData);
            } else {
              callback(500, { error: 'Error creating auth token.' });
            }
          });
        } else {
          callback(400, { error: 'Incorrect password' });
        }
      } else {
        callback(404, { error: 'User not found.' });
      }
    });
  } else {
    callback(400, {
      error: 'Email and password are required.'
    });
  }
};

//required --> token
tokens.get = (data, callback) => {
  const tokenId =
    typeof data.headers.authorization === 'string' &&
    data.headers.authorization.trim().length === authTokenLength
      ? data.headers.authorization.trim()
      : false;
  if (tokenId) {
    read('tokens', tokenId, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404, { error: 'Token not found' });
      }
    });
  } else {
    callback(400, { error: 'Missing or invalid token.' });
  }
};

//Required -> token, extend(boolean)
//can extend the token's expiration date by one hour from the current time
tokens.put = (data, callback) => {
  const tokenId =
    typeof data.payload.token == 'string' &&
    data.payload.token.trim().length == authTokenLength
      ? data.payload.token.trim()
      : false;
  const extend =
    typeof data.payload.extend == 'boolean' && data.payload.extend == true
      ? true
      : false;
  if (tokenId && extend) {
    //make sure token exists
    read('tokens', tokenId, (err, tokenData) => {
      if (!err && tokenData) {
        //make sure the token hasnt already expired
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          update('tokens', tokenId, tokenData, err => {
            if (!err) {
              callback(200, tokenData);
            } else {
              callback(500, { error: 'Could not refresh the token.' });
            }
          });
        } else {
          callback(403, { error: 'Token has already expired!' });
        }
      } else {
        callback(404, { error: 'Token not found.' });
      }
    });
  } else {
    callback(400, { error: 'Required fields are missing or invalid.' });
  }
};

//Required --> Auth headers
tokens.delete = (data, callback) => {
  const tokenId =
    typeof data.headers.authorization == 'string' &&
    data.headers.authorization.trim().length == authTokenLength
      ? data.headers.authorization.trim()
      : false;
  if (tokenId) {
    read('tokens', tokenId, (err, tokenData) => {
      if (!err && tokenData) {
        remove('tokens', tokenId, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { error: 'Could not delete the token' });
          }
        });
      } else {
        callback(404, { error: 'Token not found.' });
      }
    });
  } else {
    callback(401, { error: 'Unauthorized' });
  }
};

/**
 * Compare the email provided by the user to the email associated with the token
 * Also make sure the token hasnt expired
 */
tokens.verifyToken = (token, email, callback) => {
  read('tokens', token, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.email === email && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

module.exports = tokens;
