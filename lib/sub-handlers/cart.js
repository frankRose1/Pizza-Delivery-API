const { create, read, update, remove } = require('../data');
const { authTokenLength } = require('../config');
const { createRandomToken } = require('../helpers');
const { verifyToken } = require('./tokens');

const cart = {};

//Required --> email, authtoken, atleast one item from the menu
cart.post = (data, callback) => {
  let { email, cartItems } = data.payload;
  email =
    typeof email == 'string' && email.trim().length > 0 ? email.trim() : false;
  cartItems =
    typeof cartItems == 'object' &&
    cartItems instanceof Array &&
    cartItems.length > 0
      ? cartItems
      : false;

  if (email && cartItems) {
    //normalize the input
    cartItems = cartItems.map(item => item.toLowerCase());

    const token =
      typeof data.headers.authorization == 'string' &&
      data.headers.authorization.trim().length == authTokenLength
        ? data.headers.authorization.trim()
        : false;
    verifyToken(token, email, tokenIsValid => {
      if (tokenIsValid) {
        //create the cart instance, and add an ID of it to the user
        read('users', email, (err, userData) => {
          if (!err && userData) {
            let totalPrice = 0;
            const cartId = createRandomToken(20);
            const items = [];
            //now figure out what the person placed in their cart off of the menu
            read('menuItems', 'menu', (err, menuItems) => {
              if (!err && menuItems) {
                for (let i = 0; i < menuItems.length; i++) {
                  if (cartItems.indexOf(menuItems[i].name) > -1) {
                    items.push(menuItems[i]);
                    totalPrice += menuItems[i].price;
                  }
                }

                if (items.length > 0) {
                  const cartData = {
                    items,
                    id: cartId,
                    userEmail: email,
                    total: totalPrice,
                    purchased: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  };
                  //save the cart and put the id on the user object
                  create('cart', cartId, cartData, err => {
                    if (!err) {
                      (userData.cart = cartId),
                        update('users', email, userData, err => {
                          if (!err) {
                            callback(200, cartData);
                          } else {
                            callback(500, {
                              error:
                                "Could not update the user's shopping cart."
                            });
                          }
                        });
                    } else {
                      callback(500, {
                        error: ' Could not save the cart to the database'
                      });
                    }
                  });
                } else {
                  callback(400, {
                    error:
                      'Please make sure you are chosing items off of the menu!'
                  });
                }
              } else {
                callback(500);
              }
            });
          } else {
            callback(404, { error: 'User not found.' });
          }
        });
      } else {
        callback(401, { error: 'Unauthorized.' });
      }
    });
  } else {
    callback(400, {
      error:
        'Missing or invalid required fields. Please chose at least one item from the menu to add to the shopping cart!'
    });
  }
};

//Required --> authToken, cartId
cart.get = (data, callback) => {
  const cartId =
    typeof data.queryStringObj.cartId === 'string' &&
    data.queryStringObj.cartId.trim().length === 20
      ? data.queryStringObj.cartId.trim()
      : false;
  if (cartId) {
    //read in the cart data to verify the email against the token
    read('cart', cartId, (err, cartData) => {
      if (!err && cartData) {
        const token =
          typeof data.headers.authorization === 'string' &&
          data.headers.authorization.trim().length === authTokenLength
            ? data.headers.authorization.trim()
            : false;
        verifyToken(token, cartData.userEmail, tokenIsValid => {
          if (tokenIsValid) {
            //send the user their cart information
            callback(200, cartData);
          } else {
            callback(401, { error: 'Unauthorized' });
          }
        });
      } else {
        callback(404, { error: 'Cart not found' });
      }
    });
  } else {
    callback(400, { error: 'Invalid or missing cart id.' });
  }
};

//Required --> cart id, auth token, and at least one item in the cartItems array
cart.put = (data, callback) => {
  const cartId =
    typeof data.payload.cartId === 'string' &&
    data.payload.cartId.trim().length === 20
      ? data.payload.cartId.trim()
      : false;
  let cartItems =
    typeof data.payload.cartItems == 'object' &&
    data.payload.cartItems instanceof Array &&
    data.payload.cartItems.length > 0
      ? data.payload.cartItems
      : false;
  if (cartId && cartItems) {
    //normalize the input
    cartItems = cartItems.map(item => item.toLowerCase());
    read('cart', cartId, (err, cartData) => {
      if (!err && cartData) {
        //verify the token
        const token =
          typeof data.headers.authorization === 'string' &&
          data.headers.authorization.trim().length === authTokenLength
            ? data.headers.authorization.trim()
            : false;
        verifyToken(token, cartData.userEmail, tokenIsValid => {
          if (tokenIsValid) {
            let totalPrice = 0;
            const items = [];
            //now figure out what the person placed in their cart off of the menu
            read('menuItems', 'menu', (err, menuItems) => {
              if (!err && menuItems) {
                for (i = 0; i < menuItems.length; i++) {
                  if (cartItems.indexOf(menuItems[i].name) > -1) {
                    items.push(menuItems[i]);
                    totalPrice += menuItems[i].price;
                  }
                }

                if (items.length > 0) {
                  cartData.items = items;
                  cartData.total = totalPrice;
                  cartData.updatedAt = Date.now();
                  //save the cart changes
                  update('cart', cartId, cartData, err => {
                    if (!err) {
                      callback(200, cartData);
                    } else {
                      callback(500, { error: 'Could not update the cart.' });
                    }
                  });
                } else {
                  callback(400, {
                    error:
                      'Please make sure you are chosing items off of the menu!'
                  });
                }
              } else {
                callback(500);
              }
            });
          } else {
            callback(401, { error: 'Unauthorized.' });
          }
        });
      } else {
        callback(404, { error: 'Cart not found.' });
      }
    });
  } else {
    callback(400, { error: 'Required fields are missing or invalid.' });
  }
};

//Required --> cartId and authtoken
//will need to delete the cart and the id reference on the user object
cart.delete = (data, callback) => {
  const cartId =
    typeof data.queryStringObj.cartId == 'string' &&
    data.queryStringObj.cartId.trim().length == authTokenLength
      ? data.queryStringObj.cartId.trim()
      : false;
  if (cartId) {
    //read in the cart data to verify the email against the token
    read('cart', cartId, (err, cartData) => {
      if (!err && cartData) {
        const token =
          typeof data.headers.authorization == 'string' &&
          data.headers.authorization.trim().length == authTokenLength
            ? data.headers.authorization.trim()
            : false;
        verifyToken(token, cartData.userEmail, tokenIsValid => {
          if (tokenIsValid) {
            remove('cart', cartId, err => {
              if (!err) {
                //delete cart id on the user
                read('users', cartData.userEmail, (err, userData) => {
                  if (!err && userData) {
                    const itsAMatch =
                      typeof userData.cart === 'string' &&
                      userData.cart === cartId
                        ? true
                        : false;
                    if (itsAMatch) {
                      //change the cart to be null and save the new user object
                      userData.cart = null;
                      update('users', cartData.userEmail, userData, err => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {
                            error:
                              "There was an issue updating the user's cart."
                          });
                        }
                      });
                    } else {
                      callback(500, {
                        error: "There was an issue updating the user's cart."
                      });
                    }
                  } else {
                    callback(404, { error: 'User not found.' });
                  }
                });
              } else {
                callback(500, { error: 'Could not delete the cart.' });
              }
            });
          } else {
            callback(401, { error: 'Unauthorized.' });
          }
        });
      } else {
        callback(404, { error: 'Cart not found' });
      }
    });
  } else {
    callback(400, { error: 'Invalid or Missing cart id.' });
  }
};

module.exports = cart;
