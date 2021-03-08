'use strict';
const Commando = require('discord.js-commando');
const config = require('../../config.json');
const SteamInteraction = require('./steam/steam_interaction');
const { FriendlyError } = require('discord.js-commando');
const { compileMongoUrl } = require('./mongo');
const path = require('path');
const { MongoClient } = require('mongodb');
const { MongoDBProvider } = require('commando-provider-mongo');


class HaroldClient {
    constructor() {
        this.dc_client = new Commando.Client({
            owner: config.discord.owner,
            commandPrefix: config.discord.prefix,
        });

        this.steam_client = new SteamInteraction();
    }

    connect(token) {
        this.steam_client.connect();
        this.discordEvents();
        this.commandoSetup();
        this.dc_client.login(token);
    }

    discordEvents() {
        /* Logs if bot is ready */
        this.dc_client.on('ready', () => {
            console.log(`💬 Logged in as ${this.dc_client.user.tag}!`);
            this.dc_client.user.setActivity('Counter-Strike: Global Offensive', {
                type: 'PLAYING',
            });
        });

        /* Logging of DM Messages */
        this.dc_client.on('message', (msg) => {
            if (msg.channel.type === 'dm' && msg.author != this.dc_client.user) {
                console.log(`>>> [DM] ${msg.author.tag}: ${msg.content}`);
            }
        });

        this.dc_client.on('commandError', (cmd, err) => {
            if (err instanceof FriendlyError) return;
            console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
        });
    }

    commandoSetup() {
        this.dc_client.registry
            // Registers the custom command groups
            .registerGroups([
                ['util', 'Utility'],
                ['vote', 'Voting'],
            ])
            // Registers select default commands
            .registerDefaultTypes()
            .registerDefaultGroups()
            .registerDefaultCommands({
                ping: false,
                unknownCommand: false,
            })
            // Registers all of the commands in the ./commands/ directory
            .registerCommandsIn(path.join(__dirname, '../commands'));
        console.log('Loaded these commands:');
        console.log(this.dc_client.registry.commands.keys());
        const [ mongo_url, db_name ] = compileMongoUrl();
        this.dc_client
            .setProvider(
                MongoClient.connect(mongo_url, { useUnifiedTopology: true }).then(
                    (client) => new MongoDBProvider(client, db_name),
                ),
            )
            .catch(console.error);
    }
}

module.exports = HaroldClient;
