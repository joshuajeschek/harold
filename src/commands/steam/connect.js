const { MessageEmbed } = require('discord.js');
const Commando = require('discord.js-commando');
const pw_gen = require('generate-password');

const connect_embed = require('./resources/connect-embed.json');
const success_embed = require('./resources/success-embed.json');
const fail_embed = require('./resources/fail-embed.json');
const { getSteamIDs, setSteamIDs } = require('../../modules/steam/id-lookup');

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

        // check if connection already exists
        const { SteamID64 } = await getSteamIDs(msg.author.id);
        if (SteamID64) {
            msg.author.dmChannel.send('**NOTE:** You are already connected on steam. ' +
            'If you want to connect with another account, you will lose connection to the first account.');
        }

        const token = pw_gen.generate({
            length: 7,
            numbers: true,
            lowercase: false,
            strict: true,
        });

        const con_embed = new MessageEmbed(connect_embed);
        con_embed.addField(
            'Your private token (click to reveal):',
            `||${token}||`,
        );

        msg.author.dmChannel.send(con_embed);

        let receivedToken = false;

        const steam_client = this.client.steam;

        function receivedDM(senderID, message) {
            if (message.includes(token)) {
                receivedToken = true;
                steam_client.removeListener('friendMessage', receivedDM);
                const suc_embed = new MessageEmbed(success_embed);
                const player_name = steam_client.users[senderID].player_name;
                const avatar_url = steam_client.users[senderID].avatar_url_full;
                suc_embed.addField(
                    'Connected account:',
                    `:bust_in_silhouette: [${player_name}](https://steamcommunity.com/id/${senderID})`,
                );
                suc_embed.setThumbnail(avatar_url);
                msg.author.dmChannel.send(suc_embed);
                steam_client.chatMessage(senderID, 'We are now connected!');
                setSteamIDs(msg.author.id, `${senderID}`);
            }
        }

        this.client.steam.addListener('friendMessage', receivedDM);

        setTimeout(() => {
            if (!receivedToken) {
                const fa_embed = new MessageEmbed(fail_embed);
                msg.author.dmChannel.send(fa_embed);
                this.client.steam.removeListener('friendMessage', receivedDM);
            }
        }, 15 * 60 * 1000);
    }
};
