/**
 * This file holds all of the logic for CRUD operations regarding the file system
 */

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {
    //trying to open a file with 'wx' will fail if the file already exists, this will prevent creating duplicate files
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            //the data will be coming in as an object, a payload from the user
            const stringData = JSON.stringify(data);
            fs.writeFile(fileDescriptor, stringData, err => {
                if (!err) {
                    //close the file
                    fs.close(fileDescriptor, err => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Could not close the file.');
                        }
                    });
                } else {
                    callback('Error creating new file.');
                }
            });
        } else {
            callback('Could not create the file, it may already exist.');
        }
    });
};


lib.read = (dir, file, callback) => {
    fs.readFile(`${lib.baseDir}${dir}/${file}.json`, (err, data) => {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObj(data);
            callback(false, parsedData);
        } else {
            //in this case, where the file doesn't exist, the data will be null
            callback(err, data);
        }
    });
};

//update
lib.update = () => {
    
};

//delete
lib.remove = () => {
    
};


module.exports = lib;