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