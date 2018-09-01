/**
 * Server related tasks for the API
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const {StringDecoder} = require('string_decoder');
const util = require('util');
const debug = util.debuglog('server'); //NODE_DEBUG=server
const handlers = require('./handlers');
const helpers = require('./helpers');
const config = require('./config');

const server = {};

server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

const httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};

server.httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
});

//All logic for both the http and https server
server.unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    //get the pathanme and trim off the forward and ending slashes
    const urlPath = parsedUrl.pathname;
    const trimmedPath = urlPath.replace(/^\/+|\/+$/g, '');

    //.query will give key value pairs regarding the querys in the url, if any are present
    const queryStringObj = parsedUrl.query;
    
    //get the method and normalzie it
    const method = req.method.toLowerCase();

    //get headers as key/value pairs
    const headers = req.headers;

    //get the payload, if any. 
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    //cap off the payload and route the request
    req.on('end', () => {
        buffer += decoder.end();
        
        const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
        //configure the data to be sent to the handlers
        const requestData = {
            trimmedPath,
            queryStringObj,
            method,
            headers,
            payload: helpers.parseJsonToObj(buffer)
        };

        //call the handler
        //the callback will: 1) have a statusCode to be sent and 2) a potential payload that we send back to the user
        chosenHandler(requestData, (statusCode, payload) => {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};
            const payloadStr = JSON.stringify(payload);

            //send response to user
            res.setHeader('Content-type', 'application/json'); //tell the browser we're using json
            res.writeHead(statusCode);
            res.end(payloadStr);

            //log in green if statusCode == 200, else log in red
            if (statusCode == 200) {
                debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
            } else {
                debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
            }
        });

    });
};

//route the request to a handler
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'menu': handlers.menu,
    'cart': handlers.cart,
    'orders': handlers.orders
};

server.init = () => {
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m', `HTTP Server is listening on port: ${config.httpPort}`);
    });

    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[36m%s\x1b[0m', `HTTPS Server is listening on port: ${config.httpsPort}`);
    });
};

module.exports = server;
