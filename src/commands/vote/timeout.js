const VoteCommand = require('./modules/vote.js');

module.exports = class VotekickCommand extends VoteCommand {
    constructor(client) {
        super(client, {
            name: 'timeout',
            group: 'vote',
            aliases: ['to'],
            memberName: 'timeout',
            description: 'Call a tactical timeout',
            examples: ['timeout'],
        });
    }

    async run(msg) {
        console.log(`>>> timeout by ${msg.author.username}`);
        msg.channel.startTyping();

        const { votemsg, template_filename } = await this.initializeVote(
            msg,
            'timeout',
            'Call a timeout?',
        );

        await this.countVotes(votemsg, template_filename);

        msg.channel.stopTyping();
    }
};
