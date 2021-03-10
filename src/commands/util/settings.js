'use strict';

const { Command } = require('discord.js-commando');

const {
    getUserSettings,
    getGuildSettings,
    getUserSetting,
    getGuildSetting,
    verifyValue,
    setGuildSetting,
    setUserSetting } = require('../../modules/settings/settings-module');

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
    }
    else {
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
                `current value: **${settings[group][setting].value}** ` +
                `(default: ${settings[group][setting].default}) \n` +
                `${settings[group][setting].example}`,
                true,
            );
        }
    }

    return embed;
}

/**
 * checks if the group / setting exists
 * @param {Number} scope
 * @param {String} group
 * @param {String} setting
 */
function checkExistence(scope, group, setting) {
    if (group in options[scope]) {
        if (!setting) {
            return true;
        }
        else if (options[scope][group].includes(setting)) {
            return true;
        }
    }
    return false;
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
                    require: true,
                },
                {
                    key: 'value',
                    label: 'value',
                    prompt: 'What should the setting be?',
                    default: false,
                    type: 'string',
                },
            ],
        });
    }

    /**
     * Sends a message asking for more information
     * (either a setting or a value)
     * @param {Message} msg original message
     * @param {String} param1 Either group or group and setting
     */
    async askForMore(msg, { group, setting }) {
        let prompt, value;
        if (!setting) {
            prompt = `**Which setting in the group \`${group}\` do  you want to edit?**`;
        }
        else {
            prompt = `**Please provide a value for the setting \`${setting}\`!**`;
        }

        const filter = (message) => {
            return (message.author == msg.author);
        };

        const m_collector = msg.channel.createMessageCollector(filter, { time: 30 * 1000 });

        msg.reply(
            prompt +
            '\nRespond with `cancel` to cancel the command.' +
            ' The command will automatically be cancelled in 30 seconds.' +
            '\nRespond with `list` to see a list of all settings.');

        m_collector.on('collect', m => {
            if (m.content.toLowerCase() == 'cancel') {
                m_collector.stop('cancel');
                return;
            }
            else if (m.content.toLowerCase() == 'list') {
                m_collector.stop('list');
                this.run(m, {});
                return;
            }
            else if (!setting) {
                setting = m.content;
            }
            else {
                value = m.content;
            }
            this.run(m, { group, setting, value });
            m_collector.stop('collect');
        });
        m_collector.on('end', (_, reason) => {
            if ((reason != 'collect') && (reason != 'list')) {
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

            }
            else if (!setting) { // only group provided
                if (!checkExistence(0, group)) {
                    msg.reply('This group is not available.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.');
                }
                else {
                    this.askForMore(msg, { group }, options);
                }

            }
            else if (!value) { // group and settings, no value
                if (!checkExistence(0, group, setting)) {
                    msg.reply('This setting is not available.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.');
                }
                else {
                    // send current value
                    const cur_value = await getUserSetting(msg.author.id, group, setting);
                    msg.reply(`current value: **${cur_value}**`);
                    this.askForMore(msg, { group, setting });
                }

            }
            else { // everything is there
                if (!checkExistence(0, group, setting)) {
                    msg.reply('This setting is not available.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.');
                }
                else {
                    // convert the value to the right format, validate it
                    const conv_value = verifyValue('dm', group, setting, value);
                    if (conv_value == undefined) {
                        msg.reply(`Please check your input, the value \`${value}\` is invalid.`);

                    }
                    else {
                        // ACTUAL CHANGE OF SETTING
                        const succ = setUserSetting(msg.author.id, group, setting, conv_value);
                        if (succ) {
                            msg.reply('The setting has been applied.');
                        }
                        else {
                            msg.reply(`Something went wrong. Please contact ${this.client.owners[0].tag}`);
                        }
                    }
                }
            }

        }
        else {
            const member = msg.guild.member(msg.author);
            const guild_id = msg.guild.id;
            let scope;

            // figure out scope
            if (this.client.owners.includes(msg.author)) {
                scope = 2;
            }
            else if (member.hasPermission('MANAGE_GUILD')) {
                scope = 1;
            }
            else {
                msg.channel.send('You do not have the permissions to access my settings in this guild.\n' +
                    'Use this command in our DM and we can sort out your personal settings.');
                msg.channel.stopTyping();
                return;
            }

            // no arguments provided, list settings
            if (!group) {
                const settings = await getGuildSettings(guild_id, scope);
                const embed = compileSettingsEmbed(settings, 'guild');
                msg.channel.send(embed);

            }
            else if (!setting) { // only group provided
                if (!checkExistence(scope, group)) {
                    msg.reply('This group is not available.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.');
                }
                else {
                    this.askForMore(msg, { group }, options);
                }

            }
            else if (!value) { // group and setting, no value
                if (!checkExistence(scope, group, setting)) {
                    msg.reply('This setting is not available.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.');
                }
                else {
                    // send current value
                    const cur_value = await getGuildSetting(guild_id, group, setting);
                    msg.reply(`current value: **${cur_value}**`);
                    this.askForMore(msg, { group, setting });
                }

            }
            else { // everything is there
                if (!checkExistence(scope, group, setting)) {
                    msg.reply('This setting is not available.' +
                    ' To see a list of all settings, try the `settings` command without any arguments.');

                }
                else {
                    // convert value and verify it
                    const conv_value = verifyValue('guild', group, setting, value);
                    if (conv_value == undefined) {
                        msg.reply(`Please check your input, the value \`${value}\` is invalid.`);

                    }
                    else {
                        // ACTUAL CHANGE OF SETTING
                        const succ = setGuildSetting(guild_id, group, setting, conv_value);
                        if (succ) {
                            msg.reply('The setting has been applied.');
                        }
                        else {
                            msg.reply(`Something went wrong. Please contact ${this.client.owners[0].tag}`);
                        }
                    }
                }
            }
        }

        msg.channel.stopTyping();
    }

};
