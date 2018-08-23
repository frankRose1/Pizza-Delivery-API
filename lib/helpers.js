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

helpers.createRandomToken = tokenLength => {
    tokenLength = typeof(tokenLength) == 'number' && tokenLength > 0 ? tokenLength : false;
    if (tokenLength) {
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let str = '';
        for (i = 0; i < tokenLength; i++) {
            const randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomChar;
        }
        return str;
    } else {
        return null;
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