'require strict';
const { MessageEmbed } = require('discord.js');
const Commando = require('discord.js-commando');
const { HLTV } = require('hltv');
const captureWebsite = require('capture-website');

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
    }

    async run(msg, { name }) {
        console.log('>>> pro by', msg.author.tag);
        
        const cooldown = 10 * 1000 - (new Date() - this.client.last_hltv_request); // 10 seconds cooldown timer
        if (cooldown > 0) {
            msg.channel.send(`Please wait ${cooldown / 1000} seconds before using this command again.`);
            return;
        }
        else {
            this.client.last_hltv_request = new Date();
        }

        const player_data = await HLTV.getPlayerByName({ name })
            .then(res => {
                return res;
            })
            .catch(err => {
                console.log(err);
            });

        const description = `Age: ${player_data.age}\n` +
            `Country: ${player_data.country.name} :flag_${player_data.country.code.toLowerCase()}:\n` +
            `Team: [${player_data.team.name}](https://www.hltv.org/team/${player_data.team.id}/${player_data.team.name.replace(' ', '-')})`;

        const embed = new MessageEmbed()
            .setTitle(player_data.name)
            .setImage(player_data.image)
            .setTimestamp()
            .setAuthor('HLTV', 'https://cdn.discordapp.com/attachments/815232183387029534/823515472800383006/hltv.png', 'https://www.hltv.org/')
            .addField(player_data.ign, description, true);

        let socials = '';
        if (player_data.twitter) socials += `<:twitter:823246737305108501> [Twitter](${player_data.twitter})`;
        if (player_data.twitch) socials += `\n<:twitch:823246733780844616> [Twitch](${player_data.twitch})`;
        if (player_data.facebook) socials += `\n<:facebook:823246734037614602> [Facebook](${player_data.facebook})`;
        if (player_data.instagram) socials += `\n<:instagram:823246969601916929> [Instagram](${player_data.instagram})`;

        if (socials.length != 0) embed.addField('Socials:', socials, true);
        embed.addField('\u200b', '\u200b');

        const player_stats = await HLTV.getPlayerStats({ id: player_data.id })
            .then(res => {
                return res.statistics;
            })
            .catch(err => {
                console.log(err);
            });

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
            ${player_stats.rating}
            ${player_stats.headshots}
            ${player_stats.kdRatio}


            ${player_stats.damagePerRound}
            ${player_stats.killsPerRound}
            ${player_stats.assistsPerRound}
            ${player_stats.deathsPerRound}
            ${player_stats.grenadeDamagePerRound}
        `;

        embed.addField('Stats:', stats_0, true);
        embed.addField('\u200b', stats_1, true);

        msg.channel.send(embed);
    }
};
