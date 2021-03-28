'use strict';
const { MessageEmbed } = require('discord.js');
const Commando = require('discord.js-commando');
const getTeamLogo = require('./modules/team_logo');

module.exports = class ProCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'pro',
            group: 'hltv',
            memberName: 'pro',
            description: 'Get information about a pro player',
            examples: ['pro'],
            args: [
                {
                    key: 'name',
                    label: 'name',
                    prompt: 'Which pro player do you want to get info about?',
                    type: 'string',
                    default: 'xyp9x',
                },
            ],
        });
        this.getTeamLogo = getTeamLogo.bind(this);
    }

    /**
     * creates an embed about a pro player with the provided data
     * @param {Object} player_data the data about a pro player
     * @returns {MessageEmbed} the created embed
     */
    async compileEmbed(player_data) {
        const embed = new MessageEmbed()
            .setTimestamp()
            .setTitle(player_data.name)
            .setImage(player_data.image)
            .setAuthor('HLTV', 'https://cdn.discordapp.com/attachments/815232183387029534/823515472800383006/hltv.png', 'https://www.hltv.org/');


        let description = '';
        if (player_data.age) {
            description += `Age: ${player_data.age}\n`;
        }
        if (player_data.country) {
            description += `Country: ${player_data.country.name} :flag_${player_data.country.code.toLowerCase()}:\n`;
        }
        if (player_data.team) {
            description += `Team: [${player_data.team.name}](https://www.hltv.org/team/${player_data.team.id}/harold)`;
        }

        if (description.length != 0) embed.addField(player_data.ign, description, true);

        let socials = '';
        if (player_data.twitter) socials += `<:twitter:823246737305108501> [Twitter](${player_data.twitter})`;
        if (player_data.twitch) socials += `\n<:twitch:823246733780844616> [Twitch](${player_data.twitch})`;
        if (player_data.facebook) socials += `\n<:facebook:823246734037614602> [Facebook](${player_data.facebook})`;
        if (player_data.instagram) socials += `\n<:instagram:823246969601916929> [Instagram](${player_data.instagram})`;

        if (socials.length != 0) embed.addField('Socials:', socials, true);
        embed.addField('\u200b', '\u200b');

        if (player_data.statistics) {
            const stats_0 = `
                Rating:
                Headshots:
                K/D Ratio:
    
                *Average per round:*
                Damage:
                Kills:
                Assists:
                Deaths:
                Grenade Damage:
            `;

            const stats_1 = `
                ${player_data.statistics.rating}
                ${player_data.statistics.headshots}
                ${player_data.statistics.kdRatio}
    
    
                ${player_data.statistics.damagePerRound}
                ${player_data.statistics.killsPerRound}
                ${player_data.statistics.assistsPerRound}
                ${player_data.statistics.deathsPerRound}
                ${player_data.statistics.grenadeDamagePerRound}
            `;

            embed.addField('Stats:', stats_0, true);
            embed.addField('\u200b', stats_1, true);
        }

        if (player_data.team) {
            const logo = await this.getTeamLogo(player_data.team.id);
            embed
                .setThumbnail(logo.url)
                .setColor(logo.color);
        }

        return embed;
    }

    async run(msg, { name }) {
        console.log('>>> pro by', msg.author.tag);

        const cooldown = 10 * 1000 - (new Date() - this.client.hltv.last_request); // 10 seconds cooldown timer
        if (cooldown > 0) {
            msg.channel.send(`Please wait ${cooldown / 1000} seconds before using this command again.`);
            return;
        }

        msg.channel.startTyping();
        this.client.hltv.last_request = new Date();

        const player_data = await this.client.hltv.getPlayerData(name);
        // PLAYERNOTFOUND -> suggestions
        if (!player_data) {
            msg.channel.send(`Could not find player ${name}.`);
            msg.channel.stopTyping();
            return;
        }
        else if (Array.isArray(player_data)) {
            let answer = `Could not find player ${name}.`;

            if (player_data.length > 0) {
                answer += ' Do you mean:\n';
            }
            for (let i = 0; i < player_data.length && i < 5; i++) {
                answer += `\`${player_data[i][1]}\`\n`;
            }

            msg.channel.send(answer);
            msg.channel.stopTyping();
            return;
        }
        else if (player_data === 'HLTVUNAVAILABLE') {
            msg.channel.send('HLTV is currently unavailable, please try again later.' +
                `If this keeps happening, consider contacting ${this.client.owners[0]}`);
            msg.channel.stopTyping();
            return;
        }

        const embed = await this.compileEmbed(player_data);

        msg.channel.send(embed);
        msg.channel.stopTyping();
    }
};
