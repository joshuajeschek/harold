'use strict';

const defaults = require('./settings.json');
const { mongo } = require('../mongo');
const guildSettingsSchema = require('./schemas/guildsettings-schema');
const userSettingsSchema = require('./schemas/usersettings-schema');
const util = require('util');

async function getGuildSettings(guild_id) {
    let settings;
    await mongo().then(async (mongoose) => {
        try {
            const result = await guildSettingsSchema.findOne({
                guild: guild_id,
            });
            settings = result.settings._doc;
        } finally {
            mongoose.connection.close();
        }
    });
    return settings;
}

async function getUserSettings(user_id) {
    let settings;
    await mongo().then(async (mongoose) => {
        try {
            const result = await userSettingsSchema.findOne({
                user: user_id,
            });
            settings = result._doc;
        } finally {
            mongoose.connection.close();
        }
    });
    return settings;
}

const getSettings = async function (guild_id, user_id, scope) {
    let settings = defaults;
    // the scope, aka the settings the user has access to
    switch (scope) {
        case 0:
            delete settings.server.manager;
        /* FALLS THROUGH */
        case 1:
            delete settings.server.owner;
        /* FALLS THROUGH */
        default:
            break;
    }

    if (scope > 0) {
        // get the settings guild in that have been set
        const guild_settings = await getGuildSettings(guild_id);

        // merge defaults and guild settings
        if (guild_settings) {
            for (const [key, value] of Object.entries(guild_settings)) {
                const set_arr = key.split('_');
                if (set_arr.length == 2) {
                    const cat = Object.keys(settings.server);
                    for (let i = 0; i < cat.length; i++) {
                        try {
                            settings.server[cat[i]][set_arr[0]][
                                set_arr[1]
                            ].value = value;
                        } catch {}
                    }
                }
            }
        }
    }

    // get user settings
    const user_settings = await getUserSettings(user_id);

    // merge default and user settings
    if (user_settings) {
        for (const [key, value] of Object.entries(user_settings)) {
            const set_arr = key.split('_');
            if (set_arr.length == 2) {
                try {
                    settings.user[set_arr[0]][set_arr[1]].value = value;
                } catch {}
            }
        }
    }

    console.log(util.inspect(settings, { showHidden: false, depth: null }));
    return settings;
};

module.exports = {
    getSettings
};