'use strict';

const defaults = require('./settings.json');
const { mongo } = require('../mongo');
const guildSettingsSchema = require('./schemas/guildsettings-schema');
const userSettingsSchema = require('./schemas/usersettings-schema');
const util = require('util');

/**
 * returns all guild specific settings that have been set in the db
 * @param {String} guild_id 
 */
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

/**
 * returns all user specific settings that have been set in the db
 * @param {String} user_id 
 */
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

/**
 * This function returns an object with all the settings that are accessible
 * by the user with user_id in the guild with guild_id
 * the guild_id can be undefined, if the scope is 0 (e.g. in DMs)
 * @param {String} guild_id
 * @param {String} user_id 
 * @param {Number} scope access level
 */
const getSettings = async function (guild_id, user_id, scope) {
    let settings = defaults;
    // the scope, aka the settings the user has access to
    switch (scope) {
        case 0:
            delete settings.server;
            break;
        case 1:
            delete settings.server.owner;
            break;
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