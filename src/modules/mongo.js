const mongoose = require('mongoose');
const config = require('../../config.json');
const { exit } = require('process');

let mongo_url;

const compileMongoUrl = function() {
    const app = process.argv[2];
    if (!app) {
        console.log(`Invalid app provided. [${process.argv[2]}`);
        exit(1);
    }
    let url = config.discord.mongourl;
    url = url.replace('<name>', process.env.MONGO_NAME);
    url = url.replace('<password>', process.env.MONGO_PASSWORD);
    switch (app) {
    case 'T':
        url = url.replace('<app>', 'chester');
        return [ url, 'chester' ];

    case 'H':
        url = url.replace('<app>', 'harold');
        return [ url, 'harold' ];

    default:
        // should never occur
        break;
    }
};

const mongo = async function() {
    if (!mongo_url) {
        mongo_url = compileMongoUrl()[0];
    }
    await mongoose.connect(mongo_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    });

    return mongoose;
};

module.exports = {
    mongo,
    compileMongoUrl,
};