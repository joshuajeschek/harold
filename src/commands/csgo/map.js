'use strict';
const { MessageEmbed } = require('discord.js');
const Commando = require('discord.js-commando');
const levenshtein = require('js-levenshtein');

const map_embed = require('./resources/map-embed.json');
const maps = require('./resources/maps.json');

module.exports = class PingCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'map',
            aliases: ['m'],
            group: 'csgo',
            memberName: 'map',
            description: 'Sends a radar overview of a competitive map.',
            examples: ['map cache'],
            args: [
                {
                    key: 'query',
                    label: 'name',
                    prompt: 'Which radar do you want to see?',
                    type: 'string',
                },
                {
                    key: 'callouts',
                    label: 'callouts',
                    prompt: 'Should it be with or without callouts?',
                    type: 'string',
                    default: false,
                },
            ],
        });
    }

    async run(msg, { query, callouts }) {
        console.log('>>> map by', msg.author.tag);

        // search for matching map name
        const mapnames = Object.keys(maps.clean);
        let name;
        for (let i = 0; (i < mapnames.length && !name) ; i++) {
            if (levenshtein(mapnames[i], query) < 3) {
                name = mapnames[i];
            }
        }

        // query does not match a map name
        if (!name) {
            msg.channel.send('Please provide a valid map from the current map pool.');
            return;
        }

        const embeds = [];

        const embed = new MessageEmbed(map_embed)
            .setThumbnail(maps.icons[name]);

        if (callouts) {
            embed.setTitle(maps.titles[name] + ', with callouts');
            if (Array.isArray(maps.callouts[name])) {
                embed.addField('Upper', '\u200b')
                    .setImage(maps.callouts[name][0]);
                embeds.push(embed);
                embeds.push(new MessageEmbed()
                    .addField('Lower', '\u200b')
                    .setImage(maps.callouts[name][1])
                    .setColor(16764423));
            }
            else {
                embed.setImage(maps.callouts[name]);
                embeds.push(embed);
            }
        }
        else {
            embed.setTitle(maps.titles[name]);
            if (Array.isArray(maps.clean[name])) {
                embed.addField('\u200b', '**Upper**')
                    .setImage(maps.clean[name][0]);
                embeds.push(embed);
                embeds.push(new MessageEmbed()
                    .addField('\u200b', '**Lower**')
                    .setImage(maps.clean[name][1])
                    .setColor(16764423));
            }
            else {
                embed.setImage(maps.clean[name]);
                embeds.push(embed);
            }
        }

        for (let i = 0; i < embeds.length; i++) {
            await msg.channel.send(embeds[i]);
        }
    }
};
