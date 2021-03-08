'use strict';

const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');
require('dotenv').config();

class SteamInteraction extends SteamUser {
    connect() {
        this.csgo = new GlobalOffensive(this);

        this.on('loggedOn', () => {
            this.setPersona(SteamInteraction.EPersonaState.Online);
            this.gamesPlayed(730);
            console.log('🎮 successfully logged onto steam as ' + this._logOnDetails.account_name);
        });

        this.on('error', (error) => {
            console.log(error);
        });

        this.csgo.on('connectedToGC', () => {
            console.log('🎮 Connected to Game Coordinator');
        });

        this.logOn({
            accountName: process.env.STEAM_NAME,
            password: process.env.STEAM_PASSWORD,
        });
    }

    getPlayerInfo(steamID, callback) {
        if(!this.csgo.haveGCSession) return undefined;

        this.csgo.requestPlayersProfile(steamID, (profile) => {
            callback(profile);
        });
    }
}

module.exports = SteamInteraction;