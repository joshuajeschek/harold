const Commando = require('discord.js-commando');

const { commandoSetup, logIn } = require ('./modules/dc_startup.js');

const config = require('../config.json');

const { FriendlyError } = require('discord.js-commando');


const dc_client = new Commando.Client({
    owner: config.discord.owner,
    commandPrefix: config.discord.prefix,
});

/* Logs if bot is ready */
dc_client.on('ready', () => {
    console.log(`✅ Logged in as ${dc_client.user.tag}!`);
    dc_client.user.setActivity('Counter-Strike: Global Offensive', {
        type: 'PLAYING',
    });
});

/* Logging of DM Messages */
dc_client.on('message', (msg) => {
    if (msg.channel.type === 'dm' && msg.author != dc_client.user) {
        console.log(`>>> [DM] ${msg.author.tag}: ${msg.content}`);
    }
});


dc_client.on('commandError', (cmd, err) => {
    if (err instanceof FriendlyError) return;
    console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
});

/** Setup and Login of discord client */
commandoSetup(dc_client);
logIn(dc_client);
