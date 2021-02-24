const Jimp = require('jimp');

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
    compileCard: async function(template, filename, starter, text, yes, no) {
        template_filename = `TEMPLATE_${filename}`;
        image = await Jimp.read(`resources/votecards/${template}.png`)
        // print heading
        await Jimp.loadFont('resources/fonts/boxedround-w.fnt')
            .then(font => {
                image.print(font, 70, 27, `Vote by: ${starter}`);
        });
        // print content
        await Jimp.loadFont('resources/fonts/boxedround-y.fnt')
            .then(font => {
                image
                    .print(font, 30, 120, `${text}`, 350)
                    .write(`${template_filename}.png`);
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
                    .write(`${filename}.png`);
        });
        return template_filename;
    },

    changeValues: async function(template, filename, yes, no) {
        image = await Jimp.read(`${template}.png`);
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
                    .write(`${filename}.png`);
        });
    },

    finalCard: async function(template, state, filename, yes, no) {
        image = await Jimp.read(`${template}.png`);
        switch (state) {
            case 'pass':
                banner = await Jimp.read('resources/votecards/pass.png');
                await image.blit(banner, 0, 0);
                break;
        
            case 'too_few':
                banner = await Jimp.read('resources/votecards/fail.png');
                await image.blit(banner, 0, 0);
                await Jimp.loadFont('resources/fonts/boxedround-sy.fnt')
                    .then(font => {
                    image
                        .print(font, 200, 310, `Not enough players voted.`);
                    });
                break;

            case 'fail':
                banner = await Jimp.read('resources/votecards/fail.png');
                await image.blit(banner, 0, 0);
                break;
            
            default:    // should never occur
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
                    .write(`${filename}.png`);
        });
    }
}
