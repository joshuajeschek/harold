'use strict';

const { Command } = require('discord.js-commando');
const { getUserSettings, getGuildSettings } = require('../../modules/settings/settings-module')
const util = require('util');
const { MessageEmbed } = require('discord.js');
const config = require('../../../config.json');

/**
 * Compiles an embed which list all the settings in the settings object
 * @param {Object} settings The settings object that should be compiled into a embed
 * @param {*} env 'dm' / 'guild'
 */
function compileSettingsEmbed(settings, env) {
    
    // set properties that are always the same
    const embed = new MessageEmbed()
        .setColor([93, 116, 134])
        .setTimestamp()
        .setThumbnail(config.images.settings);

    
    // set environment specific title and description
    if (env == 'dm') {
        embed
            .setTitle('Your Personal Settings')
            .setDescription('Here you can access and modify your user specific settings. \n' +
                'To change a setting, do: `set <group> <setting> <value>`');
    } else {
        embed
            .setTitle('Server Settings')
            .setDescription('Here you can access and modify my settings on this server. \n' +
                'To change a setting, do: `set <group> <setting> <value>`.');
    }

    // list all settings
    for (const group in settings) {
        embed.addField('\u200b', `\`\`\`fix\n⇘ ${group}\n\`\`\``);
        for (const setting in settings[group]) {
            embed.addField(
                `⇒ ${setting}`,
                `${settings[group][setting].description} \n` + 
                `current setting: **${settings[group][setting].value}** ` + 
                `(default: ${settings[group][setting].default}) \n` +
                `${settings[group][setting].example}`,
                true
            )
        }
    }
    
    return embed;
}

module.exports = class SettingsCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'settings',
            group: 'util',
            aliases: ['set', 'setting'],
            memberName: 'settings',
            description: 'See and edit this bot\'s settings ',
            examples: ['set voting count 5'],
            args: [
                {
                    key: 'group',
                    label: 'settings group',
                    prompt: 'Which group do you want to edit?',
                    default: false,
                    type: 'string',
                },
                {
                    key: 'setting',
                    label: 'the individual setting you want to edit',
                    prompt: 'Which setting do you want to edit?',
                    default: false,
                    type: 'string',
                },
                {
                    key: 'value',
                    label: 'the value you want to set',
                    prompt: 'What should the setting be?',
                    default: false,
                    type: 'string',
                }
            ],
        });
    }

    async run(msg, { group, setting, value }) {

        msg.channel.startTyping();

        if (msg.channel.type == 'dm') {
            // no arguments provided
            if (!group) {
                const settings = await getUserSettings(msg.author.id);
                console.log(util.inspect(settings, { showHidden: false, depth: null }));
                const embed = compileSettingsEmbed(settings, 'dm');
                msg.channel.send(embed);
            }

        } else {
            const member = msg.guild.member(msg.author);
            const guild_id = msg.guild.id;
            let scope;

            // figure out scope
            if (this.client.owners.includes(msg.author)) {
                scope = 2;
            } else if (member.hasPermission('MANAGE_GUILD')){
                scope = 1;
            } else {
                msg.channel.send(`You do not have the right permissions to access my settings in this guild. \n Use this command in our DM and we can sort out your personal settings.`);
                msg.channel.stopTyping();
                return;
            }

            // no arguments provided, list settings
            if (!group) {
                const settings = await getGuildSettings(guild_id, scope);
                console.log(util.inspect(settings, { showHidden: false, depth: null }));
                const embed = compileSettingsEmbed(settings, 'guild');
                msg.channel.send(embed);
            }
            
        }

        msg.channel.stopTyping();
    }

}