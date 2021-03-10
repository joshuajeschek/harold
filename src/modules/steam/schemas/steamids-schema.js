'use strict';

const mongoose = require('mongoose');

function reqType(type) {
    return {
        type,
        required: true,
    };
}

const steamIDSchema = new mongoose.Schema({
    DiscordID: reqType(String),
    SteamID64: reqType(String),
    Steam3ID: String,
    Steam2ID: String,
    AccountID: reqType(Number),
});

module.exports = mongoose.model('steamIDs', steamIDSchema);
