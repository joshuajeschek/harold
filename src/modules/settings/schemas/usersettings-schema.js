const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true,
};

const userSettingsSchema = mongoose.Schema({
    user: reqString,
    steam_rank: Boolean,
}, {
    timestamps: true,
});

module.exports = mongoose.model('user-settings', userSettingsSchema);