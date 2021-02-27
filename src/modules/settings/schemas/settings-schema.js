const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true
};

const settingsObject = mongoose.Schema({
    prefix: String,
    voting_time: Number,
    voting_count: {
        type: Number,
        min: 1
    }
})

const settingsSchema = mongoose.Schema({
    guild: reqString,
    settings: settingsObject
});

module.exports = mongoose.model('settings', settingsSchema);