const Discord = require('discord.js');
const { exit } = require('process');
const config = require('../config.json');
const client = new Discord.Client();
const PREFIX = config.discord.prefix;


/**
 * Logs the client in, depending on command line arguments
 * @param {Discord.Client} dc_client the client to log in
 */
function logIn(dc_client) {
    if (process.argv.length < 2) {
        console.log('Please specify an application [H/T]');
        exit(1);
    } else if (process.argv[2] == 'H') {
        console.log('Logging in as BOT Harold');
        dc_client.login(config.discord.tokens['BOT Harold']);
    } else if (process.argv[2] == 'T') {
        console.log('Logging in as Chester McTester');
        dc_client.login(config.discord.tokens['Chester McTester']);
    } else {
        console.log(`Invalid app provided. [${process.argv[2]}`);
        exit(1);
    }
};

/* Logs if bot is ready */
client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    client.user.setActivity('Counter-Strike: Global Offensive', {'type': 'PLAYING'});
});

/* Pinging the bot, sends latency */
client.on('message', msg => {
    if (msg.author.bot ) return;
    if (msg.content === 'ping') {
        msg.channel.send(`pong! \`[${Math.round(client.ws.ping)} ms]\``);
        console.log('>>> ponged.');
    }
});

/* Logging of DM Messages */
client.on('message', msg => {
    if (msg.channel.type === 'dm' && msg.author != client.user) {
        console.log(`>>> [DM] ${msg.author.tag}: ${msg.content}`);
    }
});

logIn(client);