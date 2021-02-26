/** Useful functions that are run at the startup of the discord bot */

const path = require('path');
const { exit } = require('process');
const Commando = require('discord.js-commando');
const config = require('../../config.json');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { MongoDBProvider } = require('commando-provider-mongo')

function compileMongoUrl() {
    const app = process.argv[2];
    if (!app) {
        console.log(`Invalid app provided. [${process.argv[2]}`);
        exit(1);
    }
    let url = config.discord.mongourl;
    console.log(url);
    url = url.replace('<name>', process.env.MONGO_NAME);
    url = url.replace('<password>', process.env.MONGO_PASSWORD);
    console.log(url);
    switch (app) {
        case 'T':
            url = url.replace('<app>', 'chester'); 
            return [ url, 'chester' ];
    
        case 'H':
            url = url.replace('<app>', 'harold'); 
            return [ url, 'harold' ];

        default:
            // should never occur
            break;
    }
}

module.exports = {
    /**
     * Logs the client in, depending on command line arguments
     * @param {Commando.Client} dc_client the client to log in
     */
    logIn: function (dc_client) {
        if (process.argv.length < 2) {
            console.log('Please specify an application [H/T]');
            exit(1);
        } else if (process.argv[2] == 'H') {
            console.log('Logging in as BOT Harold');
            dc_client.login(process.env.HAROLD_TOKEN);
        } else if (process.argv[2] == 'T') {
            console.log('Logging in as Chester McTester');
            dc_client.login(process.env.TESTBOT_TOKEN);
        } else {
            console.log(`Invalid app provided. [${process.argv[2]}`);
            exit(1);
        }
    },

    /**
     * Sets up the client (registry, database)
     * @param {Commando.Client} dc_client the client to set up
     */
    commandoSetup: function (dc_client) {
        dc_client.registry
            // Registers the custom command groups
            .registerGroups([
                ['util', 'Utility'],
                ['vote', 'Voting'],
            ])
            // Registers select default commands
            .registerDefaultTypes()
            .registerDefaultGroups({
                util: true,
            })
            .registerDefaultCommands({
                eval: false,
                commandState: false,
                ping: false,
                unknownCommand: false,
            })
            // Registers all of the commands in the ./commands/ directory
            .registerCommandsIn(path.join(__dirname, '../commands'));
        console.log('Loaded these commands:');
        console.log(dc_client.registry.commands.keys());
        const [ mongo_url, db_name ] = compileMongoUrl()
        console.log(mongo_url, '\n', db_name);
        dc_client
            .setProvider(
                MongoClient.connect(mongo_url).then(
                    (client) => new MongoDBProvider(client, db_name)
                )
            )
            .catch(console.error);
    },
};
