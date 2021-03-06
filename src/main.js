const HaroldClient = require('./modules/harold_client');
const { exit } = require('process');
require('dotenv').config();

// instantiate a new harold client (discord + steam)
const harold = new HaroldClient();

// log them in
if (process.argv.length < 2) {
    console.log('Please specify an application [H/T]');
    exit(1);
} else if (process.argv[2] == 'H') {
    console.log('Logging in as BOT Harold');
    harold.connect(process.env.HAROLD_TOKEN);
} else if (process.argv[2] == 'T') {
    console.log('Logging in as Chester McTester');
    harold.connect(process.env.TESTBOT_TOKEN);
} else {
    console.log(`Invalid app provided. [${process.argv[2]}`);
    exit(1);
}
