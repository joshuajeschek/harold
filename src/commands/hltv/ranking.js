const Commando = require('discord.js-commando');
const levenshtein = require('js-levenshtein');
const { HLTV } = require('hltv');
const { MessageEmbed } = require('discord.js');
const default_embeds = {
    teams: require('./resources/team_ranking.json'),
    players: require('./resources/player_ranking.json'),
};

/**
 * Return the up to date ranking data of teams on hltv
 * @returns {Array} Array of Ranking Data
 */
async function getTeamRanking() {
    return await HLTV.getTeamRanking()
        .then(res => {
            return res;
        });
}

/**
 * Get the up to data player ranking data on hltv
 * @returns {Array} Array of Ranking Data
 */
async function getPlayerRanking() {
    return await HLTV.getPlayerRanking()
        .then(res => {
            return res.slice(0, 200);
        });
}

/**
 * Render Data into Embeds (Players)
 * @param {Array} ranking data from hltv
 * @returns {Array} array of Embeds
 */
function compilePlayerRankingEmbeds(ranking) {
    const embed_array = [];
    let j = 0;
    const pages = Math.ceil(ranking.length / 10);
    for (let i = 0; i < ranking.length; i++) {
        if (i % 10 === 0) {
            const embed = new MessageEmbed(default_embeds.players);
            j = embed_array.push(embed) - 1;
        }
        embed_array[j]
            .addField(`#${i + 1} - ${ranking[i].name}`, `K/D: ${ranking[i].kd}\tRating: ${ranking[i].rating}`)
            .setFooter(`page ${j + 1} of ${pages}`)
            .setTimestamp();
    }
    return embed_array;
}

/**
 * Render Data into Embeds (Teams)
 * @param {Array} ranking data from hltv
 * @returns {Array} array of Embeds
 */
function compileTeamRankingEmbeds(ranking) {
    const embed_array = [];
    let j = 0;
    const pages = Math.ceil(ranking.length / 10);
    for (let i = 0; i < ranking.length; i++) {
        if (i % 10 === 0) {
            const embed = new MessageEmbed(default_embeds.teams);
            j = embed_array.push(embed) - 1;
        }

        let rank_change = '';
        if (ranking[i].change > 0) rank_change = `+${ranking[i].change}`;
        else if (ranking[i].change < 0) rank_change = `${ranking[i].change}`;
        else rank_change = '±0';

        embed_array[j]
            .addField(`#${i + 1} - ${ranking[i].team.name}`, `Points: **${ranking[i].points}**\tRank Change: **${rank_change}**`)
            .setFooter(`page ${j + 1} of ${pages}`)
            .setTimestamp();
    }
    return embed_array;
}

module.exports = class RankingCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'ranking',
            aliases: [''],
            group: 'hltv',
            memberName: 'ranking',
            description: 'Get the current HLTV ranking of pro team or pro players.',
            examples: ['ranking teams'],
            args: [
                {
                    key: 'type',
                    label: 'type',
                    prompt: 'Do you want to get the ranking of **teams** or **players**?',
                    type: 'string',
                },
            ],
        });
    }

    async run(msg, { type }) {
        console.log('>>> ranking by', msg.author.tag);

        const cooldown = 10 * 1000 - (new Date() - this.client.last_hltv_request); // 10 seconds cooldown timer
        if (cooldown > 0) {
            msg.channel.send(`Please wait ${cooldown / 1000} seconds before using this command again.`);
            return;
        }

        msg.channel.startTyping();
        this.client.last_hltv_request = new Date();

        // figure out which type
        const teamscore = levenshtein('teams', type);
        const playerscore = levenshtein('players', type);

        // get the ranking
        let embeds;
        if (teamscore < playerscore) {
            const ranking = await getTeamRanking();
            if (!ranking || !ranking.length || ranking.length === 0) {
                msg.channel.send('HLTV is currently unavailable, please try again later.' +
                `If this keeps happening, consider contacting ${this.client.owners[0]}`);
                msg.channel.stopTyping();
                return;
            }
            embeds = compileTeamRankingEmbeds(ranking);
        }
        else {
            const ranking = await getPlayerRanking();
            if (!ranking || !ranking.length || ranking.length === 0) {
                msg.channel.send('HLTV is currently unavailable, please try again later.' +
                `If this keeps happening, consider contacting ${this.client.owners[0]}`);
                msg.channel.stopTyping();
                return;
            }
            embeds = compilePlayerRankingEmbeds(ranking);
        }

        let index = 0;

        const ranking_message = await msg.channel.send(embeds[index]);
        ranking_message.react('◀️');
        ranking_message.react('▶️');

        const prev_filter = (reaction, user) => reaction.emoji.name === '◀️' && user === msg.author;
        const next_filter = (reaction, user) => reaction.emoji.name === '▶️' && user === msg.author;

        const prev_collector = ranking_message.createReactionCollector(prev_filter, { time: 5 * 60 * 1000 });
        const next_collector = ranking_message.createReactionCollector(next_filter, { time: 5 * 60 * 1000 });

        next_collector.on('collect', (reaction, user) => {
            reaction.users.remove(user);
            if (index < embeds.length - 1) {
                index += 1;
                ranking_message.edit(embeds[index]);
            }
        });
        prev_collector.on('collect', (reaction, user) => {
            reaction.users.remove(user);
            if (index > 0) {
                index -= 1;
                ranking_message.edit(embeds[index]);
            }
        });

        msg.channel.stopTyping();
    }
};
