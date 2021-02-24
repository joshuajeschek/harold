const { unlink } = require('fs');

module.exports = {
    deleteFile: async function(path) {
        unlink(path, (err) => {
            if (err) {
                console.error(err);
            }
        });
    }
}