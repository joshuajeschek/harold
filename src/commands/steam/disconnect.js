'use strict';
const Commando = require('discord.js-commando');
const { MessageCollector } = require('discord.js');

const { getSteamIDs, deleteEntry } = require('../../modules/steam/id-lookup');

const affirmations = ['yes', 'affirmative', 'roger', 'yeah', 'duh', 'aye'];

module.exports = class ConnectCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'disconnect',
            aliases: ['dcon', 'discon'],
            group: 'steam',
            memberName: 'disconnect',
            description: 'Disconnect your steam account to miss out on a lot of key features.',
            examples: ['disconnect'],
            throttling: {
                usages: 2,
                duration: 15 * 60,
            },
        });
    }

    async run(msg) {
        console.log('>>> disconnect by ' + msg.author.tag);

        // check if not connected
        const exists = await (await getSteamIDs(msg.author.id)).SteamID64;
        if(!exists) {
            msg.reply('You are not connected, so there is no need to disconnect.');
            return;
        }

        // if in guild channel or group chat
        if(msg.channel.type != 'dm') {
            await msg.author.createDM();
            msg.reply('I\'ve sent you a DM');
        }

        // ask for comfirmation
        msg.author.dmChannel.send('Do you really want to disconnect your Steam account and miss out on key features?\n' +
            'Reply to this message with one of these words to confirm your choice:\n`' +
            affirmations.join(', ') + '`\n' +
            'The command will automatically be canceled after 30 seconds.',
        );

        const filter = m => affirmations.some(v => m.content.includes(v)) && (m.author.id === msg.author.id);
        const m_collector = new MessageCollector(msg.author.dmChannel, filter, { time: 30 * 1000 });

        m_collector.on('collect', async (m) => {
            m_collector.stop('collect');
            // DELETE ENTRY and check if it worked
            if((await deleteEntry(m.author.id))) {
                m.reply('Successfully disconnected your steam account from this account. It might take a while until the changes take effect.');
            }
            else {
                m.reply('Wasn\'t able to disconnect. Either you were never connected in the first place, or there was a technical error.');
            }
        });

        m_collector.on('end', (_, reason) => {
            if (reason != 'collect') {
                msg.author.dmChannel.send('Cancelled command');
            }
        });
    }
};
