/**
 * This file contains the needed functions for the main vote commands to work.
 */

const { Command } = require('discord.js-commando');
const { MessageEmbed, ReactionCollector } = require('discord.js');
const { compileCard, changeValues, finalCard } = require('./votecards.js');
const config = require('../../../../config.json');
const { deleteFile } = require('../../../modules/utility.js');
const { getGuildSetting } = require('../../../modules/settings/settings-module');

/**
 * Trims the starters name so it fits in the header
 * @param {String} name The name that should be trimmed
 */
function shortenStarterName(name) {
    if (name.length > 17) {
        name = name.substr(0, 14) + '...';
    }
    return name;
}

module.exports = class VoteCommand extends Command {
    /**
     * Compiles and sends the first image, reacts with F1 and F2,
     * vote counting has not started yet.
     * Returns the votemsg and the filename of the created template
     * @param {Message} msg The message that started the command
     * @param {String} type The kind of vote that should be initialized [kick, timeout, map, surrender]
     * @param {String} content The content of the vote message, e.g. 'Kick player ALAN.TN?'
     */
    async initializeVote(msg, type, content) {
        // references needed for later
        this.imgchan = this.client.channels.cache.get(config.ids.imgchan);
        this.react_yes = this.client.emojis.cache.get(config.ids.emoji.F1);
        this.react_no = this.client.emojis.cache.get(config.ids.emoji.F2);

        // the one who started the vote
        const starter = shortenStarterName(msg.author.username);

        // compile the vote card with jimp, get its filename
        const { filename, template_filename } = await compileCard(
            type,
            starter,
            content,
            0,
            0,
        );

        // url to put in the embed
        const imgurl = await this.getImageUrl(filename);

        const minutes_to_vote = await getGuildSetting(msg.guild.id, 'voting', 'time');

        // prepare the embed
        const embed = new MessageEmbed()
            .setImage(imgurl)
            .setFooter(
                `Vote by ${starter}, ${minutes_to_vote} minutes to vote.`,
            )
            .setColor([37, 37, 37]);

        // send the embed
        const votemsg = await msg.channel.send(embed);

        // initial reactions
        await votemsg.react(this.react_yes);
        await votemsg.react(this.react_no);

        // clean up ( only sent file, not template )
        deleteFile(`${filename}`);

        return { votemsg, template_filename };
    }

    /**
     * starts the ReactionCollector,
     * manages the reactions,
     * updates the embed whenever there is a change in the count
     * @param {Message} votemsg The message that is hosting the vote
     * @param {String} template_filename The filename of the prepared template
     */
    async countVotes(votemsg, template_filename) {
        // filter for the collector, only yes and no are interesting
        const react_filter = (reaction) => {
            return (
                reaction.emoji === this.react_yes ||
                reaction.emoji === this.react_no
            );
        };

        const minutes_to_vote = await getGuildSetting(votemsg.guild.id, 'voting', 'time');
        const votes_to_pass = await getGuildSetting(votemsg.guild.id, 'voting', 'count');

        // the collector itself
        const react_collector = new ReactionCollector(votemsg, react_filter, {
            time: minutes_to_vote * 60 * 1000,
            dispose: true,
        });

        // emitted when a reaction (F1, F2) is added
        react_collector.on('collect', (reaction, user) => {
            const reaction_cache = votemsg.reactions.cache;
            // remove the opposite reaction, if user is switching
            // only emit update when no reaction is removed,
            // as it will fire in that case
            switch (reaction.emoji) {
            case this.react_yes:
                if (
                    reaction_cache
                        .get(this.react_no.id)
                        .users.cache.has(user.id)
                ) {
                    reaction_cache.get(this.react_no.id).users.remove(user);
                }
                else {
                    react_collector.emit('update');
                }
                break;

            case this.react_no:
                if (
                    reaction_cache
                        .get(this.react_yes.id)
                        .users.cache.has(user.id)
                ) {
                    reaction_cache
                        .get(this.react_yes.id)
                        .users.remove(user);
                }
                else {
                    react_collector.emit('update');
                }
                break;

            default:
                // should never occur
                break;
            }
        });

        // emitted when a reaction is removed
        react_collector.on('remove', () => {
            react_collector.emit('update');
        });

        // emitted on removal or adding of reactions
        // checks if the vote is finished
        // updates the embed accordingly
        react_collector.on('update', () => {
            // get the amount of votes
            const yes_ob = react_collector.collected.get(this.react_yes.id);
            const no_ob = react_collector.collected.get(this.react_no.id);
            const yes_count = yes_ob === undefined ? 0 : yes_ob.count - 1;
            const no_count = no_ob === undefined ? 0 : no_ob.count - 1;

            // find out if vote is finished
            if (yes_count >= votes_to_pass || no_count >= votes_to_pass) {
                react_collector.stop('vote_success');
                this.endVote(
                    votemsg,
                    {
                        yes_count,
                        no_count,
                    },
                    template_filename,
                    votes_to_pass,
                );
            }
            else {
                // update the embed with the right amount of votes
                this.updateEmbed(
                    votemsg,
                    {
                        yes_count,
                        no_count,
                    },
                    template_filename,
                );
            }
        });

        // emitted whenever the vote ends,
        // especially on timeout
        react_collector.on('end', (_, reason) => {
            // check if vote timed out
            if (reason != 'vote_success') {
                const yes_ob = react_collector.collected.get(this.react_yes.id);
                const no_ob = react_collector.collected.get(this.react_no.id);
                const yes_count = yes_ob === undefined ? 0 : yes_ob.count - 1;
                const no_count = no_ob === undefined ? 0 : no_ob.count - 1;
                this.endVote(
                    votemsg,
                    {
                        yes_count,
                        no_count,
                    },
                    template_filename,
                    votes_to_pass,
                );
            }
        });
    }

    /**
     * compile the last vote card,
     * update the embed
     * @param {Message} votemsg message that is hosting the vote
     * @param {Object} data data.yes_count and data.no_count
     * @param {String} template_filename name of the premade template
     * @param {Number} votes_to_pass number of votes to pass
     */
    async endVote(votemsg, data, template_filename, votes_to_pass) {
        // compute the state
        let emb_color = [255, 0, 0];
        let state = 'too_few';
        if (data.yes_count >= votes_to_pass) {
            state = 'pass';
            emb_color = [0, 128, 0];
        }
        else if (data.no_count >= votes_to_pass) {
            state = 'fail';
        }

        // compile the final card
        const filename = await finalCard(
            template_filename,
            state,
            data.yes_count,
            data.no_count,
        );

        // post the new image
        const imgurl = await this.getImageUrl(filename);
        const embed = votemsg.embeds[0].setImage(imgurl).setColor(emb_color);
        await votemsg.edit(embed);

        // clean up
        deleteFile(filename);
        deleteFile(template_filename);
    }

    /**
     * update the embed with the counts (not at the end)
     * @param {Message} votemsg message that is hosting the vote
     * @param {Objetct} data data.yes_count and data.no_count
     * @param {String} template_filename name of the premade template
     */
    async updateEmbed(votemsg, data, template_filename) {
        const filename = await changeValues(
            template_filename,
            data.yes_count,
            data.no_count,
        );

        const imgurl = await this.getImageUrl(filename);

        const embed = votemsg.embeds[0];
        embed.setImage(imgurl);

        await votemsg.edit(embed);

        deleteFile(`${filename}`);
    }

    /**
     * Send an image to the image channel and return its url
     * @param {String} filename the name of the file to send
     */
    async getImageUrl(filename) {
        // get reference to sent image
        const imgmsg = await this.imgchan.send({
            files: [
                {
                    attachment: filename,
                    name: filename,
                },
            ],
        });

        // return only the url
        return imgmsg.attachments.first().url;
    }
};
