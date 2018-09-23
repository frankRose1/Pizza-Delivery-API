/**
 * Handle all routing of requests here
 * All handlers take two parameters
 *      1) Data ==> which is parsed from the users request(method, path, payload, etc)
 *      2) Callback function ==> the response we are sending to the user
 */
const {create, read, update, remove} = require('./data');
const {hashString, createRandomToken, stripePayment, mailgunEmail} = require('./helpers');
const {authTokenLength} = require('./config');
const {from} = require('./config').mailgun;

const handlers = {};

//parent handler that will redirect to a sub handler depending on the method(post, get, put, delete)
handlers.users = (data, callback) => {
    const supportedMethods = ['post', 'get', 'put', 'delete'];
    if (supportedMethods.indexOf(data.method) > -1) {
        //route to a handler that deals with this method
        handlers._users[data.method](data, callback);
    } else {
        callback(405); //method not allowed
    }
};

handlers._users = {};

//Required => name, email, street, tosAgreement, password
handlers._users.post = (data, callback) => {
    //validate the required fields
    let { firstName, lastName, email, street, password, confirmPassword, tosAgreement } = data.payload;
    firstName = typeof(firstName) == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
    lastName = typeof(lastName) == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
    email = typeof(email) == 'string' && email.trim().length > 0 ? email.trim() : false;
    street = typeof(street) == 'string' && street.trim().length > 0 ? street.trim() : false;
    password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;
    confirmPassword = typeof(confirmPassword) == 'string' && confirmPassword.trim().length > 0 ? confirmPassword.trim() : false;

    tosAgreement = typeof(tosAgreement) == 'boolean' && tosAgreement == true ? true : false;

    if (firstName && lastName && email && street && password && tosAgreement && confirmPassword) {
        if (password === confirmPassword) {
            // read returning an error means user doesnt exist yet and we can proceed
            read('users', email, (err, data) => {
                if (err) {
                    //hash the password before saving to the DB
                    const hashedPassword = hashString(password);
                    if (hashedPassword) {
                        const userData = {
                            firstName,
                            lastName,
                            email,
                            street,
                            hashedPassword,
                            tosAgreement
                        };
                        //user's email will be the unique file name
                        create('users', email, userData, err => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {error: 'Error creating new user.'});
                            }
                        });
                    } else {
                        callback(500, {error: 'Could not hash the users password'});
                    }
                } else {
                    callback(400, {error: 'A user with that email already exists!'});
                }
            });
        } else {
            callback(400, {error: 'Passwords must match!'});
        }
    } else {
        callback(400, {error: 'Please fill out the required fields!'});
    }
};

//Required -> email
handlers._users.get = (data, callback) => {
    let {email} = data.queryStringObj;
    email = typeof(email) == 'string' && email.trim().length > 0 ? email.trim() : false;
    if (email) {
        //authorize the user
        const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
        handlers._tokens.verifyToken(token, email, tokenIsValid => {
            if (tokenIsValid) {
                read('users', email, (err, userData) => {
                    if (!err && userData) {
                        //remove the password from the object before sending it back
                        delete userData.hashedPassword;
                        callback(200, userData);
                    } else {
                        callback(404, {error: 'User not found'});
                    }
                });
            } else {
                callback(403, {error: 'The auth token is missing or invalid'});
            }
        });
    } else {
        callback(400, {error: 'Email is missing or invalid.'});
    }
};

//Required -> email
// atleast one of the followng must be provided firstName, lastName, street, password
handlers._users.put = (data, callback) => {
    const email = typeof(data.queryStringObj.email) == 'string' && data.queryStringObj.email.trim().length > 0 ? data.queryStringObj.email : false;
    //optional fields to be updated
    let {firstName, lastName, street, password} = data.payload;
    firstName = typeof(firstName) == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
    lastName = typeof(lastName) == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
    street = typeof(street) == 'string' && street.trim().length > 0 ? street.trim() : false;
    password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;
    if (email) {

        //authorize the user
        const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
        handlers._tokens.verifyToken(token, email, tokenIsValid => {
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
                                userData.hashedPassword = hashString(password);
                            }
                            update('users', email, userData, err => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, {error: 'Could not update the user'});
                                }
                            });
                        } else {
                            callback(404, {error: 'User not found.'});
                        }
                    });
                } else {
                    callback(400, {error: 'Provide atleast one field to be updated!'});
                }

            } else {
                callback(403, {error: 'The auth token is missing or invalid'});
            }
        });

    } else {
        callback(400, {error: 'Email is missing or invalid!'});
    }
};

