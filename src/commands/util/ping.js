const Commando = require('discord.js-commando');

module.exports = class PingCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'ping',
            group: 'util',
            memberName: 'ping',
            description: 'Checks the bots\' status',
            examples: ['ping'],
        });
    }

    async run(msg) {
        console.log('>>> ponged');
        return msg.channel.send(
            `:ping_pong: Pong! My latency is \`${this.client.ws.ping} ms\``,
        );
    }
};
