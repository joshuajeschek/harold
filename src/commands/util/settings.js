'use strict';

const { Command } = require('discord.js-commando');
const { getUserSettings, getGuildSettings } = require('../../modules/settings/settings-module')
const { MessageEmbed } = require('discord.js');
const config = require('../../../config.json');
const options = require('../../modules/settings/possibilities.json');

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
                    label: 'group',
                    prompt: 'Which group do you want to edit?',
                    default: false,
                    type: 'string',
                },
                {
                    key: 'setting',
                    label: 'setting',
                    prompt: 'Which setting do you want to edit?',
                    default: false,
                    type: 'string',
                    require: true
                },
                {
                    key: 'value',
                    label: 'value',
                    prompt: 'What should the setting be?',
                    default: false,
                    type: 'string',
                }
            ],
        });
    }

    async askForMore(msg, { group, setting }, options) {
        let prompt, value;
        if (!setting) {
            prompt = `**Which setting in the group \`${group}\` do  you want to edit?**`;
        } else {
            prompt = `**Please provide a value for the setting \`${setting}\`!**`;
        }

        const filter = (message) => {
            return (message.author == msg.author);
        }

        const m_collector = msg.channel.createMessageCollector(filter, {time: 30 * 1000});

        msg.reply(
            prompt +
            '\nRespond with `cancel` to cancel the command.' +
            ' The command will automatically be cancelled in 30 seconds.' +
            '\nRespond with `list` to see a list of all settings.');

        m_collector.on('collect', m => {
            if (m.content.toLowerCase() == 'cancel') {
                m_collector.stop('cancel');
                return;
            } else if (m.content.toLowerCase() == 'list'){
                m_collector.stop('list');
                this.run(m, {});
                return;
            } else if (!setting) {
                setting = m.content;
            } else {
                value = m.content;
            }
            this.run(m, {group, setting, value});
            m_collector.stop('collect'); 
        });
        m_collector.on('end', ( _, reason ) => {
            if ( (reason != 'collect') && (reason != 'list') ) {
                msg.reply('Cancelled command.');
            }
        });

    }

    async run(msg, { group, setting, value }) {

        msg.channel.startTyping();

        if (msg.channel.type == 'dm') {
            // no arguments provided
            if (!group) {
                const settings = await getUserSettings(msg.author.id);
                const embed = compileSettingsEmbed(settings, 'dm');
                msg.channel.send(embed);
            } else if (!setting) {  // only group provided
                if (! ( group in options[0])) {
                    msg.reply('This group does not exist.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.')
                } else {
                    this.askForMore(msg, {group}, options);
                }
            } else if (!value) {    // group and settings, no value
                if (! ( options[0][group].includes(setting) ) ) {
                    msg.reply('This setting does not exist.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.')
                } else {
                    this.askForMore(msg, {group, setting});
                }
            } else {    // everything is there
                msg.channel.send('PLACEHOLDER')
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
                msg.channel.send('You do not have the right permissions to access my settings in this guild.\n' +
                    'Use this command in our DM and we can sort out your personal settings.');
                msg.channel.stopTyping();
                return;
            }

            // no arguments provided, list settings
            if (!group) {
                const settings = await getGuildSettings(guild_id, scope);
                const embed = compileSettingsEmbed(settings, 'guild');
                msg.channel.send(embed);
            } else if (!setting) {  // only group provided
                if (! ( group in options[scope])) {
                    msg.reply('This group does not exist.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.')
                } else {
                    this.askForMore(msg, {group}, options);
                }
            } else if (!value) {    // group and setting, no value
                if (! ( options[scope][group].includes(setting) ) ) {
                    msg.reply('This setting does not exist.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.')
                } else {
                    this.askForMore(msg, {group, setting});
                }
            } else {    // everything is there
                msg.channel.send('PLACEHOLDER')
            }
            
        }

        msg.channel.stopTyping();
    }

}