'use strict';

const guild_defaults = require('./guild-settings.json');
const user_defaults = require('./user-settings.json');
const { mongo } = require('../mongo');
const guildSettingsSchema = require('./schemas/guildsettings-schema');
const userSettingsSchema = require('./schemas/usersettings-schema');

// de_cache for quicker access
let user_cache = new Map();
let guild_cache = new Map();

/**
 * returns all the settings of the user, with the given user id
 * @param {String} user_id 
 */
const getUserSettings = async function (user_id) {
    let settings = user_defaults;

    // get set user settings
    let user_settings;
    if (!user_cache[user_id]) {
        await mongo().then(async (mongoose) => {
            try {
                const result = await userSettingsSchema.findOne({
                    user: user_id,
                });
                if (result) {
                    user_settings = user_cache[user_id] = result._doc;
                }
            } finally {
                mongoose.connection.close();
            }
        });
    } else {
        user_settings = user_cache[user_id];
    }

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
    if (!guild_cache[guild_id]) {
        await mongo().then(async (mongoose) => {
            try {
                const result = await guildSettingsSchema.findOne({
                    guild: guild_id,
                });
                if (result) {
                    guild_settings = guild_cache[guild_id] = result.settings._doc;
                }
            } finally {
                mongoose.connection.close();
            }
        });
    } else {
        guild_settings = guild_cache[guild_id];
    }
    

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

/**
 * returns the value of a user setting (must exist)
 * @param {String} user_id 
 * @param {String} group 
 * @param {String} setting 
 */
async function getUserSetting(user_id, group, setting) {

    const key = `${group}_${setting}`;

    // get set user settings
    let user_setting;
    await mongo().then(async (mongoose) => {
        try {
            const result = await userSettingsSchema.findOne({
                user: user_id,
            });
            if (result) {
                user_setting = result._doc[key];
            }
        } finally {
            mongoose.connection.close();
        }
    });

    if (user_setting != undefined) {
        return user_setting;
    } else {
        return user_defaults[group][setting].default;
    }

}

/**
 * returns a single guild settings value, (must exist)
 * @param {String} guild_id 
 * @param {String} group 
 * @param {String} setting 
 */
async function getGuildSetting(guild_id, group, setting) {

    const key = `${group}_${setting}`;

    // get set user settings
    let guild_setting;
    await mongo().then(async (mongoose) => {
        try {
            const result = await guildSettingsSchema.findOne({
                guild: guild_id,
            });
            if (result) {
                guild_setting = result.settings._doc[key];
            }
        } finally {
            mongoose.connection.close();
        }
    });

    if (guild_setting != undefined) {
        return guild_setting;
    } else {
        return guild_defaults[group][setting].default;
    }

}

module.exports = {
    getUserSettings,
    getGuildSettings,
    getUserSetting,
    getGuildSetting
};