/** Useful functions that are run at the startup of the discord bot */

const path = require('path');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const { exit } = require('process');
const Commando = require('discord.js-commando');
const config = require('../../config.json');


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
            dc_client.login(config.discord.tokens['BOT Harold']);
        } else if (process.argv[2] == 'T') {
            console.log('Logging in as Chester McTester');
            dc_client.login(config.discord.tokens['Chester McTester']);
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
            .registerGroups([['util', 'Utility']])
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
        dc_client
            .setProvider(
                sqlite
                    .open({ filename: 'database.db', driver: sqlite3.Database })
                    .then((db) => new Commando.SQLiteProvider(db))
            )
            .catch(console.error);
    }
};
