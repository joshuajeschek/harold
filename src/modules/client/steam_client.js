'use strict';
const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');
const SteamAPI = require('steamapi');

class SteamClient extends SteamUser {
    constructor(accountName, password, apikey) {
        super();
        this.steamListeners();
        this.logOn({
            accountName,
            password,
        });
        this.csgo = new GlobalOffensive(this);
        this.csgoListeners();
        // this.api = new SteamWebApi(apikey);
        this.api = new SteamAPI(apikey);
        // cache for player data
        this.data_cache = new Map();
    }

    async getPlayerData(SteamID64) {
        // check if there is an up-to-date entry
        if (this.data_cache.has(SteamID64)) {
            const data = this.data_cache.get(SteamID64);
            if (new Date() - data.timestamp < 15 * 60 * 1000) {
                return data; // last request is less than 15 minutes in the past
            }
        }

        const data = Promise
            .all([
                this.getUserData(SteamID64),
                this.getStatsData(SteamID64),
                this.getCSGOData(SteamID64)])
            .then((values) => {
                return {
                    ...values[0],
                    stats: values[1],
                    ...values[2],
                    timestamp: new Date(),
                };
            });

        this.data_cache.set(SteamID64, data);

        return data;
    }

    async getUserData(SteamID64) {
        return this.api
            .getUserSummary(SteamID64)
            .then(summary => {
                return {
                    name: summary.nickname,
                    gameID: summary.gameID,
                    avatar: summary.avatar,
                };
            })
            .catch(err => {
                console.log(err);
            });
    }

    async getStatsData(SteamID64) {
        return this.api
            .getUserStats(SteamID64, 730)
            .then(PlayerStats => {
                return PlayerStats.stats;
            })
            .catch(err => {
                console.log(err);
            });
    }

    async getCSGOData(SteamID64) {
        const profile = await new Promise(resolve => {
            this.csgo.requestPlayersProfile(SteamID64, resolve);
        }).then(data => {
            return data;
        });
        // should be fine without catching https://bit.ly/3lxWQTL

        const rankings = profile.rankings;
        rankings.push(profile.ranking);

        const data = {
            rankings: {
                competitive: rankings.find(element => element.rank_type_id === 6),
                wingman: rankings.find(element => element.rank_type_id === 7),
                deathmatch: rankings.find(element => element.rank_type_id === 10),
            },
            commendations: profile.commendation,
            // vac_banned: profile.vac_banned, // seems to always be null?
            player_level: profile.player_level,
            player_cur_xp: profile.player_cur_xp,
        };
        return data;
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
            console.log(
                '🎮 successfully logged onto steam as ' +
                    this._logOnDetails.account_name,
            );
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
            if (
                relationship == SteamUser.EFriendRelationship.RequestRecipient
            ) {
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
                if (
                    relationship ==
                    SteamUser.EFriendRelationship.RequestRecipient
                ) {
                    console.log('🎮 Got request from ' + sid);
                    this.befriend(sid);
                }
            }
        });

        // msg from vanitasboi
        this.on('friendMessage#76561198814489169', async (steamID, message) => {
            if (message.startsWith('echo')) {
                this.chatMessage(steamID, message);
            }
        });
    }
}

module.exports = SteamClient;
