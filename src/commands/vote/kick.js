const { Command } = require('discord.js-commando');
const { MessageEmbed, ReactionCollector } = require('discord.js');
const { compileCard, changeValues, finalCard } = require('../../modules/votecards.js');
const config = require('../../../config.json');
const date = require('date-and-time');
const { deleteFile } = require('../../modules/utility.js');

/**
 * Shortens a name
 * @param {string} name
 */
function shortenName(name) {
    if (name.length > 100) {
        name = name.substr(0, 96) + '...';
    }
    var arr = name.split(' ');
    arr.forEach((item, index) => {
        if (item.length > 18) {
            arr[index] = item.substr(0, 14) + '...';
        }
    });
    return arr.join(' ');
}


module.exports = class KickCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'votekick',
            group: 'vote',
            aliases: ['vk'],
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

    async initializeVote(msg, {player}) {
        const now = new Date();
        var filename = `kick_${player.user.id}_${date.format(now, 'HH-mm-ss-SSS')}`;
        var playername = shortenName(`${player.user.username}`);
        this.imgchannel = this.client.channels.cache.get(
            config.discord.imgchannel
        );
        this.react_yes = this.client.emojis.cache.get(config.discord.emoji.F1);
        this.react_no = this.client.emojis.cache.get(config.discord.emoji.F2);

        var template_filename = await compileCard(
            'kick',
            filename,
            msg.author.username,
            `Kick player ${playername}?`,
            0,
            0
        );

        // get reference to sent image
        var imgmsg = await this.imgchannel.send({
            files: [
                {
                    attachment: `${filename}.png`,
                    name: `${filename}.png`,
                },
            ],
        });

        const embed = new MessageEmbed()
            .setImage(imgmsg.attachments.first().url)
            .setColor([37, 37, 37]);

        var votemsg = await msg.channel.send(embed);

        // initial reactions
        await votemsg.react(this.react_yes);
        await votemsg.react(this.react_no);

        deleteFile(`${filename}.png`)

        return { votemsg, template_filename };
    }

    async updateEmbed(votemsg, data, template_filename) {
        var filenamearray = template_filename.split('_');
        filenamearray.splice(3, 1);
        filenamearray.splice(0, 1);
        const now = new Date();
        var filename = `${filenamearray.join('_')}_${date.format(now, 'HH-mm-ss-SSS')}`;

        await changeValues(
            template_filename,
            filename,
            data.yes_count,
            data.no_count
        );
        
        // get reference to sent image
        var imgmsg = await this.imgchannel.send({
            files: [{
                    attachment: `${filename}.png`,
                    name: `${filename}.png`,
            }],
        });

        const embed = new MessageEmbed()
            .setImage(imgmsg.attachments.first().url)
            .setColor([37, 37, 37]);
        
        await votemsg.edit(embed);

        deleteFile(`${filename}.png`)
    }

    async endVote(votemsg, data, template_filename, votes_to_pass) {
        var filenamearray = template_filename.split('_');
        filenamearray.splice(3, 1);
        filenamearray.splice(0, 1);
        const now = new Date();
        var filename = `${filenamearray.join('_')}_${date.format(now, 'HH-mm-ss-SSS')}`;

        var emb_color = [255, 0, 0];
        var state = 'too_few';
        if (data.yes_count >= votes_to_pass) {
            state = 'pass';
            emb_color = [0, 128, 0];
        }
        else if (data.no_count >= votes_to_pass) {
            state = 'fail';
        }

        await finalCard(
            template_filename,
            state,
            filename,
            data.yes_count,
            data.no_count
        );

        // get reference to sent image
        var imgmsg = await this.imgchannel.send({
            files: [{
                    attachment: `${filename}.png`,
                    name: `${filename}.png`,
            }],
        });

        const embed = new MessageEmbed()
            .setImage(imgmsg.attachments.first().url)
            .setColor(emb_color);
        
        await votemsg.edit(embed);

        deleteFile(`${filename}.png`)
        deleteFile(`${template_filename}.png`)

    }

    async run(msg, { player }) {
        msg.channel.startTyping();

        console.log('>>> vote');

        var { votemsg, template_filename } = await this.initializeVote(msg, { player });

        const react_filter = (reaction) => {
            return reaction.emoji === this.react_yes || reaction.emoji === this.react_no;
        }

        const react_collector = new ReactionCollector(votemsg, react_filter, {time: 5*60*1000, dispose: true});
        let vote_ended = false;

        react_collector.on('collect', (reaction, user) => {
            let reaction_cache = votemsg.reactions.cache;
            switch (reaction.emoji) {
                case this.react_yes:
                    if (reaction_cache.get(this.react_no.id).users.cache.has(user.id)) {
                        reaction_cache.get(this.react_no.id).users.remove(user);
                    }
                    else {
                        react_collector.emit('update');
                    }
                    break;
            
                case this.react_no:
                    if (reaction_cache.get(this.react_yes.id).users.cache.has(user.id)) {
                        reaction_cache.get(this.react_yes.id).users.remove(user);
                    }
                    else {
                        react_collector.emit('update');
                    }
                    break;

                default:    // should never occur
                    break;
            }
        })

        react_collector.on('remove', () => {
            react_collector.emit('update');
        })

        react_collector.on('update', () => {
            let yes_obj = react_collector.collected.get(this.react_yes.id);
            let no_obj = react_collector.collected.get(this.react_no.id);
            let yes_count = (yes_obj === undefined) ? 0 : yes_obj.count - 1;
            let no_count = (no_obj === undefined) ? 0 : no_obj.count - 1;
            let votes_to_pass = this.client.provider.get(msg.guild, 'votes_to_pass', 5);
            if ((yes_count >= votes_to_pass) || (no_count >= votes_to_pass)) {
                vote_ended = true;
                react_collector.stop('vote_success');
                this.endVote(

                    votemsg,
                    {
                        yes_count: yes_count,
                        no_count: no_count
                    },
                    template_filename,
                    votes_to_pass
                );
            }
            this.updateEmbed(
                votemsg,
                {
                    yes_count: yes_count,
                    no_count: no_count
                },
                template_filename
            );
        })

        react_collector.on('end', () => {
            if (!vote_ended) {
                let yes_obj = react_collector.collected.get(this.react_yes.id);
                let no_obj = react_collector.collected.get(this.react_no.id);
                this.endVote(

                    votemsg,
                    {
                        yes_count: (yes_obj === undefined) ? 0 : yes_obj.count - 1,
                        no_count: (no_obj === undefined) ? 0 : no_obj.count - 1
                    },
                    template_filename,
                    this.client.provider.get(msg.guild, 'votes_to_pass', 5)
                );
            }
        })

        msg.channel.stopTyping();
    }
};
