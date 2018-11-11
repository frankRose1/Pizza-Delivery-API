/**
 * Gather all of the sub-handlers and expose them to "lib/handlers.js"
 */
const users = require('./users');
const tokens = require('./tokens');
const menu = require('./menu');
const cart = require('./cart');
const orders = require('./orders');

const subHandlers = {};

subHandlers.users = users;
subHandlers.tokens = tokens;
subHandlers.menu = menu;
subHandlers.cart = cart;
subHandlers.orders = orders;

module.exports = subHandlers;
