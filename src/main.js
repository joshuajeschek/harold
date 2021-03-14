'use strict';
require('dotenv').config();
const { exit } = require('process');
const config = require ('../config.json');

const HaroldClient = require('./modules/client/harold_client');

// instantiate a new harold client (discord + steam)
const harold = new HaroldClient({
    commandPrefix: config.prefix,
    owner: config.ids.owner,
}, {
    accountName: process.env.STEAM_NAME,
    password: process.env.STEAM_PASSWORD,
    apikey: process.env.STEAM_API_KEY,
});

// log in (discord)
if (process.argv.length < 2) {
    console.log('Please specify an application [H/T]');
    exit(1);
}
else if (process.argv[2] == 'H') {
    console.log('Logging in as BOT Harold');
    harold.login(process.env.HAROLD_TOKEN);
}
else if (process.argv[2] == 'T') {
    console.log('Logging in as Chester McTester');
    harold.login(process.env.TESTBOT_TOKEN);
}
else {
    console.log(`Invalid app provided. [${process.argv[2]}`);
    exit(1);
}
