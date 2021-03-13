'use strict';
const path = require('path');

const { Client, FriendlyError } = require('discord.js-commando');
const { User } = require('discord.js');
const { MongoClient } = require('mongodb');
const { MongoDBProvider } = require('commando-provider-mongo');

const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');

const { compileMongoUrl } = require('./mongo');
const { deleteEntry } = require('./steam/id-lookup');


class HaroldClient extends Client {
    discordSetup() {
        this.registry
        // Registers the custom command groups
            .registerGroups([
                ['util', 'Utility'],
                ['vote', 'Voting'],
                ['steam', 'Steam'],
                ['csgo', 'CS:GO'],
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

    connectToSteam(accountName, password) {
        this.steam = new SteamUser();

        // EVENT LISTENERS //
        this.steam.on('loggedOn', () => {
            this.steam.setPersona(SteamUser.EPersonaState.Online);
            this.steam.gamesPlayed(730);
            console.log('🎮 successfully logged onto steam as ' + this.steam._logOnDetails.account_name);
            this.steam.isOnline = true;
        });

        this.steam.on('disconnected', (_, msg) => {
            console.log('🎮 Disconnected, reason: ' + msg);
            this.steam.isOnline = false;
        });

        this.steam.on('error', (error) => {
            console.log(error);
        });

        this.steam.on('friendRelationship', async (sid, relationship) => {
            console.log(relationship);
            // user requested
            if (relationship == SteamUser.EFriendRelationship.RequestRecipient) {
                console.log('🎮 Got request from ' + sid);
                this.steamBefriend(sid);
            }
            // unfriended
            else if (relationship == SteamUser.EFriendRelationship.None) {
                console.log('🎮 Got unfriended by ' + sid);
                const { DiscordID = false } = await deleteEntry(false, sid);
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
            }
            // befriended
            else if (relationship == SteamUser.EFriendRelationship.Friend) {
                console.log('🎮 Befriended ' + sid);
                this.steam.chatMessage(
                    sid,
                    'Hey, thanks for adding me! ' +
                    '\nPlease state your private token. ' +
                    '\nIf you dont have a token, use the `connect` command on Discord.',
                );
            }
        });

        this.steam.on('friendsList', () => {
            for (const [sid, relationship] of Object.entries(this.steam.myFriends)) {
                if (relationship == SteamUser.EFriendRelationship.RequestRecipient) {
                    console.log('🎮 Got request from ' + sid);
                    this.steamBefriend(sid);
                }
            }
        });

        // msg from vanitasboi
        this.steam.on('friendMessage#76561198814489169', async (steamID, message) => {
            if (message.startsWith('echo')) {
                this.steam.chatMessage(
                    steamID,
                    message,
                );
            }
        });

        this.steam.logOn({
            accountName,
            password,
        });
    }

    connectToCSGO() {
        this.csgo = this.csgo = new GlobalOffensive(this.steam);

        this.csgo.on('connectedToGC', () => {
            console.log('🎮 Connected to Game Coordinator');
        });
    }

    steamBefriend(sid) {
        this.steam.addFriend(sid, (err) => {
            if (err) {
                console.log('🎮 An error occured while adding ' + sid);
            }
        });
    }
}

module.exports = HaroldClient;
