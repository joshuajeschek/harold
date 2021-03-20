'use strict';
const { MessageAttachment } = require('discord.js');
const Commando = require('discord.js-commando');
const { getSteamIDs } = require('./../../modules/steam/id-lookup');
const { compileInfoGraphic } = require('./module/infographic');

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
        this.image_cache = new Map();
    }

    async run(msg, { player }) {
        console.log('>>> playerinfo by', msg.author.tag);
        msg.channel.startTyping();

        // default to command author
        if (!player || msg.channel.type === 'dm') player = msg.author;

        // get associated steam id
        const { SteamID64 } = await getSteamIDs(msg.author.id);

        if (!SteamID64) {
            msg.channel.send('You are not connected to me on steam. Please use the `connect` command and try again.');
            return;
        }

        if (!this.client.steam.csgo.haveGCSession) {
            msg.channel.send('CS:GO is currently unabailable, please try again later.');
            return;
        }

        // get data and compile file, maybe file already exists!
        let filename;

        const cached_image = this.image_cache.get(SteamID64);
        if(cached_image && (cached_image.timestamp - new Date() < 15 * 60 * 1000)) {
            console.log('cached file');
            filename = cached_image.filename;
        }
        else {
            console.log('new file');
            const data = await this.client.steam.getPlayerData(SteamID64);
            data.avatar = data.avatar.large;
            data.mvps = data.stats.total_mvps;
            filename = await compileInfoGraphic('mirage', data);
            this.image_cache.set(SteamID64, { filename: filename, timestamp: new Date() });
        }

        const attachment = new MessageAttachment(`./tmp/infographics/${filename}`);

        const time4 = new Date();
        await msg.channel.send(attachment);
        const time5 = new Date();
        console.log('send:', time5 - time4);

        msg.channel.stopTyping();
    }
};
