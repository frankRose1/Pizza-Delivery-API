/**
 * Helper functions used in various parts of the API
 */

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const {hashingSecret} = require('./config');
const {publishable, secret} = require('./config').stripe;

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

//Send a request to the stripe API to process the payment
helpers.stripePayment = (currency, amount, description, source, callback) => {
    currency = typeof(currency) == 'string' && currency.trim().length > 0 ? currency : false;
    amount = typeof(amount) == 'number' && amount > 0 ? amount : false;
    description = typeof(description) == 'string' && description.trim().length > 0 ? description : false;
    ccToken = typeof(ccToken) == 'string' && ccToken.trim().length > 0 ? ccToken : false;

    if (currency && amount && description && source) {
        //config the request to stripe
        const payload = {
            currency,
            amount: amount * 100,
            description,
            source
        };

        //stringify the payload in to key/value pairs
        const payloadString = querystring.stringify(payload);


        //configure the request
        //stripeKey goes in the Auth headers
        const requestConfig = {
            protocol: 'https:',
            hostname: 'api.stripe.com',
            method: 'POST',
            port: 443,
            path:'/vi/charges',
            headers: {
                'Content-Type':'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payloadString),
                Authorization: `Bearer ${secret}`
            }
        };


        //initiate the request
        const req = https.request(requestConfig, res => {
            const status = res.statusCode;
            console.log('statuscode', status);
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Error processing the payment.');
            }
        });

        //bind to the error event
        req.on('error', err => {
            console.log('error', err);
            callback(err);
        });
        //send the payload
        req.write(payloadString);

        //send the request
        req.end();

    } else {
        callback('Required fields for processing the order are missing or invalid');
    }
};

helpers.emailUser = () => {

};

module.exports = helpers;