//Required -> email
handlers._users.delete = (data, callback) => {
    const email = typeof(data.queryStringObj.email) == 'string' && data.queryStringObj.email.trim().length > 0 ? data.queryStringObj.email : false;
    if (email) {

        const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
        handlers._tokens.verifyToken(token, email, tokenIsValid => {
            if (tokenIsValid) {
                //look up the user before proceeding
                read('users', email, (err, userData) => {
                    if (!err && userData) {
                        //if there is userData then we know the user exists
                        remove('users', email, err => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {error: 'Could not delete the user account'});
                            }
                        });
                    } else {
                        callback(404, {error: 'User not found'});
                    }
                });
            } else {
                callback(403, {error: 'The auth token is missing or invalid'});
            }
        });

    } else {
        callback(400, {error: 'Missing or invalid email'});
    }
};

handlers.tokens = (data, callback) => {
    const supportedMethods = ['post', 'get', 'put', 'delete'];
    if (supportedMethods.indexOf(data.method) > -1) {
        //route to a handler that deals with this method
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405); //method not allowed
    }
};

handlers._tokens = {};

//Required --> email and password
handlers._tokens.post = (data, callback) => {
    let {email, password} = data.payload;
    email = typeof(email) == 'string' && email.trim().length > 0 ? email.trim() : false;
    password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;

    if (email && password) {
        //read in the user to make sure they exist
        read('users', email, (err, userData) => {
            if (!err && userData) {
                //make sure the passwords match
                if (userData.hashedPassword == hashString(password)) {
                    const tokenId = createRandomToken(authTokenLength);
                    const expires = Date.now() + (1000 * 60 * 60); //expires an hour from now
                    const tokenData = {
                        tokenId,
                        expires,
                        email
                    };
                    //save to the tokens directory
                    create('tokens', tokenId, tokenData, err => {
                        if (!err) {
                            callback(200, tokenData);
                        } else {
                            callback(500, {error: 'Issue creating token'});
                        }
                    });
                } else {
                    callback(403, {error: 'Incorrect password'});
                }
            } else {
                callback(404, {error: 'User not found.'});
            }
        });
    } else {
        callback(400, {error: 'One or more required fields is missing or invalid'});
    }
};

//required --> tokenID
handlers._tokens.get = (data, callback) => {
    const tokenId = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == authTokenLength ? data.queryStringObj.id.trim() : false;
    if (tokenId) {
        read('tokens', tokenId, (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404, {error: 'Token not found'});
            }
        });
    } else {
        callback(400, {error: 'Missing or invalid token.'});
    }
};

//Required -> tokenId, extend(boolean)
//can extend the token's expiration date by one hour from the current time
handlers._tokens.put = (data, callback) => {
    const tokenId = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == authTokenLength ? data.payload.id.trim() : false;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(tokenId && extend) {
        //make sure token exists
        read('tokens', tokenId, (err, tokenData) => {
            if (!err && tokenData) {
                //make sure the token hasnt already expired
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + (1000 * 60 * 60);
                    update('tokens', tokenId, tokenData, err => {
                        if (!err) {
                            callback(200, tokenData);
                        } else {
                            callback(500, {error: 'Could not extend the token'});
                        }
                    });
                } else {
                    callback(403, {error: 'Token has alread expired!'});
                }
            } else {
                callback(404, {error: 'Token not found'});
            }
        });
    } else {
        callback(400, {error: 'Missing or invalid required fields'});
    }
};

//Required --> tokenId
handlers._tokens.delete = (data, callback) => {
    const tokenId = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == authTokenLength ? data.queryStringObj.id.trim() : false;
    if (tokenId) {
        read('tokens', tokenId, (err, tokenData) => {
            if (!err && tokenData) {
                remove('tokens', tokenId, err => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {error: 'Could not delete the token'});
                    }
                });
            } else {
                callback(404, {error: 'Token not found.'});
            }
        });
    } else {
        callback(400, {error: 'Missing or invalid token Id!'});
    }
};

//Verify the token is valid before granting authorization
handlers._tokens.verifyToken = (id, email, callback) => {
    //compare the email sent by the user to the email associated with the token ID and make sure token hasnt expired
    read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            if (tokenData.email == email && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        }
        else {
            callback(false);
        }
    });
};

