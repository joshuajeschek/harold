'use strict';
const { HLTV } = require('hltv');
const FuzzySet = require('fuzzyset');

class HLTVClient {
    constructor() {
        this.fuzzy_players;
        this.getFuzzyPlayers();
        this.fuzzy_teams;
        this.getFuzzyTeams();
        this.last_request = new Date(1946, 8, 6);
    }

    async getFuzzyPlayers() {
        const names = await HLTV.getPlayerRanking().then(res => {
            const array = [];
            for (let i = 0; i < res.length; i++) {
                array.push(res[i].player.name);
            }
            return array;
        });
        this.fuzzy_players = FuzzySet(names);
    }

    async getFuzzyTeams() {
        const names = await HLTV.getTeamRanking().then(res => {
            const array = [];
            for (let i = 0; i < res.length; i++) {
                array.push(res[i].team.name);
            }
            return array;
        });
        this.fuzzy_teams = FuzzySet(names);
    }

    /**
    * returns data about a pro player from HLTV.ORG
    * @param {String} name the player to get data about
    * @returns {Object} The data from HLTV
    */
    async getPlayerData(name) {
        let error = false;
        const player_data = await HLTV.getPlayerByName({ name })
            .then(res => {
                return res;
            })
            .catch(err => {
                if (err.message.includes('Player', 'not found')) {
                    error = true;
                    return this.fuzzy_players.get(name);
                }
                else {
                    error = true;
                    console.log('Caught HLTV unavailable exception:', err.message);
                    return 'HLTVUNAVAILABLE';
                }
            });

        // error?
        if (error) {return player_data;}

        else {
            player_data.statistics = await HLTV.getPlayerStats({ id: player_data.id })
                .then(res => {
                    return res.statistics;
                })
                .catch(err => {
                    console.log('Caught HLTV unavailable exception:', err.message);
                    return 'HLTVUNAVAILABLE';
                });
        }

        // error?
        if (typeof player_data.statistics === 'string') {return player_data.statistics;}
        else {return player_data;}
    }

    /**
    * returns data about a pro team from HLTV.ORG
    * @param {String} name the team to get data about
    * @returns {Object} The data from HLTV
    */
    async getTeamData(name) {
        let error = false;
        let team_data = await HLTV.getTeamByName({ name })
            .then(res => {
                return res;
            })
            .catch(err => {
                if (err.message.includes('Team', 'not found')) {
                    error = true;
                    return this.fuzzy_teams.get(name);
                }
                else {
                    error = true;
                    console.log('Caught HLTV unavailable exception:', err.message);
                    return 'HLTVUNAVAILABLE';
                }
            });

        // error?
        if (error) {return team_data;}

        else {
            team_data = await HLTV.getTeamStats({ id: team_data.id })
                .then(res => {
                    return {
                        ...team_data,
                        statistics: res.overview,
                        mapStats: res.mapStats,
                        standins: res.standins,
                        historicPlayers: res.historicPlayers,
                    };
                })
                .catch(err => {
                    console.log('Caught HLTV unavailable exception:', err.message);
                    return 'HLTVUNAVAILABLE';
                });
        }

        // error?
        if (typeof team_data.statistics === 'string') {return team_data.statistics;}
        else {return team_data;}
    }

    /**
    * returns data about a match from HLTV.ORG
    * @param {Number} name the match to get data about (id)
    * @returns {Object} The data from HLTV
    */
    async getMatchData(id) {
        let error = false;
        const match_data = await HLTV.getMatchStats({ id: id })
            .then(res => {
                return res;
            })
            .catch(err => {
                error = true;
                console.log('Caught HLTV unavailable exception:', err.message);
                return 'HLTVUNAVAILABLE';
            });

        // error?
        if (error) {return match_data;}

        return match_data;
    }
}

module.exports = HLTVClient;
