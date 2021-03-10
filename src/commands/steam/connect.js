'use strict';
const { MessageEmbed } = require('discord.js');
const Commando = require('discord.js-commando');
const PasswordGenerator = require('generate-password');

const { getSteamIDs, setSteamIDs } = require('../../modules/steam/id-lookup');

const connect_embed = require('./resources/connect-embed.json');
const success_embed = require('./resources/success-embed.json');
const fail_embed = require('./resources/fail-embed.json');

module.exports = class ConnectCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'connect',
            aliases: ['con'],
            group: 'steam',
            memberName: 'connect',
            description: 'Connect your steam account, enabeling rank roles and much more!',
            examples: ['connect'],
            throttling: {
                usages: 1,
                duration: 15 * 60,
            },
        });
    }

    /**
     *
     * @param {String} senderID
     * @param {Discord.Message} msg
     * @param {Function} receivedDM Function that was bound to the event
     */
    async connectToSteam(senderID, msg) {
        const { SteamID64, AccountID } = await setSteamIDs(msg.author.id, `${senderID}`);
        if (!SteamID64 || !AccountID) {
            msg.author.dmChannel.send(
                'Something went wrong ' +
                        'Please try again later. ' +
                        'If this keeps happening consider contacting ' +
                        `${this.client.owners}`,
            );
        }

        // data for response embed
        const player_name = this.client.steam.users[senderID].player_name;
        const avatar_url = this.client.steam.users[senderID].avatar_url_full;

        // compile response embed
        const suc_embed = new MessageEmbed(success_embed)
            .addField(
                'Connected account:',
                `:bust_in_silhouette: [${player_name}](https://steamcommunity.com/id/${senderID})`,
            )
            .setThumbnail(avatar_url);

        // send confirmations
        msg.author.dmChannel.send(suc_embed);
        this.client.steam.chatMessage(senderID, 'We are now connected!');
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

        const con_embed = new MessageEmbed(connect_embed);

        // check if connection already exists
        if ((await getSteamIDs(msg.author.id)).SteamID64) {
            con_embed.addField(
                ':exclamation: Connection already exists! :exclamation:',
                '***If you connect a new account, the old connection will be lost.***',
            );
        }

        const token = PasswordGenerator.generate({
            length: 7,
            numbers: true,
            lowercase: false,
            strict: true,
        });

        con_embed.addField(
            'Your private token (click to reveal):',
            `||${token}||`,
        );

        msg.author.dmChannel.send(con_embed);

        let receivedToken = false;

        /**
         * Called when the bot receives a message
         * @param {String} senderID id of message sender
         * @param {String} message content of message
         */
        async function receivedDM(senderID, message) {
            console.log('Were here');
            // TOKEN RECEIVED
            if (message.includes(token) && !receivedToken) {

                // prevent more receiving
                receivedToken = true;
                this.client.steam.removeListener('friendMessage', boundReceivedDM);

                this.connectToSteam(senderID, msg);

            }
        }

        const boundReceivedDM = receivedDM.bind(this);

        // listen for DMs
        this.client.steam.on('friendMessage', boundReceivedDM);

        // timed listener, stop after 15 minutes
        setTimeout(() => {
            if (!receivedToken) {
                const fa_embed = new MessageEmbed(fail_embed);
                msg.author.dmChannel.send(fa_embed);
                this.client.steam.removeListener('friendMessage', receivedDM);
            }
        }, 15 * 60 * 1000);
    }
};
