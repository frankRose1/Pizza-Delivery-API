/**
 * Set up configuration for the environment
 *  //defaults to staging if not set using NODE_ENV=production
 */

const {stripePublishable, stripeSecret, mailGunKey, mailGunDomain} = require('./apiKeys');
const environments = {};

environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'thisIsAPassword',
    authTokenLength: 20,
    stripe: {
        publishable: stripePublishable,
        secret: stripeSecret
    },
    mailgun: {
        from: mailGunDomain,
        apiKey: mailGunKey
    }
};

environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production',
    hashingSecret: 'thisIsAlsoAPassword',
    authTokenLength: 20,
    stripe: {
        publishable: stripePublishable,
        secret: stripeSecret
    },
    mailgun: {
        from: mailGunDomain,
        apiKey: mailGunKey
    }
};

//check to see if process.env has been set in the command line
const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV : '';

//see if that environment is available, if not default to staging
const envToExport = typeof(environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging;

module.exports = envToExport;