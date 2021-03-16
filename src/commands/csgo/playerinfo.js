'use strict';
const Commando = require('discord.js-commando');
const { getSteamIDs } = require('./../../modules/steam/id-lookup');

module.exports = class PlayerInfoCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'playerinfo',
            aliases: ['pi'],
            group: 'csgo',
            memberName: 'playerinfo',
            description: 'Request information about a CS:GO player in this guild, or yourself',
            examples: ['playerinfo @seleanoria'],
            args: [
                {
                    key: 'player',
                    label: 'name',
                    prompt: 'Who do you want to get info about?',
                    type: 'member',
                    default: false,
                },
            ],
        });
    }

    async run(msg, { player }) {
        console.log('>>> playerinfo by', msg.author.tag);

        // default to command author
        if (!player || msg.channel.type === 'dm') player = msg.author;

        const { SteamID64, AccountID } = await getSteamIDs(msg.author.id);

        if (!SteamID64 || !AccountID) {
            msg.channel.send('You are not connected to me on steam. Please use the `connect` command and try again.');
            return;
        }

        if (!this.client.steam.csgo.haveGCSession) {
            msg.channel.send('CS:GO is currently unabailable, please try again later.');
            return;
        }

        const data = await this.client.steam.getPlayerData(SteamID64);

        console.log(data);
    }
};
