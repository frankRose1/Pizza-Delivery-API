const { create, read, update, remove } = require('../data');
const {
  createRandomToken,
  stripePayment,
  mailgunEmail
} = require('../helpers');
const { authTokenLength } = require('../config');
const { from } = require('../config').mailgun;
const { verifyToken } = require('./tokens');

const orders = {};

//Required --> Auth token, Cart Id,
orders.post = (data, callback) => {
  const cartId =
    typeof data.payload.cartId == 'string' &&
    data.payload.cartId.trim().length == 20
      ? data.payload.cartId.trim()
      : false;

  if (cartId) {
    read('cart', cartId, (err, cartData) => {
      if (!err && cartData) {
        const token =
          typeof data.headers.authorization == 'string' &&
          data.headers.authorization.trim().length == authTokenLength
            ? data.headers.authorization.trim()
            : false;
        verifyToken(token, cartData.userEmail, tokenIsValid => {
          if (tokenIsValid) {
            //proceed with the order
            const { userEmail, total, items } = cartData;
            const orderId = createRandomToken(20);
            stripePayment(
              'usd',
              total,
              `Charge for order at Al Pacino\'s Pizza. order ID: ${orderId}`,
              'tok_visa',
              err => {
                if (!err) {
                  const orderData = {
                    userEmail: userEmail,
                    id: orderId,
                    ordered_on: Date.now(),
                    order_total: total,
                    items_ordered: items
                  };
                  create('orders', orderId, orderData, err => {
                    if (!err) {
                      //remove the cart info from the DB
                      remove('cart', cartId, err => {
                        if (!err) {
                          //remove the cartID from the user and add orderId
                          read('users', userEmail, (err, userData) => {
                            if (!err && userData) {
                              const userOrders =
                                typeof userData.orders == 'object' &&
                                userData.orders instanceof Array
                                  ? userData.orders
                                  : [];
                              //add refernce to the order and remove the cartId from the user
                              userOrders.push(orderId);
                              userData.orders = userOrders;
                              userData.cart = null;
                              update('users', userEmail, userData, err => {
                                if (!err) {
                                  //email the user
                                  const subject =
                                    "Your Order At Al Pacino's Pizza";
                                  const text = `Payment for order ${orderId} has been accepted and your order is on the way!`;
                                  mailgunEmail(
                                    from,
                                    userEmail,
                                    subject,
                                    text,
                                    err => {
                                      if (!err) {
                                        callback(200, orderData);
                                      } else {
                                        callback(500, { error: err });
                                      }
                                    }
                                  );
                                } else {
                                  callback(500, {
                                    error:
                                      "Could not update the user's information"
                                  });
                                }
                              });
                            } else {
                              callback(404, {
                                error: 'Could not find a user with that email'
                              });
                            }
                          });
                        } else {
                          callback(500, {
                            error: 'Could not delete the cart instance.'
                          });
                        }
                      });
                    } else {
                      callback(500, {
                        error: 'Error saving record of the order'
                      });
                    }
                  });
                } else {
                  callback(500, { error: err });
                }
              }
            );
          } else {
            callback(401, { error: 'Unauthorized.' });
          }
        });
      } else {
        callback(404, {
          error: 'Could not find a cart with that Id.'
        });
      }
    });
  } else {
    callback(403, { error: 'Invalid or missing fields.' });
  }
};

//allow a user to get their previous orders
//Required --> Auth token, orderId
orders.get = (data, callback) => {
  const orderId =
    typeof data.queryStringObj.orderId == 'string' &&
    data.queryStringObj.orderId.trim().length == 20
      ? data.queryStringObj.orderId.trim()
      : false;
  if (orderId) {
    //find the order
    read('orders', orderId, (err, orderData) => {
      if (!err && orderData) {
        //check the token
        const token =
          typeof data.headers.authorization === 'string' &&
          data.headers.authorization.trim().length === authTokenLength
            ? data.headers.authorization.trim()
            : false;
        verifyToken(token, orderData.userEmail, tokenIsValid => {
          if (tokenIsValid) {
            callback(200, orderData);
          } else {
            callback(401, { error: 'Unauthorized.' });
          }
        });
      } else {
        callback(404, { error: 'Could not find an order with that ID' });
      }
    });
  } else {
    callback(400, { error: 'Please provide an order ID.' });
  }
};

module.exports = orders;
