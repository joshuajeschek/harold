'use strict';

const guild_defaults = require('./guild-settings.json');
const user_defaults = require('./user-settings.json');
const { mongo } = require('../mongo');
const guildSettingsSchema = require('./schemas/guildsettings-schema');
const userSettingsSchema = require('./schemas/usersettings-schema');


/**
 * returns all the settings of the user, with the given user id
 * @param {String} user_id 
 */
const getUserSettings = async function (user_id) {
    let settings = user_defaults;

    // get set user settings
    let user_settings;
    await mongo().then(async (mongoose) => {
        try {
            const result = await userSettingsSchema.findOne({
                user: user_id,
            });
            if (result) {
                user_settings = result._doc;
            }
        } finally {
            mongoose.connection.close();
        }
    });

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

    return settings;

}

/**
 * Returns all the available settings, depending on the scope
 * @param {String} guild_id 
 * @param {Number} scope 
 */
const getGuildSettings = async function(guild_id, scope) {
    let settings = guild_defaults;

    // delete unavailable settings
    for (const group in settings) {
        for (const setting in settings[group]){
            if (settings[group][setting].scope > scope) {
                delete settings[group][setting];
            }
        }
    }

    // get set guild settings
    let guild_settings;
    await mongo().then(async (mongoose) => {
        try {
            const result = await guildSettingsSchema.findOne({
                guild: guild_id,
            });
            if (result) {
                guild_settings = result.settings._doc;
            }
        } finally {
            mongoose.connection.close();
        }
    });

    // merge settings
    if (guild_settings) {
        for (const [key, value] of Object.entries(guild_settings)) {
            const set_arr = key.split('_');
            if (set_arr.length == 2) {
                try {
                    settings[set_arr[0]][set_arr[1]].value = value;
                } catch {}
            }
        }
    }

    return settings;

}


module.exports = {
    getUserSettings,
    getGuildSettings
};