//User should be logged in to be able to get the menu items
handlers.menu = (data, callback) => {
    const supportedMethods = ['get'];
    if (supportedMethods.indexOf(data.method) > -1) {
        handlers._menu[data.method](data, callback);
    } else {
        callback(405); //method not allowed
    }
};

handlers._menu = {};

//Required --> auth token and email
handlers._menu.get = (data, callback) => {
    const email = typeof(data.queryStringObj.email) == 'string' && data.queryStringObj.email.trim().length > 0 ? data.queryStringObj.email.trim() : false;
    if (email) {
        const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
        handlers._tokens.verifyToken(token, email, tokenIsValid => {
            if (tokenIsValid) {
                //get menu
                read('menuItems', 'menu', (err, menuItems) => {
                    if (!err && menuItems) {
                        callback(200, menuItems);
                    } else {
                        callback(500, {error: 'error fetching menu items.'});
                    }
                });
            } else {
                callback(403, {error: 'Token is invalid or has expired!'});
            }
        });
    } else {
        callback(400, {error: 'Email is missing or invalid!'});
    }
};

//Shopping cart will aggregate menu items one at a time or several at a time
//it will be an array on the user object that will be cleaned out once the order is placed, and stored in the orders file
handlers.cart = (data, callback) => {
    const supportedMethods = ['get', 'post', 'put', 'delete'];
    if (supportedMethods.indexOf(data.method) > -1) {
        handlers._cart[data.method](data, callback);
    } else {
        callback(405); //method not allowed
    }
};

handlers._cart = {};

