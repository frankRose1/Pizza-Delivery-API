/**
 * Helper functions used in various parts of the API
 */

const crypto = require('crypto');
const {hashingSecret} = require('./config');

const helpers = {};

//takes in a string input and returns a hashed version of it
helpers.hashString = str => {
    if (typeof(str) == 'string' && str.length > 0) {
        const hashedPw = crypto.createHmac('sha256', hashingSecret)
                                    .update(str)
                                    .digest('hex');
        return hashedPw;
    } else {
        return false;
    }
};

//used when we are parsing the payload on the initial request from the user
//if we try to parse anything but a string an error will be thrown
helpers.parseJsonToObj = str => {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
};

module.exports = helpers;