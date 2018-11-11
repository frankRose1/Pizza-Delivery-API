/**
 * Handles CRUD operations for users
 */
const { create, read, update, remove } = require('../data');
const { hashString } = require('../helpers');
const { authTokenLength } = require('../config');
const { verifyToken } = require('./tokens');

const users = {};

//Required => name, email, street, tosAgreement, password
users.post = (data, callback) => {
  let {
    firstName,
    lastName,
    email,
    street,
    password,
    confirmPassword,
    tosAgreement
  } = data.payload;
  firstName =
    typeof firstName == 'string' && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  lastName =
    typeof lastName == 'string' && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  email =
    typeof email == 'string' && email.trim().length > 0 ? email.trim() : false;
  street =
    typeof street == 'string' && street.trim().length > 0
      ? street.trim()
      : false;
  password =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;
  confirmPassword =
    typeof confirmPassword == 'string' && confirmPassword.trim().length > 0
      ? confirmPassword.trim()
      : false;
  tosAgreement =
    typeof tosAgreement == 'boolean' && tosAgreement == true ? true : false;

  if (
    firstName &&
    lastName &&
    email &&
    street &&
    password &&
    tosAgreement &&
    confirmPassword
  ) {
    if (password === confirmPassword) {
      // read returning an error means user doesnt exist yet and we can proceed
      read('users', email, (err, data) => {
        if (err) {
          //hash the password before saving
          const hashedPassword = hashString(password);
          if (hashedPassword) {
            const userData = {
              firstName,
              lastName,
              email,
              street,
              tosAgreement,
              password: hashedPassword,
              joined_on: Date.now()
            };
            create('users', email, userData, err => {
              if (!err) {
                callback(201);
              } else {
                callback(500, { error: 'Error creating new user.' });
              }
            });
          } else {
            callback(500, { error: 'Could not hash the users password' });
          }
        } else {
          callback(400, { error: 'A user with that email already exists!' });
        }
      });
    } else {
      callback(400, { error: 'Passwords must match!' });
    }
  } else {
    callback(400, { error: 'Please fill out the required fields!' });
  }
};

//Required -> email, auth token
users.get = (data, callback) => {
  let { email } = data.queryStringObj;
  email =
    typeof email == 'string' && email.trim().length > 0 ? email.trim() : false;
  if (email) {
    const token =
      typeof data.headers.authorization == 'string' &&
      data.headers.authorization.trim().length == authTokenLength
        ? data.headers.authorization.trim()
        : false;
    verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        read('users', email, (err, userData) => {
          if (!err && userData) {
            delete userData.password;
            callback(200, userData);
          } else {
            callback(404, { error: 'User not found' });
          }
        });
      } else {
        callback(401, { error: 'Unauthorized.' });
      }
    });
  } else {
    callback(400, { error: 'Email is missing or invalid.' });
  }
};

//Required -> email
// atleast one of the followng must be provided firstName, lastName, street, password
users.put = (data, callback) => {
  const email =
    typeof data.queryStringObj.email == 'string' &&
    data.queryStringObj.email.trim().length > 0
      ? data.queryStringObj.email
      : false;
  //optional fields to be updated
  let { firstName, lastName, street, password } = data.payload;
  firstName =
    typeof firstName == 'string' && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  lastName =
    typeof lastName == 'string' && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  street =
    typeof street == 'string' && street.trim().length > 0
      ? street.trim()
      : false;
  password =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;
  if (email) {
    const token =
      typeof data.headers.authorization == 'string' &&
      data.headers.authorization.trim().length == authTokenLength
        ? data.headers.authorization.trim()
        : false;
    verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        if (firstName || lastName || street || password) {
          //read in the users data, then update it
          read('users', email, (err, userData) => {
            if (!err && userData) {
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (street) {
                userData.street = street;
              }
              if (password) {
                userData.password = hashString(password);
              }
              update('users', email, userData, err => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { error: 'Could not update the user' });
                }
              });
            } else {
              callback(404, { error: 'User not found.' });
            }
          });
        } else {
          callback(400, { error: 'Provide atleast one field to be updated!' });
        }
      } else {
        callback(401, { error: 'Unauthorized.' });
      }
    });
  } else {
    callback(400, { error: 'Email is missing or invalid!' });
  }
};

//Required -> email
users.delete = (data, callback) => {
  const email =
    typeof data.queryStringObj.email == 'string' &&
    data.queryStringObj.email.trim().length > 0
      ? data.queryStringObj.email
      : false;
  if (email) {
    const token =
      typeof data.headers.authorization === 'string' &&
      data.headers.authorization.trim().length == authTokenLength
        ? data.headers.authorization.trim()
        : false;
    verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        //look up the user before proceeding, if there is userData then we know the user exists
        read('users', email, (err, userData) => {
          if (!err && userData) {
            remove('users', email, err => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { error: 'Could not delete the user account' });
              }
            });
          } else {
            callback(404, { error: 'User not found' });
          }
        });
      } else {
        callback(401, { error: 'Unauthorized.' });
      }
    });
  } else {
    callback(400, { error: 'Missing or invalid email' });
  }
};

module.exports = users;
