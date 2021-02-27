'use strict'

const defaults = require('./settings.json');
const { mongo } = require('../mongo');
const settingsSchema = require('./schemas/settings-schema');

async function getGuildSettings (guild_id) {
    let result;
    await mongo().then(async (mongoose) => {
        try {
            result = await settingsSchema.findOne({
                guild: guild_id
            });

        } finally {
            mongoose.connection.close();
        }
    })

    return result.settings;
}

module.exports = {
    /**
     * returns a json object with every setting
     */
    getSettings: async function(guild_id, scope) {
        let settings = defaults;
        switch (scope) {
            case 0:
                delete settings.manager;
                /* FALLS THROUGH */    
            case 1:
                delete settings.owner;
                /* FALLS THROUGH */
            default:
                break;
        }

        const guild_settings = await getGuildSettings(guild_id);

        console.log(settings, '\n', guild_settings);
        return settings;
    }
}