'use strict';
const { mongo } = require('../mongo');
const steamIDsSchema = require('./schemas/steamids-schema');

const id_cache = new Map();

/**
 * Looks up the relevant steam IDs in the db and returns them
 * @param {String} DiscordID DiscordID of user
 * @returns SteamID64 and AccountID, if available
 */
async function getSteamIDs(DiscordID) {
    let SteamID64;
    let AccountID;


    if(!id_cache[DiscordID]) {
        await mongo().then(async (mongoose) => {
            try {
                const result = await steamIDsSchema.findOne({
                    DiscordID,
                });
                if (result) {
                    SteamID64 = result.SteamID64;
                    AccountID = result.AccountID;
                    id_cache.set(DiscordID, { SteamID64, AccountID });
                }
            }
            finally {
                mongoose.connection.close();
            }
        });
    }
    else {
        SteamID64 = id_cache[DiscordID].SteamID64;
        AccountID = id_cache[DiscordID].AccountID;
    }

    return { SteamID64, AccountID };
}

/**
 * computes the steam IDs for a user and sets them in the database
 * @param {String} DiscordID discord id of user in question
 * @param {SteamID} steam_id Number/String, for any ol' steam id
 * @returns SteamID64 and AccountID, if available
 */
async function setSteamIDs(DiscordID, steam_id) {
    const SteamID64 = steam_id.getSteamID64();
    const AccountID = steam_id.accountid;

    id_cache.set(DiscordID, { SteamID64, AccountID });

    await mongo().then(async (mongoose) => {
        try {
            const new_doc = await steamIDsSchema.findOneAndUpdate({
                DiscordID,
            }, {
                DiscordID,
                SteamID64,
                AccountID,
            }, {
                upsert: true,
                new: true,
            });
            if (new_doc) {
                id_cache.set(DiscordID, { SteamID64, AccountID });
            }
        }
        finally {
            mongoose.connection.close();
        }
    });

    return { SteamID64, AccountID };
}

async function deleteEntry(DiscordID = undefined, steam_id = undefined) {
    let old_doc;
    if (DiscordID) {
        await mongo().then(async (mongoose) => {
            try {
                old_doc = await steamIDsSchema.findOneAndDelete({
                    DiscordID,
                });
            }
            finally {
                mongoose.connection.close();
            }
        });
    }
    else if (steam_id) {
        await mongo().then(async (mongoose) => {
            try {
                old_doc = await steamIDsSchema.findOneAndDelete({
                    SteamID64: steam_id.getSteamID64(),
                });
            }
            finally {
                mongoose.connection.close();
            }
        });
    }

    // successfull access
    if (old_doc) {
        id_cache.delete(DiscordID);
        return { DiscordID: old_doc.DiscordID, SteamID64: old_doc.SteamID64 };
    }

    // no parameters or unsuccessfull access
    return false;
}

module.exports = {
    getSteamIDs,
    setSteamIDs,
    deleteEntry,
};
