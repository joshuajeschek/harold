const captureWebsite = import('capture-website'); // FIX ERROR: Must use import to load ES module
const fs = require('fs');
const date = require('date-and-time');
const { promisify } = require('util');
const config = require('../../../../config.json');
const { MessageAttachment } = require('discord.js');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function getTeamLineup(id, checksum) {

    const lineups = await readFile('./src/commands/hltv/modules/lineups.json', 'utf-8')
        .then(data => {
            return JSON.parse(data.toString());
        })
        .catch(err => {
            console.log(err);
        });

    if (lineups[id] && lineups[id].checksum === checksum) return lineups[id];


    const filename = `${id}_${date.format(new Date(), 'HH-mm-ss-SSS')}.png`;

    // take screenshot of lineup
    await captureWebsite
        .file(`https://www.hltv.org/team/${id}/harold`, `./tmp/lineups/${filename}`, {
            scaleFactor: 4,
            defaultBackground: false,
            element: 'div.bodyshot-team.g-grid',
            inset: { left: 32 },
            timeout: 10,
        })
        .catch(err => {
            console.log(err);
        });

    const imgchan = this.client.channels.cache.get(config.ids.imgchan);
    const msg = await imgchan.send(new MessageAttachment(`./tmp/lineups/${filename}`));

    lineups[id] = { url: msg.attachments.first().url, checksum };

    // update lineups.json
    writeFile('./src/commands/hltv/modules/lineups.json', JSON.stringify(lineups, null, 4))
        .catch(err => {
            console.log(err);
        });

    return lineups[id];
}

module.exports = getTeamLineup;
