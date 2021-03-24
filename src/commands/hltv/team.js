const { MessageEmbed } = require('discord.js');
const Commando = require('discord.js-commando');
const { HLTV } = require('hltv');
const FuzzySet = require('fuzzyset');
const getTeamLineup = require('./modules/team_lineup');
const getTeamLogo = require('./modules/team_logo');


/**
 * returns data about a pro team from HLTV.ORG
 * @param {String} name the team to get data about
 * @returns {Object} The data from HLTV
 */
async function getTeamData(name) {
    let team_data = await HLTV.getTeamByName({ name })
        .then(res => {
            return res;
        })
        .catch(err => {
            if (err.message.includes('Team', 'not found')) {
                return 'TEAMNOTFOUND';
            }
            else {
                console.log('Caught HLTV unavailable exception:', err.message);
                return 'HLTVUNAVAILABLE';
            }
        });

    // error?
    if (typeof team_data === 'string') {return team_data;}

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

module.exports = class TeamCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'team',
            group: 'hltv',
            memberName: 'team',
            description: 'Get info about a pro team listed on hltv.org',
            examples: ['team'],
            args: [
                {
                    key: 'name',
                    label: 'team',
                    prompt: 'What team would you like to get info about?',
                    type: 'string',
                    default: 'astralis',
                },
            ],
        });
        this.getTeamLineup = getTeamLineup.bind(this);
        this.getTeamLogo = getTeamLogo.bind(this);
        this.refreshTeamList();
    }

    async refreshTeamList() {
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
     * compiles an embed based on team data from hltv.org
     * @param {Object} team_data data about a pro team
     * @returns {MessageEmbed}
     */
    async compileTeamEmbed(team_data) {
        let checksum = 0;
        for (let i = 0; team_data.players && i < team_data.players.length; i++) {
            checksum += team_data.players[i].id;
        }

        const lineup = (await this.getTeamLineup(team_data.id, checksum)).url;
        const logo = await this.getTeamLogo(team_data.id);

        let description = '';
        if (team_data.rank) description += `Rank: **#${team_data.rank}**`;
        if (team_data.location) description += `\nLocation: **${team_data.location}**`;
        if (team_data.twitter) description += `\n<:twitter:823246737305108501> [Twitter](${team_data.twitter})`;
        if (team_data.facebook) description += `\n<:facebook:823246734037614602> [Facebook](${team_data.facebook})`;
        if (team_data.instagram) description += `\n<:instagram:823246969601916929> [Instagram](${team_data.instagram})`;

        let roster = '';
        if (team_data.players) {
            for (let i = 0; i < team_data.players.length; i++) {
                roster += '**' + team_data.players[i].name + '**\n';
            }
        }

        let standins = '';
        if (team_data.standins) {
            for (let i = 0; i < team_data.standins.length; i++) {
                standins += team_data.standins[i].name + '\n';
            }
        }

        let historic = '';
        if (team_data.historicPlayers) {
            for (let i = 0; i < team_data.historicPlayers.length; i++) {
                historic += team_data.historicPlayers[i].name + '\n';
            }
        }


        const embed = new MessageEmbed()
            .setTimestamp()
            .setImage(lineup)
            .setThumbnail(logo.url)
            .setColor(logo.color)
            .setTitle(team_data.name);

        if (description.length != 0) embed.setDescription(description);
        if (roster.length != 0) embed.addField('Current Roster', roster, true);
        if (standins.length != 0) embed.addField('Standins', standins, true);
        if (historic.length != 0) embed.addField('Historic Players', historic, true);

        if (team_data.statistics) {
            embed.addField('Statistics:', `
                K/D Ratio:\n\t**${team_data.statistics.kdRatio}**
                Maps played:\n\t**${team_data.statistics.mapsPlayed}**
                Maps won:\n\t**${team_data.statistics.wins}**
                Maps tied:\n\t**${team_data.statistics.draws}**
                Maps lost:\n\t**${team_data.statistics.losses}**
            `, true);
        }

        let mapstats_0 = '';
        let mapstats_1 = '';
        if (team_data.mapStats) {
            if (team_data.mapStats.cbl) mapstats_0 += `Cobblestone:\n\t**${team_data.mapStats.cbl.winRate}%**\n`;
            if (team_data.mapStats.cch) mapstats_0 += `Cache:\n\t**${team_data.mapStats.cch.winRate}%**\n`;
            if (team_data.mapStats.d2) mapstats_0 += `Dust 2:\n\t**${team_data.mapStats.d2.winRate}%**\n`;
            if (team_data.mapStats.inf) mapstats_0 += `Inferno:\n\t**${team_data.mapStats.inf.winRate}%**\n`;
            if (team_data.mapStats.mrg) mapstats_0 += `Mirage:\n\t**${team_data.mapStats.mrg.winRate}%**\n`;
            if (team_data.mapStats.nuke) mapstats_1 += `Nuke:\n\t**${team_data.mapStats.nuke.winRate}%**\n`;
            if (team_data.mapStats.ovp) mapstats_1 += `Overpass:\n\t**${team_data.mapStats.ovp.winRate}%**\n`;
            if (team_data.mapStats.trn) mapstats_1 += `Train:\n\t**${team_data.mapStats.trn.winRate}%**\n`;
            if (team_data.mapStats.vertigo) mapstats_1 += `Vertigo:\n\t**${team_data.mapStats.vertigo.winRate}%**\n`;
        }

        if (mapstats_0.length != 0) embed.addField('Map Win Rates:', mapstats_0, true);
        if (mapstats_1.length != 0) embed.addField('\u200b', mapstats_1, true);

        let matches = '';
        if (team_data.recentResults) {
            for (let i = 0; i < team_data.recentResults.length && i < 10; i++) {
                matches += `${team_data.name} vs ${team_data.recentResults[i].enemyTeam.name}:\t**${team_data.recentResults[i].result}**\n`;
            }
        }

        if (matches.length != 0) embed.addField('Matches:', matches);

        return embed;
    }

    async run(msg, { name }) {
        console.log('>>> team by', msg.author.tag);

        const cooldown = 10 * 1000 - (new Date() - this.client.last_hltv_request); // 10 seconds cooldown timer
        if (cooldown > 0) {
            msg.channel.send(`Please wait ${cooldown / 1000} seconds before using this command again.`);
            return;
        }

        msg.channel.startTyping();
        this.client.last_hltv_request = new Date();

        const team_data = await getTeamData(name);

        if (team_data === 'TEAMNOTFOUND') {
            let answer = `Could not find team ${name}.`;

            const suggestions = this.fuzzy_teams.get(name);
            if (suggestions && suggestions.length > 0) {
                answer += ' Do you mean:\n';
            }
            for (let i = 0; suggestions && i < suggestions.length && i < 5; i++) {
                answer += `\`${suggestions[i][1]}\`\n`;
            }

            msg.channel.send(answer);
            msg.channel.stopTyping();
            return;
        }
        else if (team_data === 'HLTVUNAVAILABLE') {
            msg.channel.send('HLTV is currently unavailable, please try again later.' +
                `If this keeps happening, consider contacting ${this.client.owners[0]}`);
            msg.channel.stopTyping();
            return;
        }

        const embed = await this.compileTeamEmbed(team_data);

        msg.channel.send(embed);
        msg.channel.stopTyping();
    }
};
