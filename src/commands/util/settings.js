const { Command, Permissions } = require('discord.js-commando');
const { getSettings } = require('../../modules/settings/settings-module')

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

        const member = msg.guild.member(msg.author);

        let scope = 0;
        if (this.client.owners.includes(msg.author)) {
            scope = 2;
        } else if (member.hasPermission('MANAGE_GUILD')){
            scope = 1;
        }

        if (!group) {
            const settings = await getSettings(msg.guild.id, msg.author.id, scope);
        }
    }

}