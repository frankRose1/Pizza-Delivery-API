/**
 * Handle all routing of requests here
 * All handlers take two parameters
 *      1) Data ==> which is parsed from the users request(method, path, payload, etc)
 *      2) Callback function ==> the response we are sending to the user
 */

//TODO: ADD auth so that only valid users can interact with their acccount
const {create, read, update, remove} = require('./data');
const {hashString} = require('./helpers');

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

//container for sub handlers
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
        callback(400, {error: 'Email is missing or invalid.'});
    }
};

//Required -> email
// atleast one of the followng must be provided firstName, lastName, street, password
//TODO: require auth to update a user profile
handlers._users.put = (data, callback) => {
    const email = typeof(data.queryStringObj.email) == 'string' && data.queryStringObj.email.trim().length > 0 ? data.queryStringObj.email : false;
    //optional fields to be updated
    let {firstName, lastName, street, password} = data.payload;
    firstName = typeof(firstName) == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
    lastName = typeof(lastName) == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
    street = typeof(street) == 'string' && street.trim().length > 0 ? street.trim() : false;
    password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;
    if (email) {

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
        callback(400, {error: 'Email is missing or invalid!'});
    }
};

//Required -> email
//TODO: require auth to delete an account
handlers._users.delete = (data, callback) => {
    const email = typeof(data.queryStringObj.email) == 'string' && data.queryStringObj.email.trim().length > 0 ? data.queryStringObj.email : false;
    if (email) {
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
        callback(400, {error: 'Missing or invalid email'});
    }
};

handlers.ping = (data, callback) => {
    callback(200);
};

handlers.notFound = (data, callback) => {
    callback(404);
};

module.exports = handlers;

// 1. New users can be created, their information can be edited, and they can be deleted. We should store their name, email address, and street address.

// 2. Users can log in and log out by creating or destroying a token.

// 3. When a user is logged in, they should be able to GET all the possible menu items (these items can be hardcoded into the system). 