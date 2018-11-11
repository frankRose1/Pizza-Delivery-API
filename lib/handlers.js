/**
 * Handle all routing of requests here
 * All handlers take two parameters
 *      1) Data ==> which is parsed from the users request(method, path, payload, etc)
 *      2) Callback ==> the response we are sending to the user
 */
const { users, tokens, menu, cart, orders } = require('./sub-handlers');

const handlers = {};

//parent handler that will redirect to a sub handler depending on the method(post, get, put, delete)
handlers.users = (data, callback) => {
  const supportedMethods = ['post', 'get', 'put', 'delete'];
  if (supportedMethods.indexOf(data.method) > -1) {
    //route to a sub handler that deals with this method
    handlers._users[data.method](data, callback);
  } else {
    callback(405); //method not allowed
  }
};

handlers._users = users;

handlers.tokens = (data, callback) => {
  const supportedMethods = ['post', 'get', 'put', 'delete'];
  if (supportedMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._tokens = tokens;

handlers.menu = (data, callback) => {
  const supportedMethods = ['get'];
  if (supportedMethods.indexOf(data.method) > -1) {
    handlers._menu[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._menu = menu;

handlers.cart = (data, callback) => {
  const supportedMethods = ['get', 'post', 'put', 'delete'];
  if (supportedMethods.indexOf(data.method) > -1) {
    handlers._cart[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._cart = cart;

handlers.orders = (data, callback) => {
  const supportedMethods = ['get', 'post'];
  if (supportedMethods.indexOf(data.method) > -1) {
    handlers._orders[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._orders = orders;

handlers.ping = (data, callback) => {
  callback(200);
};

handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;
