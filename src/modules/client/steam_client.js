'use strict';
const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');

class SteamClient extends SteamUser {
    constructor(accountName, password, apikey) {
        super();
        this.apikey = apikey;
        this.steamListeners();
        this.logOn({
            accountName,
            password,
        });
        this.csgo = new GlobalOffensive(this);
        this.csgoListeners();
    }

    befriend(sid) {
        this.addFriend(sid, (err) => {
            if (err) {
                console.log('🎮 An error occured while adding ' + sid);
            }
            else {
                console.log('🎮 Added ' + sid);
            }
        });
    }

    csgoListeners() {
        this.csgo.on('connectedToGC', () => {
            console.log('🎮 Connected to Game Coordinator');
        });
    }

    steamListeners() {
        // EVENT LISTENERS //
        this.on('loggedOn', () => {
            this.setPersona(SteamUser.EPersonaState.Online);
            this.gamesPlayed(730);
            console.log('🎮 successfully logged onto steam as ' + this._logOnDetails.account_name);
            this.isOnline = true;
        });

        this.on('disconnected', (_, msg) => {
            console.log('🎮 Disconnected, reason: ' + msg);
            this.isOnline = false;
        });

        this.on('error', (error) => {
            console.log(error);
        });

        this.on('friendRelationship', async (sid, relationship) => {
            console.log(relationship);
            // user requested
            if (relationship == SteamUser.EFriendRelationship.RequestRecipient) {
                console.log('🎮 Got request from ' + sid);
                this.befriend(sid);
            }
            // unfriended
            else if (relationship == SteamUser.EFriendRelationship.None) {
                console.log('🎮 Got unfriended by ' + sid);
                this.emit('unfriended', sid);
            }
            // befriended
            else if (relationship == SteamUser.EFriendRelationship.Friend) {
                console.log('🎮 Befriended ' + sid);
                this.chatMessage(
                    sid,
                    'Hey, thanks for adding me! ' +
                    '\nPlease state your private token. ' +
                    '\nIf you dont have a token, use the `connect` command on Discord.',
                );
            }
        });

        this.on('friendsList', () => {
            for (const [sid, relationship] of Object.entries(this.myFriends)) {
                if (relationship == SteamUser.EFriendRelationship.RequestRecipient) {
                    console.log('🎮 Got request from ' + sid);
                    this.befriend(sid);
                }
            }
        });

        // msg from vanitasboi
        this.on('friendMessage#76561198814489169', async (steamID, message) => {
            if (message.startsWith('echo')) {
                this.chatMessage(
                    steamID,
                    message,
                );
            }
        });
    }
}


module.exports = SteamClient;
