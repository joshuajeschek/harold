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
            name: 'changemap',
            group: 'vote',
            aliases: ['cm', 'change'],
            memberName: 'changemap',
            description: 'Select the map you want to play on.',
            examples: ['changemap Cache'],
            args: [
                {
                    key: 'map',
                    label: 'map name',
                    prompt: 'On which map do you want to play?',
                    type: 'string',
                },
            ],
        });
    }

    async run(msg, { map }) {
        console.log(`>>> mapchange by ${msg.author.username}`);
        msg.channel.startTyping();

        // prepare for printing
        const mapname = shortenName(map);

        const { votemsg, template_filename } = await this.initializeVote(
            msg,
            'map',
            `Change map to ${mapname}?`,
        );

        await this.countVotes(votemsg, template_filename);

        msg.channel.stopTyping();
    }
};
