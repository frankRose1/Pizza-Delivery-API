/**
 * Helper functions used in various parts of the API
 */

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const {hashingSecret} = require('./config');
const {secret} = require('./config').stripe;
const { apiKey, from } = require('./config').mailgun;

const helpers = {};

/**
 * Hash a user's password before saving it to the system
 * @param {string} str - string to be hashed
 * @return {string} hashedPw - sha256 hashed password 
 */
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
            'currency': currency,
            'amount': amount * 100,
            'description': description,
            'source': source
        };

        //stringify the payload in to key/value pairs
        const payloadString = querystring.stringify(payload);


        //configure the request
        //stripeKey goes in the Auth headers
        const requestConfig = {
            'protocol': 'https:',
            'hostname': 'api.stripe.com',
            'method': 'POST',
            'port': 443,
            'path': '/v1/charges',
            'headers': {
                'Content-Type':'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payloadString),
                'Authorization': `Bearer ${secret}`
            }
        };


        //initiate the request
        const req = https.request(requestConfig, res => {
            const status = res.statusCode;
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Error processing the payment.');
            }
        });

        //bind to the error event
        req.on('error', err => {
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

helpers.mailgunEmail = (from, to, subject, text, callback) => {
    //check the inputs
    from = typeof(from) == 'string' && from.trim().length > 0 ? from.trim() : false;
    to = typeof(to) == 'string' && to.trim().length > 0 ? to.trim() : false;
    subject = typeof(subject) == 'string' && subject.trim().length > 0 ? subject.trim() : false;
    text = typeof(text) == 'string' && text.trim().length > 0 ? text.trim() : false;

    if (from && to && subject && text) {
        //config the payload
        const payload = {
            from,
            to,
            subject,
            text
        };
        //stringiy the payload
        const payloadString = querystring.stringify(payload);

        //config the request
        const requestConfig = {
            protocol: 'https:',
            hostname: 'api.mailgun.net',
            path: `/v3/${from}`,
            port: 443,
            method: 'POST',
            headers: {
                'Content-Type':'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payloadString),
                auth: `api:${apiKey}`
            }
        };
        const req = https.request(requestConfig, res => {
            const status = res.statusCode;
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback(`Bad response from mailgun. statusCode: ${status}`);
            }
        });
        //bind to error
        req.on('error', err => {
            callback(err);
        });
        //send  payload
        req.write(payloadString);
        //send request
        req.end();
    } else {
        callback('Required fields for sending email via mailgaun are missing or invalid');
    }

    
};

module.exports = helpers;