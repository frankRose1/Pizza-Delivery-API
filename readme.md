# API for a Pizza Delivery Company
This is the backend for a pizza delivery company where users can sign up, add items to a cart, and place/view orders. Authorization is included.

## Testing Stripe Payments
You will need your own API keys from stripe if you wish to test the ```orders.post``` handler
* cd in to the root directory of the project
* In the command line: ```touch lib/apiKeys.js```
* The contents of apiKeys.js should look like this:
```javascript
const apiKeys = {
    stripePublishable: 'your_publishable_key',
    stripeSecret: 'your_secret_key'
};

module.exports = apiKeys;
```
* The imports and everything else regarding the API keys is already set up so this is all you'll need to do