const { Command } = require('discord.js-commando');
const { getUserSettings, getGuildSettings } = require('../../modules/settings/settings-module')
const util = require('util');

module.exports = class SettingsCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'settings',
            group: 'util',
            aliases: ['set'],
            memberName: 'settings',
            description: 'See and edit this bot\'s settings ',
            examples: ['kick @ALAN.TN'],
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
            }
            
        }

        msg.channel.stopTyping();
    }

}