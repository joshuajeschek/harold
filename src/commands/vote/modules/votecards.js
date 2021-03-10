const Jimp = require('jimp');
const date = require('date-and-time');

module.exports = {
    /**
     * creates a votecard based on a template
     * @param {string} template
     * @param {string} filename
     * @param {string} starter
     * @param {string} text
     * @param {int} yes
     * @param {int} no
     */
    compileCard: async function(template, starter, text, yes, no) {
        const now = new Date();
        const filename = `${template}_${date.format(now, 'HH-mm-ss-SSS')}.png`;
        const template_filename = `TEMPLATE_${filename}`;
        const image = await Jimp.read(`resources/votecards/${template}.png`);
        // print heading
        await Jimp.loadFont('resources/fonts/boxedround-w.fnt')
            .then(font => {
                image.print(font, 75, 27, `Vote by: ${starter}`);
            });
        // print content
        await Jimp.loadFont('resources/fonts/boxedround-y.fnt')
            .then(font => {
                image
                    .print(font, 30, 105, `${text}`, 350)
                    .write(`${template_filename}`);
            });
        // print yes votes
        await Jimp.loadFont('resources/fonts/boxedround-mg.fnt')
            .then(font => {
                image.print(font, 465, 110, `${yes}`);
            });
        // print no votes
        await Jimp.loadFont('resources/fonts/boxedround-mr.fnt')
            .then(font => {
                image
                    .print(font, 465, 185, `${no}`)
                    .write(`${filename}`);
            });
        return { filename, template_filename };
    },

    changeValues: async function(template, yes, no) {
        const now = new Date();
        const filename = template.split('_', 1) + `_${date.format(now, 'HH-mm-ss-SSS')}.png`;
        const image = await Jimp.read(`${template}`);
        // print yes votes
        await Jimp.loadFont('resources/fonts/boxedround-mg.fnt')
            .then(font => {
                image.print(font, 465, 110, `${yes}`);
            });
        // print no votes
        await Jimp.loadFont('resources/fonts/boxedround-mr.fnt')
            .then(font => {
                image
                    .print(font, 465, 185, `${no}`)
                    .write(`${filename}`);
            });
        return filename;
    },

    finalCard: async function(template, state, yes, no) {
        const now = new Date();
        const filenamearr = template.split('_', 2);
        const filename = `${filenamearr[1]}_${date.format(now, 'HH-mm-ss-SSS')}.png`;
        const image = await Jimp.read(`${template}`);
        let banner;
        switch (state) {
        case 'pass':
            banner = await Jimp.read('resources/votecards/pass.png');
            image.blit(banner, 0, 0);
            break;

        case 'too_few':
            banner = await Jimp.read('resources/votecards/fail.png');
            image.blit(banner, 0, 0);
            await Jimp.loadFont('resources/fonts/boxedround-sy.fnt')
                .then(font => {
                    image
                        .print(font, 200, 310, 'Not enough players voted.');
                });
            break;

        case 'fail':
            banner = await Jimp.read('resources/votecards/fail.png');
            await image.blit(banner, 0, 0);
            break;

        default: // should never occur
            console.log('dumbass');
            break;
        }
        // print yes votes
        await Jimp.loadFont('resources/fonts/boxedround-mg.fnt')
            .then(font => {
                image.print(font, 465, 110, `${yes}`);
            });
        // print no votes
        await Jimp.loadFont('resources/fonts/boxedround-mr.fnt')
            .then(font => {
                image
                    .print(font, 465, 185, `${no}`)
                    .write(`${filename}`);
            });

        return filename;
    },
};
