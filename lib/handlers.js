/**
 * Handle all routing of requests here
 * All handlers take two parameters
 *      1) Data ==> which is parsed from the users request(method, path, payload, etc)
 *      2) Callback function ==> the response we are sending to the user
 */
const handlers = {};

//need to figure out what method was used
    //set u parent route for each category that branches off to handle each of the crud operations

handlers.ping = (data, callback) => {
    callback(200);
};

handlers.hello = (data, callback) => {
    callback(200, {hello: 'hellooooo worllddd!!!!'});
};

module.exports = handlers;