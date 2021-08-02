'use strict';
const captureWebsite = import('capture-website'); // FIX ERROR: Must use import to load ES module
const Vibrant = require('node-vibrant');
const fs = require('fs');
const date = require('date-and-time');
const { promisify } = require('util');
const { HLTV } = require('hltv');
const config = require('../../../../config.json');
const { MessageAttachment } = require('discord.js');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * returns a url to the teams logo and the most prominent Color
 * @param {Number} id HLTV ID of the team
 * @returns {Object} contains url and color (rgb array)
 */
async function getTeamLogo(id) {
    const logos = await readFile('./src/commands/hltv/modules/logos.json', 'utf-8')
        .then(data => {
            return JSON.parse(data.toString());
        })
        .catch(err => {
            console.log(err);
        });


    // logo information already there
    if (logos[id]) {
        return logos[id];
    }

    // URL of image on hltv.org
    const svg_url = await HLTV.getTeam({ id })
        .then(res => {
            return res.logo;
        })
        .catch(err => {
            console.log(err);
        });

    const filename = `${id}_${date.format(new Date(), 'HH-mm-ss-SSS')}.png`;

    // take screenshot of SVG
    await captureWebsite
        .file(svg_url, `./tmp/logos/${filename}`, {
            width: 800,
            height: 800,
            scaleFactor: 0.5,
            defaultBackground: false,
        })
        .catch(err => {
            console.log(err);
        });

    // extract most prominent color
    const color = await Vibrant.from(`./tmp/logos/${filename}`).getPalette()
        .then((palette) => {
            if (palette.Vibrant) {
                return palette.Vibrant._rgb;
            }
            // return some sort of grey if no color found
            else {
                return [128, 128, 128];
            }
        });

    // send to imgchan
    const imgchan = this.client.channels.cache.get(config.ids.imgchan);
    const msg = await imgchan.send(new MessageAttachment(`./tmp/logos/${filename}`));

    logos[id] = { url: msg.attachments.first().url, color };

    // update logos.json
    writeFile('./src/commands/hltv/modules/logos.json', JSON.stringify(logos, null, 4))
        .catch(err => {
            console.log(err);
        });

    return logos[id];
}

module.exports = getTeamLogo;
