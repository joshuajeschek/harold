'use strict';

const guild_defaults = require('./guild-settings.json');
const user_defaults = require('./user-settings.json');
const { mongo } = require('../mongo');
const guildSettingsSchema = require('./schemas/guildsettings-schema');
const userSettingsSchema = require('./schemas/usersettings-schema');
const config = require('../../../config.json');

const true_strings = ['true', 'on', 'yes', '1', 'yeah'];
const false_strings = ['false', 'off', 'no', '0', 'nope'];

// de_cache for quicker access
const user_cache = new Map();
const guild_cache = new Map();

// ///////////////////////////////////////////////
//              GET ALL SETTINGS               //
// ///////////////////////////////////////////////

/**
 * returns all the settings of the user, with the given user id
 * @param {String} user_id
 */
const getUserSettings = async function(user_id) {
    const settings = user_defaults;

    // get set user settings
    let user_settings;
    if (!user_cache.has(user_id)) {
        await mongo().then(async (mongoose) => {
            try {
                const result = await userSettingsSchema.findOne({
                    user: user_id,
                });
                if (result) {
                    user_settings = result._doc;
                    user_cache.set(user_id, user_settings);
                }
            }
            finally {
                mongoose.connection.close();
            }
        });
    }
    else {
        user_settings = user_cache.get(user_id);
    }

    // merge default and user settings
    if (user_settings) {
        for (const [key, value] of Object.entries(user_settings)) {
            const set_arr = key.split('_');
            if (set_arr.length == 2) {
                try {
                    settings[set_arr[0]][set_arr[1]].value = value;
                }
                // eslint-disable-next-line no-empty
                catch {}
            }
        }
    }

    return settings;

};

/**
 * Returns all the available settings, depending on the scope
 * @param {String} guild_id
 * @param {Number} scope
 */
const getGuildSettings = async function(guild_id, scope) {
    const settings = guild_defaults;

    // delete unavailable settings
    for (const group in settings) {
        for (const setting in settings[group]) {
            if (settings[group][setting].scope > scope) {
                delete settings[group][setting];
            }
        }
    }

    // get set guild settings
    let guild_settings;
    if (!guild_cache.has(guild_id)) {
        await mongo().then(async (mongoose) => {
            try {
                const result = await guildSettingsSchema.findOne({
                    guild: guild_id,
                });
                if (result) {
                    guild_settings = result._doc;
                    guild_cache.set(guild_id, guild_settings);
                }
            }
            finally {
                mongoose.connection.close();
            }
        });
    }
    else {
        guild_settings = guild_cache.get(guild_id);
    }


    // merge settings
    if (guild_settings) {
        for (const [key, value] of Object.entries(guild_settings)) {
            const set_arr = key.split('_');
            if (set_arr.length == 2) {
                try {
                    settings[set_arr[0]][set_arr[1]].value = value;
                }
                catch {/* ... */}
            }
        }
    }

    return settings;

};

// ///////////////////////////////////////////////
//            GET SINGLE SETTINGS              //
// ///////////////////////////////////////////////

/**
 * returns the value of a user setting (must exist)
 * @param {String} user_id
 * @param {String} group
 * @param {String} setting
 */
