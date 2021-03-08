const VoteCommand = require('./modules/vote.js');

module.exports = class VotekickCommand extends VoteCommand {
    constructor(client) {
        super(client, {
            name: 'surrender',
            group: 'vote',
            aliases: ['sur'],
            memberName: 'surrender',
            description: 'Do you really wanna surrender? There\'s always a chance to come back!',
            examples: ['surrender'],
        });
    }

    async run(msg) {
        console.log(`>>> surrender by ${msg.author.username}`);
        msg.channel.startTyping();

        const { votemsg, template_filename } = await this.initializeVote(
            msg,
            'surrender',
            'Surrender?',
        );

        await this.countVotes(votemsg, template_filename);

        msg.channel.stopTyping();
    }
};
