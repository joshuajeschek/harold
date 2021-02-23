const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const { compileCard } = require('../../modules/votecards.js');
const config = require('../../../config.json');
const { unlink } = require('fs');



/**
 * Shortens a name
 * @param {string} name 
 */
function shortenName(name) {
    if (name.length > 100) {
        name = name.substr(0, 96) + '...';
    }
    var arr = name.split(' ');
    arr.forEach( (item, index) => {
        if (item.length > 18) {
            arr[index] = item.substr(0, 14) + '...';
        }
    })
    return arr.join(' ');
}


module.exports = class PingCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'kick',
            aliases: ['votekick'],
            group: 'vote',
            memberName: 'kick',
            description: 'Do a CS:GO style kick vote, no players harmed',
            examples: ['kick @alan'],
            args: [
                {
                    key: 'player',
                    label: 'guild member',
                    prompt: 'Who do you want to "kick"?',
                    type: 'member',
                },
            ],
        });
    }

    async run(msg, { player }) {
        msg.channel.startTyping();
        console.log('>>> vote');
        var filename = `kick_${player.user.id}`;
        var playername = shortenName(`${player.user.username}`);
        await compileCard(
            'kick',
            filename,
            msg.author.username,
            `Kick player ${playername}?`,
            0,
            0
        );
        var imgmsg = await this.client.channels.cache.get(config.discord.imgchannel).send({
            files: [{
              attachment: `${filename}.png`,
              name: `${filename}.png`
            }]
        });
        const embed = new MessageEmbed()
            .setImage(imgmsg.attachments.first().url)
            .setColor([37, 37, 37]);
        var votemsg = await msg.channel.send(embed);
        await votemsg.react(this.client.emojis.cache.get(config.discord.emoji.F1));
        await votemsg.react(this.client.emojis.cache.get(config.discord.emoji.F2));
        msg.channel.stopTyping();
        unlink(`${filename}.png`, (err) => {
            if (err) {
              console.error(err)
        }})
    }
};
