/**
 * Set up configuration for the environment
 *  //defaults to staging if not set using NODE_ENV=production
 */

 //TODO: will need to do the same for mailgun
const {stripePublishable, stripeSecret} = require('./stripeKeys');
const environments = {};

environments.staging = {
    port: 3000,
    envName: 'staging',
    hashingSecret: 'thisIsAPassword',
    authTokenLength: 20,
    stripe: {
        publishable: stripePublishable,
        secret: stripeSecret
    } 
};

environments.production = {
    port: 5000,
    envName: 'production',
    hashingSecret: 'thisIsAlsoAPassword',
    authTokenLength: 20,
    stripe: {
        publishable: stripePublishable,
        secret: stripeSecret
    } 
};

//check to see if process.env has been set in the command line
const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV : '';

//see if that environment is available, if not default to staging
const envToExport = typeof(environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging;

module.exports = envToExport;