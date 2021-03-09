const { MessageEmbed } = require('discord.js');
const Commando = require('discord.js-commando');
const pw_gen = require('generate-password');

const connect_embed = require('./connect-embed.json');

module.exports = class ConnectCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'connect',
            aliases: ['con'],
            group: 'steam',
            memberName: 'connect',
            description: 'Connect your steam account, enabeling rank roles and much more!',
            examples: ['connect'],
        });
    }

    async run(msg) {
        console.log('>>> connect by ' + msg.author.tag);
        if(msg.channel.type != 'dm') {
            await msg.author.createDM();
            msg.reply('I\'ve sent you a DM');
        }

        // check if offline on steam
        if (!this.client.steam.isOnline) {
            await msg.author.dmChannel.send('I am currently not online on steam. ' +
                'Please try again later. ' +
                'If this keeps happening consider contacting '
                + `${this.client.owners[0]}`,
            );
            return;
        }

        const token = pw_gen.generate({
            length: 7,
            numbers: true,
            lowercase: false,
            strict: true,
        });

        const embed = new MessageEmbed(connect_embed);
        embed.addField(
            'Your private token (click to reveal):',
            `||${token}||`,
        );

        msg.author.dmChannel.send(embed);

        let receivedToken = false;

        function receivedDM(senderID, message) {
            console.log(senderID, message);
            if (message.includes(token)) {
                receivedToken = true;
                msg.author.dmChannel.send('We are now connected on steam!');
                this.client.steam.removeListener('friendMessage', receivedDM);
            }
        }

        this.client.steam.addListener('friendMessage', receivedDM);

        setTimeout(() => {
            if (!receivedToken) {
                msg.author.dmChannel.send(':clock: Your connection request timed out. ' +
                'If there were and problems, please contact ' + `${this.client.owners[0]}`);
                this.client.steam.removeListener('friendMessage', receivedDM);
            }
        }, 30 * 60 * 1000);
    }
};
