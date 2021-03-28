'use strict';
const path = require('path');

const { Client, FriendlyError } = require('discord.js-commando');
const { User } = require('discord.js');
const { MongoClient } = require('mongodb');
const { MongoDBProvider } = require('commando-provider-mongo');

const SteamClient = require('./steam_client');
const HLTVClient = require('./hltv_client');

const { compileMongoUrl } = require('./../mongo');
const { deleteEntry } = require('./../steam/id-lookup');


class HaroldClient extends Client {
    constructor(discord_options, { accountName, password, apikey }) {
        super(discord_options);
        this.commandoSetup();
        this.discordListeners();
        this.steam = new SteamClient(accountName, password, apikey);
        this.steamListeners();
        this.hltv = new HLTVClient();
        this.last_hltv_request = new Date(1946, 8, 6); // the show must go on
    }

    commandoSetup() {
        this.registry
        // Registers the custom command groups
            .registerGroups([
                ['util', 'Utility'],
                ['vote', 'Voting'],
                ['steam', 'Steam'],
                ['csgo', 'CS:GO'],
                ['hltv', 'HLTV'],
            ])
        // Registers select default commands
            .registerDefaultTypes()
            .registerDefaultGroups()
            .registerDefaultCommands({
                ping: false,
                unknownCommand: false,
            })
        // Registers all of the commands in the ./commands/ directory
            .registerCommandsIn(path.join(__dirname, '../../commands'));

        console.log('💬 Loaded these commands:');

        console.log(this.registry.commands.keys());
        const [ mongo_url, db_name ] = compileMongoUrl();
        this
            .setProvider(
                MongoClient.connect(mongo_url, { useUnifiedTopology: true }).then(
                    (client) => new MongoDBProvider(client, db_name),
                ),
            )
            .catch(console.error);
    }

    discordListeners() {
        // EVENT LISTENERS //
        this.on('ready', () => {
            console.log(`💬 Logged in as ${this.user.tag}!`);
            this.user.setActivity('Counter-Strike: Global Offensive', {
                type: 'PLAYING',
            });
        });

        /* Logging of DM Messages */
        this.on('message', (msg) => {
            if (msg.channel.type === 'dm' && msg.author != this.user) {
                console.log(`>>> [DM] ${msg.author.tag}: ${msg.content}`);
            }
        });

        /* Friendly Error Logging */
        this.on('commandError', (cmd, err) => {
            if (err instanceof FriendlyError) return;
            console.error(`💬 Error in command ${cmd.groupID}:${cmd.memberName}`, err);
        });
    }

    steamListeners() {
        this.steam.on('unfriended', async (SteamID) => {
            const { DiscordID = false } = await deleteEntry(false, SteamID);
            if (DiscordID) {
                const dc_user = new User(this, { id: DiscordID });
                await dc_user.createDM();
                dc_user.dmChannel.send('Hey, you unfriended me on discord. ' +
                    'You are now disconnected. ' +
                    'It might take a while until the changes take effect.',
                );
                console.log('Got unfriended, and sent an info message to the user');
            }
            else {
                console.log('Got unfriended, but there was no connection');
            }
        });
    }
}


module.exports = HaroldClient;
