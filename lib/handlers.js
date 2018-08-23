/**
 * Handle all routing of requests here
 * All handlers take two parameters
 *      1) Data ==> which is parsed from the users request(method, path, payload, etc)
 *      2) Callback function ==> the response we are sending to the user
 */

const {create, read, update, remove} = require('./data');
const {hashString, createRandomToken} = require('./helpers');
const {authTokenLength} = require('./config');

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
    let { firstName, lastName, email, street, password, tosAgreement } = data.payload;
    firstName = typeof(firstName) == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
    lastName = typeof(lastName) == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
    email = typeof(email) == 'string' && email.trim().length > 0 ? email.trim() : false;
    street = typeof(street) == 'string' && street.trim().length > 0 ? street.trim() : false;
    password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;
    tosAgreement = typeof(tosAgreement) == 'boolean' && tosAgreement == true ? true : false;

    if (firstName && lastName && email && street && password && tosAgreement) {
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
        callback(400, {error: 'Please fill out the required fields!'});
    }
};

//Required -> email
//TODO: require auth for a user to get info about a profile
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
        callback(404, {error: 'Missing or invalid token.'});
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

handlers.ping = (data, callback) => {
    callback(200);
};

handlers.notFound = (data, callback) => {
    callback(404);
};

module.exports = handlers;

// 3. When a user is logged in, they should be able to GET all the possible menu items (these items can be hardcoded into the system). 