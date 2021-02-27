const { unlink } = require('fs');
const config = require('../../');

module.exports = {
    deleteFile: async function(path) {
        unlink(path, (err) => {
            if (err) {
                console.error(err);
            }
        });
    },
    compileMongoUrl: function() {
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
    }
}