const { unlink } = require('fs');

const deleteFile = async function(path) {
    unlink(path, (err) => {
        if (err) {
            console.error(err);
        }
    });
};

module.exports = {
    deleteFile,
};
