'use strict';
const Jimp = require('jimp');
const date = require('date-and-time');
const download = require('image-downloader');
const PasswordGenerator = require('generate-password');
const { deleteFile } = require('../../../modules/utility');


async function compileInfoGraphic(template, { name, avatar, gameID, rankings, commendations, mvps }) {
    // download avatar image

    const filename = `${date.format(new Date(), 'HH-mm-ss-SSS')}_${PasswordGenerator.generate()}`;
    const avatar_filename = `avatar${filename}.jpg`;
    await download.image({
        url: avatar,
        dest: `./tmp/avatars/${avatar_filename}`,
    }).catch((error) => {
        console.log(error);
    });

    // preparation
    const competitive = {
        rank: rankings.competitive ? rankings.competitive.rank_id : 0,
        wins: rankings.competitive ? rankings.competitive.wins : 0,
    };
    const wingman = {
        rank: rankings.wingman ? rankings.wingman.rank_id : 0,
        wins: rankings.wingman ? rankings.wingman.wins : 0,
    };
    const dangerzone = {
        rank: rankings.dangerzone ? rankings.dangerzone.rank_id : 0,
        wins: rankings.dangerzone ? rankings.dangerzone.wins : 0,
    };

    const profile = rankings.profile || 1;

    if (!commendations) {
        commendations = {
            cmd_friendly: NaN,
            cmd_teaching: NaN,
            cmd_leader: NaN,
        };
    }

    if(!mvps) {
        mvps = NaN;
    }

    const images = await Promise.all([
        Jimp.read(`./resources/playerinfo/templates/${template}.png`),
        Jimp.read(`./tmp/avatars/${avatar_filename}`),
        Jimp.read(`./resources/playerinfo/ranks/competitive/${competitive.rank}.png`),
        Jimp.read(`./resources/playerinfo/ranks/wingman/${wingman.rank}.png`),
        Jimp.read(`./resources/playerinfo/ranks/dangerzone/${dangerzone.rank}.png`),
        Jimp.read(`./resources/playerinfo/ranks/profile/${profile}.png`),
    ]).then((values) => {
        return {
            info: values[0],
            avatar: values[1],
            competitive: values[2],
            wingman: values[3],
            dangerzone: values[4],
            profile: values[5],
        };
    }).catch(reason => {
        console.log(reason);
    });

    images.info.blit(images.avatar, 80, 80);
    images.info.blit(images.competitive, 237, 384);
    images.info.blit(images.wingman, 662, 384);
    images.info.blit(images.dangerzone, 1087, 384);
    images.info.blit(images.profile, 1263, 80);

    await Jimp.loadFont('./resources/fonts/CenterMedium/CenterMedium-60.fnt')
        .then(font => {

            let name_width = Jimp.measureText(font, name);
            while (name_width > 971) {
                const strlen = Math.floor((971 / name_width) * name.length);
                name = name.substring(0, strlen - 3) + '...';
                name_width = Jimp.measureText(font, name);
            }

            const name_height = Jimp.measureTextHeight(font, name);

            images.info.print(
                font,
                304,
                126 - Math.floor(name_height / 2),
                name,
            ); // NAME

            images.info.print(
                font,
                214,
                820,
                {
                    text: `${commendations.cmd_friendly}`,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
                },
                300,
                50,
            ); // FRIENDLY

            images.info.print(
                font,
                538,
                820,
                {
                    text: `${commendations.cmd_teaching}`,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
                },
                300,
                50,
            ); // TEACHING

            images.info.print(
                font,
                862,
                820,
                {
                    text: `${commendations.cmd_leader}`,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
                },
                300,
                50,
            ); // LEADER

            images.info.print(font,
                1186,
                820,
                {
                    text: `${mvps}`,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
                },
                300,
                50,
            ); // MVPS
        });

    if (gameID === '730') {
        await Jimp.loadFont('./resources/fonts/CenterMedium/CenterMedium-40green.fnt')
            .then(font => {
                images.info.print(
                    font,
                    304,
                    190,
                    'CURRENTLY PLAYING CS:GO',
                );
            })
            .catch(err => {
                console.log(err);
            });
    }
    else {
        await Jimp.loadFont('./resources/fonts/CenterMedium/CenterMedium-40grey.fnt')
            .then(font => {
                if (!gameID) {
                    images.info.print(
                        font,
                        304,
                        190,
                        'CURRENTLY NOT GAMING',
                    );
                }
                else {
                    images.info.print(
                        font,
                        304,
                        190,
                        'CURRENTLY PLAYING ANOTHER GAME',
                    );
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    images.info.write(`./tmp/infographics/${filename}.png`);
    deleteFile(`./tmp/avatars/${avatar_filename}`);

    return `${filename}.png`;
}

module.exports = {
    compileInfoGraphic,
};