async function getUserSetting(user_id, group, setting) {

    const key = `${group}_${setting}`;

    let user_setting;
    // check cache
    if (!user_cache.has(user_id)) {
        // get set user settings
        await mongo().then(async (mongoose) => {
            try {
                const result = await userSettingsSchema.findOne({
                    user: user_id,
                });
                if (result) {
                    user_setting = result._doc[key];
                }
            }
            finally {
                mongoose.connection.close();
            }
        });
    }
    else {
        user_setting = user_cache.get(user_id)[key];
    }

    if (user_setting != undefined) {
        return user_setting;
    }
    else {
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

    let guild_setting;

    // check cache
    if(!guild_cache.has(guild_id)) {
        // get set guild settings
        await mongo().then(async (mongoose) => {
            try {
                const result = await guildSettingsSchema.findOne({
                    guild: guild_id,
                });
                if (result) {
                    guild_setting = result._doc[key];
                }
            }
            finally {
                mongoose.connection.close();
            }
        });
    }
    else {
        guild_setting = guild_cache.get(guild_id)[key];
    }

    if (guild_setting != undefined) {
        return guild_setting;
    }
    else {
        return guild_defaults[group][setting].default;
    }

}

// ///////////////////////////////////////////////
//                VERIFY VALUE                 //
// ///////////////////////////////////////////////

/**
 * converts and verifies a value. returns undefined,
 * if the value is not correct for the setting
 * @param {string} env 'dm' or 'guild'
 * @param {String} group settings group
 * @param {String} setting setting name
 * @param {String} value setting value
 */
function verifyValue(env, group, setting, value) {
    let type;
    let def_setting;
    if (env == 'dm') {
        def_setting = user_defaults[group][setting];
        type = typeof def_setting.default;
    }
    else {
        def_setting = guild_defaults[group][setting];
        type = typeof def_setting.default;
    }


    switch (type) {
    case 'string':
        return String;

    case 'number':
        const conv_value = Number(value);
        if (isNaN(conv_value)) {
            return undefined;
        }
        if (!((conv_value >= def_setting.min) && (conv_value <= def_setting.max))) {
            return undefined;
        }
        else {
            return conv_value;
        }

    case 'boolean':
        if (true_strings.includes(value.toLowerCase())) {
            return true;
        }
        else if (false_strings.includes(value.toLowerCase())) {
            return false;
        }
        else {
            return undefined;
        }

    default:
        return undefined;
    }
}

// ///////////////////////////////////////////////
//              SET ONE SETTING                 //
// ///////////////////////////////////////////////

/**
 * Sets a setting of a guild to the given value
 * @param {String} guild_id
 * @param {String} group
 * @param {String} setting
 * @param {any} value value, type dependant on setting
 */
async function setGuildSetting(guild_id, group, setting, value) {
    const key = `${group}_${setting}`;

    // get set user settings
    await mongo().then(async (mongoose) => {
        try {
            let data;
            const exists = await guildSettingsSchema.findOne({
                guild: guild_id,
            });

            // doc already exists, prefix might be changed
            if (exists) {
                data = { [key]: value };
            }
            else { // initial document needs prefix
                data = {
                    settings: {
                        prefix: config.prefix,
                    },
                    [key]: value,
                };
            }

            // write to DB
            const new_doc = await guildSettingsSchema.findOneAndUpdate({
                guild: guild_id,
            }, data, {
                upsert: true,
                new: true,
            });

            // write to cache
            if (new_doc) {
                guild_cache.set(guild_id, new_doc._doc);
            }

        }
        finally {
            mongoose.connection.close();
        }
    });

    // check success
    if (guild_cache.get(guild_id)[key] == value) {
        return true;
    }
    else {
        return false;
    }

}

/**
 * Sets a single setting of a user to a given value
 * @param {String} user_id
 * @param {String} group
 * @param {String} setting
 * @param {any} value value, type dependant on setting
 */
async function setUserSetting(user_id, group, setting, value) {
    const key = `${group}_${setting}`;

    // get set user settings
    await mongo().then(async (mongoose) => {
        try {
            const new_doc = await userSettingsSchema.findOneAndUpdate({
                user: user_id,
            }, {
                [key]: value,
            }, {
                upsert: true,
                new: true,
            });

            // write to cache
            if (new_doc) {
                user_cache.set(user_id, new_doc._doc);
            }
        }
        finally {
            mongoose.connection.close();
        }
    });

    // check success
    if (user_cache.get(user_id)[key] == value) {
        return true;
    }
    else {
        return false;
    }

}


module.exports = {
    getUserSettings,
    getGuildSettings,
    getUserSetting,
    getGuildSetting,
    verifyValue,
    setGuildSetting,
    setUserSetting,
};
