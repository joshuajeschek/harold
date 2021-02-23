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
        image = await Jimp.read(`resources/votecards/${template}.png`)
        // print heading
        await Jimp.loadFont('resources/fonts/boxedround-w.fnt')
            .then(font => {
                image.print(font, 70, 27, `Vote by: ${starter}`);
        });
        // print content
        await Jimp.loadFont('resources/fonts/boxedround-y.fnt')
            .then(font => {
                image.print(font, 30, 120, `${text}`, 350);
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
    }
}
