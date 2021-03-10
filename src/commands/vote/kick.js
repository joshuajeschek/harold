const VoteCommand = require('./modules/vote.js');

/**
 * Shortens a name
 * @param {String} name the name to prepare for printing (on vote card)
 */
function shortenName(name) {
    if (name.length > 100) {
        name = name.substr(0, 96) + '...';
    }
    const arr = name.split(' ');
    arr.forEach((item, index) => {
        if (item.length > 18) {
            arr[index] = item.substr(0, 14) + '...';
        }
    });
    return arr.join(' ');
}

module.exports = class VotekickCommand extends VoteCommand {
    constructor(client) {
        super(client, {
            name: 'votekick',
            group: 'vote',
            aliases: ['vk'],
            memberName: 'kick',
            description: 'Do a CS:GO style kick vote, no players harmed',
            examples: ['kick @ALAN.TN'],
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
        console.log(`>>> votekick by ${msg.author.username}`);
        msg.channel.startTyping();

        // prepare for printing
        const playername = shortenName(`${player.user.username}`);

        const { votemsg, template_filename } = await this.initializeVote(
            msg,
            'kick',
            `Kick player ${playername}?`,
        );

        await this.countVotes(votemsg, template_filename);

        msg.channel.stopTyping();
    }
};
