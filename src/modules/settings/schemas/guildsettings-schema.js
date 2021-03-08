const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true,
};

const settingsObject = mongoose.Schema({
    prefix: String,
});

const guildSettingsSchema = mongoose.Schema({
    guild: reqString,
    settings: settingsObject,
    voting_time: {
        type: Number,
        min: 0,
        max: 10,
    },
    voting_count: {
        type: Number,
        min: 1,
        max: 99,
    },
    steam_roles: Boolean,
});

module.exports = mongoose.model('settings', guildSettingsSchema);