//Required --> email, authtoken, atleast one item from the menu
handlers._cart.post = (data, callback) => {
    let {email, cartItems} = data.payload;
    email = typeof(email) == 'string' && email.trim().length > 0 ? email.trim() : false;
    cartItems = typeof(cartItems) == 'object' && cartItems instanceof Array && cartItems.length > 0 ? cartItems : false;
    //normalize the input
    cartItems = cartItems.map(item => item.toLowerCase());

    if (email && cartItems) {
        //verify the token
        const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
        handlers._tokens.verifyToken(token, email, tokenIsValid => {
            if (tokenIsValid) {
                //create the shopping cart instance, and add an ID of it to the userObject
                read('users', email, (err, userData) => {
                    if (!err && userData) {
                        //see if user already has cart ID's, if not initialize it with an ampty array
                        const cartIds = typeof(userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
                        let totalPrice = 0;
                        const cartId = createRandomToken(20);
                        const shoppingCart = [];
                        //now figure out what the person placed in their cart off of the menu
                        read('menuItems', 'menu', (err, menuItems) => {
                            if (!err && menuItems) {
                                for (i = 0; i < menuItems.length; i++) {
                                    if (cartItems.indexOf(menuItems[i].name) > -1) {
                                        shoppingCart.push(menuItems[i]);
                                        totalPrice += menuItems[i].price;
                                    }
                                }

                                if (shoppingCart.length > 0) {
                                    const cartData = {
                                        id: cartId,
                                        items: shoppingCart,
                                        userEmail: email,
                                        total: totalPrice,
                                        purchased: false
                                    };
                                    //store the cart instance in its own db and put a reference to the ID on the user object
                                    create('cart', cartId, cartData, err => {
                                        if (!err) {
                                            cartIds.push(cartId);
                                            userData.cart = cartIds,
                                            update('users', email, userData, err => {
                                                if (!err) {
                                                    callback(200, cartData);
                                                } else {
                                                    callback(500, {error: 'Could not update the user\'s shopping cart.'});
                                                }
                                            });
                                        } else {
                                            callback(500, {error: ' Could not save the cart to the database'});
                                        }
                                    });
                                } else {
                                    callback(400, {error: 'Please make sure you are chosing items off of the menu!'});
                                }

                            } else{
                                callback(500);
                            }
                        });
                    } else {
                        callback(404, {error: 'User not found.'});
                    }
                });
            } else {
                callback(403, {error: 'Invalid or expired token.'});
            }
        });

    } else {
        callback(400, {error: 'Missing or invalid required fields. Please chose at least one item from the menu to add to the shopping cart!'})
    }
};

//Required --> authToken, cartId
handlers._cart.get = (data, callback) => {
    const cartId = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == authTokenLength ? data.queryStringObj.id.trim() : false;
    if (cartId) {
        //read in the cart data to verify the email against the token
        read('cart', cartId, (err, cartData) => {
            if (!err && cartData) {

                const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == 20 ? data.headers.id.trim() : false;
                handlers._tokens.verifyToken(token, cartData.userEmail, tokenIsValid => {
                    if (tokenIsValid) {
                        //send the user their cart information
                        callback(200, cartData);
                    } else {
                        callback(403, {error: 'Token is missing or invalid!'});
                    }
                });
            } else {
                callback(404, {error: 'Cart not found'});
            }

        });

    } else {
        callback(400, {error: 'Invalid or Missing cart id.'});
    }
};

//Users can update an instance of a cart 
//Required --> cart id auth token atleast one item in the cartItems array
handlers._cart.put = (data, callback) => {
    const cartId = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == authTokenLength ? data.payload.id.trim() : false;
    let cartItems = typeof(data.payload.cartItems) == 'object' && data.payload.cartItems instanceof Array && data.payload.cartItems.length > 0 ? data.payload.cartItems : false;
    //normalize the input
    cartItems = cartItems.map(item => item.toLowerCase());
    if (cartId && cartItems) {
        read('cart', cartId, (err, cartData) => {
            if (!err && cartData) {
                //verify the token
                const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == 20 ? data.headers.id.trim() : false; ;
                handlers._tokens.verifyToken(token, cartData.userEmail, tokenIsValid => {
                    if (tokenIsValid) {
                        let totalPrice = 0;
                        const shoppingCart = [];
                        //now figure out what the person placed in their cart off of the menu
                        read('menuItems', 'menu', (err, menuItems) => {
                            if (!err && menuItems) {
                                for (i = 0; i < menuItems.length; i++) {
                                    if (cartItems.indexOf(menuItems[i].name) > -1) {
                                        shoppingCart.push(menuItems[i]);
                                        totalPrice += menuItems[i].price;
                                    }
                                }

                                if (shoppingCart.length > 0) {
                                    cartData.items = shoppingCart;
                                    cartData.total = totalPrice;
                                    //store the cart instance in its own db and put a reference to the ID on the user object
                                    update('cart', cartId, cartData, err => {
                                        if (!err) {
                                            callback(200, cartData);
                                        } else {
                                            callback(500, {error: 'Could not update the cart.'});
                                        }
                                    });
                                } else {
                                    callback(400, {error: 'Please make sure you are chosing items off of the menu!'});
                                }

                            } else{
                                callback(500);
                            }
                        });                    
                    } else {
                        callback(403, {error: 'missing or invalid token'});
                    }
                });
            } else {
                callback(404, {error: 'Cart not found'});
            }
        });
    } else {
        callback(400, {error: 'missing or invalid fields'});
    }
};

//Required --> cartId and authtoken
//will need to delete the cart and the id reference on the user object
handlers._cart.delete = (data, callback) => {
    const cartId = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == authTokenLength ? data.queryStringObj.id.trim() : false;
    if (cartId) {
        //read in the cart data to verify the email against the token
        read('cart', cartId, (err, cartData) => {
            if (!err && cartData) {

                const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
                handlers._tokens.verifyToken(token, cartData.userEmail, tokenIsValid => {
                    if (tokenIsValid) {
                        remove('cart', cartId, err => {
                            if (!err) {
                                //delete checkId on the user
                                read('users', cartData.userEmail, (err, userData) => {
                                    if (!err && userData) {
                                        const userCartIds = typeof(userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
                                        const idx = userCartIds.indexOf(cartId);
                                        if (idx > -1) {
                                            //remove it
                                            userCartIds.splice(idx, 1);
                                            userData.cart = userCartIds;
                                            //save the new user object
                                            update('users', cartData.userEmail, userData, err => {
                                                if (!err) {
                                                    callback(200);
                                                } else {
                                                    callback(500, {error: 'could not update the user\'s saved cart id\'s.'});
                                                }
                                            });
                                        } else {
                                            cb(500, {error: 'could not delete the cart id from the user object.'});
                                        }
                                    } else {
                                        callback(404, {error: 'user not found.'});
                                    }
                                });
                            } else {
                                callback(500, {error: 'Could not delete the cart items'});
                            }
                        });
                    } else {
                        callback(403, {error: 'Token is missing or invalid!'});
                    }
                });
            } else {
                callback(404, {error: 'Cart not found'});
            }

        });

    } else {
        callback(400, {error: 'Invalid or Missing cart id.'});
    }
};

handlers.orders = (data, callback) => {
    const supportedMethods = ['get', 'post'];
    if (supportedMethods.indexOf(data.method) > -1) {
        handlers._orders[data.method](data, callback);
    } else {
        callback(405); //method not allowed
    }
};

handlers._orders = {};

//Required --> Auth token, Cart Id, 
handlers._orders.post = (data, callback) => {
    const cartId = typeof(data.payload.cartId) == 'string' && data.payload.cartId.trim().length == 20 ? data.payload.cartId.trim() : false;

    if (cartId) {
        read('cart', cartId, (err, cartData) => {
            if (!err && cartData) {
                //verify token
                const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
                handlers._tokens.verifyToken(token, cartData.userEmail, tokenIsValid => {
                    if (tokenIsValid) {
                        //proceed with the order
                        const {userEmail, total, items} = cartData;
                        const orderId = createRandomToken(20);
                        stripePayment('usd', total, `Charge for order at Al Pacino\'s Pizza. order ID: ${orderId}`, 'tok_visa', err => {
                            if (!err) {
                                //config the order details to be saved
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
                                                        const userCart = typeof(userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
                                                        const idPos = userCart.indexOf(cartId);
                                                        const userOrders = typeof(userData.orders) == 'object' && userData.orders instanceof Array ? userData.orders : [];
                                                        if (idPos > -1) {
                                                            userCart.splice(idPos, 1); //remvoe the cart id
                                                            userOrders.push(orderId); //add refernce to the order
                                                            //update the user
                                                            userData.cart = userCart;
                                                            userData.orders = userOrders;
                                                            update('users', userEmail, userData, err => {
                                                                if (!err) {
                                                                    //email the user
                                                                    //your ourder from al pacinos pizza is finished. heres your orderId
                                                                    const subject = 'Your order has been placed';
                                                                    const text = `Payment for order ${orderId} has been accepted and your order is on the way!`
                                                                    mailgunEmail(from, userEmail, subject, text, err => {
                                                                        if (!err) {
                                                                            callback(200, orderData);
                                                                        } else {
                                                                            callback(500, {error: err});
                                                                        }
                                                                    });
                                                                } else {
                                                                    callback(500, {error: 'Could not update the user\'s information'});
                                                                }
                                                            });
                                                        }
                                                    } else {
                                                        callback(404, {error: 'Could not find a user with that email'});
                                                    }
                                                });
                                            } else {
                                                callback(500, {error: 'Could not delete reference of the cart in the database.'});
                                            }
                                        });
                                    } else {
                                        callback(500, {error: 'Error saving record of the order'});
                                    }
                                });
                            } else {
                                callback(500, {error: err});
                            }
                        });
                    } else {
                        callback(403, {error: 'Token is missing or invalid.'});
                    }
                });
            } else {
                callback(404, {error: 'Could not find a shopping cart with that Id.'});
            }
        });

    } else {
        callback(403, {error: 'Invalid or missing fields.'});
    }
};

//allow a user to get their previous orders
//Required --> Auth token, orderId
handlers._orders.get = (data, callback) => {
    const orderId = typeof(data.queryStringObj.orderId) == 'string' && data.queryStringObj.orderId.trim().length == 20 ? data.queryStringObj.orderId.trim() : false;
    if (orderId) {
        //find the order
        read('orders', orderId, (err, orderData) => {
            if (!err && orderData) {
                //check the token
                const token = typeof(data.headers.id) == 'string' && data.headers.id.trim().length == authTokenLength ? data.headers.id.trim() : false;
                handlers._tokens.verifyToken(token, orderData.userEmail, tokenIsValid => {
                    if (tokenIsValid) {
                        callback(200, orderData);
                    } else {
                        callback(403, {error: 'Missing or invalid token'});
                    }
                });
            } else {
                callback(400, {error: 'Could not find an order with that ID'});
            }
        });
    } else {
        callback(400, {error: 'Missing or invalid fields.'});
    }

};


handlers.ping = (data, callback) => {
    callback(200);
};

handlers.notFound = (data, callback) => {
    callback(404);
};

module.exports = handlers;
