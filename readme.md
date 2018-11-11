# API for a Pizza Delivery Company
This is the backend for a pizza delivery company where users can sign up, add items to a cart, and place/view orders. Authorization is included. After a token is created it will need to be sent in the Authorization headers to access protected endpoints. Background workers will run once the app starts and continue to execute once every 24 hours, deleting any expired tokens and logging any errors during the process to the ```.logs``` directory.
I also added a command line interface that will launch along with the rest of the app. Enter ```man``` or ```help``` to get a list of commands.

## Regarding API keys for Stripe & Mailgun
You will need your own API keys from stripe and mailgun if you wish to test the ```orders.post``` handler
* cd in to the root directory of the project
* In the command line: ```touch lib/apiKeys.js```
* The contents of apiKeys.js should look like this:
```javascript
const apiKeys = {
    stripePublishable: 'your publishable key',
    stripeSecret: 'your secret key',
    mailGunKey: 'your mailgun apiKey',
    mailGunDomain: 'your mailgun domain'
};

module.exports = apiKeys;
```
* The imports and everything else regarding the API keys is already set up so this is all you'll need to do

## API Features
1. New users can be created, their information can be edited, and they can be deleted. Information stored is: their name, email address, and street address.

2. Users can log in and log out by creating or destroying a token.

3. A logged in user is able to GET all the possible menu items (these items are hardcoded into the system). 

4. A logged-in user is able to fill a shopping cart with menu items

5. A logged-in user is able to create an order. Integration with Stripe is used for testing payments.

6. When an order is placed, user is emailed a receipt. Integration with Mailgun is used to email the user.

7. CLI will run in the terminal that has useful information about the application

8. Background workers will run once immediately and then again once every 24 hours, deleteing any expired tokens.
    Any errors realted to background workers are logged to the ```.logs``` directory

## Required Fields for Endpoints
1. __/users__
    * ```POST```
        * payload: 
    ```javascript
        {
            "firstName": "Jane", 
            "lastName": "Doe",
            "email": "jane@test.com",
            "street": "123 Sesame Street",
            "password": "password", /*password will be hashed*/
            "tosAgreement": true
        }
    ```
    * ```GET```
        * auth token in headers ```"Authorization": "your_token"```
        * email in queryString ```/users?email=jane@test.com"```
    * ```PUT```
        * auth token in headers ```"Authorization": "your_token"```
        * email in query string ```/users?email=jane@test.com```
        * atleast one of the following fields in the payload: ``` firstName, lastName, street, password```
    * ```DELETE```
        * auth token in headers ```"Authorization": "your_token"```
        * email in queryString ```/users?email=jane@test.com```

2. __/tokens__
    * ```POST```
        * payload: 
    ```javascript
        {
            "email": "jane@test.com",
            "password": "password"
        }
    ```
    * ```GET```
        * auth token in headers ```"Authorization": "your_token"```
    * ```PUT```
        * payload: 
        ```javascript
            {
                "token": "5a4scbros4ipp90x59vm"
                "extend": true
            }
        ```
    * ```DELETE```
        * auth token in headers ```"Authorization": "your_token"```

3. __/menu__
    * ```GET```
        * auth token in headers ```"Authorization": "your_token"```
        * email in queryString ```/menu?email=jane@test.com```

4. __/cart__
    * ```POST```
        * auth token in headers ```"Authorization": "your_token"```
        * the payload will need the users email and atleast one items from the menu stored in an array : 
        ```javascript
            {
                "email": "jane@test.com",
                "cartItems": ["plain pizza", "snapple - 16oz", "chicken parm hero"]
            }
        ```
    * ```GET```
        * auth token in headers ```"Authorization": "your_token"```
        * cart id in queryString ```/cart?cartId=j5a4scbros4ipp90x59vm```
    * ```PUT```
        * auth token in headers ```"Authorization": "your_token"```
        *  the payload must have the id of the cart you wish to update and atleast one item from the menu in the cartItems array:
        ```javascript
            {
                "cartId": "j5a4scbros4ipp90x59vm",
                "cartItems": ["meatball parm hero"]  
            }
        ```
    * ```DELETE```
        * auth token in headers ```"Authorization": "your_token"```
        * cartId in queryString ```/cart?cartId=j5a4scbros4ipp90x59vm```

5. __/orders__
    * ```POST```
        *  auth token in headers ```"Authorization": "your_token"```
        *  payload must have the cartId:
        ```javascript
            {
                "cartId": "j5a4scbros4ipp90x59vm" 
            }
        ``` 
    * ```GET```
        * auth token in headers ```"Authorization": "your_token"```
        * orderId in queryString ```/orders?orderId=jbdplstntul471buc7jm9```

