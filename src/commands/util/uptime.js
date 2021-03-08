const Commando = require('discord.js-commando');

module.exports = class UptimeCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'uptime',
            aliases: ['up'],
            group: 'util',
            memberName: 'uptime',
            description: 'Returns the bots\' uptime',
            examples: ['uptime'],
        });
    }

    async run(msg) {
        const uptime = this.client.uptime;
        const time = {
            days: Math.floor(uptime / (1000 * 60 * 60 * 24)),
            hours: Math.floor(uptime / (1000 * 60 * 60)),
            minutes: Math.floor(uptime / (1000 * 60)),
            seconds: Math.floor(uptime / 1000),
        };
        console.log(`[${msg.createdTimestamp}] [CMD] [${this.name}] ${msg.content}`);
        return msg.channel.send(
            `I have been online for ${time.days}d, ${time.hours}h, ${time.minutes}m and ${time.seconds}s`,
        );
    }
};
