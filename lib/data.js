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
                            callback('CREATE: Could not close the file.');
                        }
                    });
                } else {
                    callback('CREATE: Error creating new file.');
                }
            });
        } else {
            callback('CREATE: Could not create the file, it may already exist.');
        }
    });
};

/**
 * Read in data about a specific file in a given directory
 * @param {string} dir - directory to be read from 
 * @param {string} file - file name
 * @param {function} callback - callback an error or the parsed string data as an object
 */
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

lib.update = (dir, file, newData, callback) => {
    // 'r+' flag will error if the file doesnt exist yet
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(newData);
            fs.truncate(fileDescriptor, err => {
                if (!err) {
                    //write to the file
                    fs.writeFile(fileDescriptor, stringData, err => {
                        if (!err) {
                            fs.close(fileDescriptor, err => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('UPDATE: Error closing file.');
                                }
                            });
                        } else {
                            callback('UPDATE: Error writing to the existing file');
                        }
                    });
                } else {
                    callback('UPDATE: Error truncating file.');
                }
            });
        } else {
            callback('UPDATE: That file may not exist.');
        }
    });
};

/**
 * Delete a given file from a diretory
 * @param {string} dir - directory that file is in
 * @param {string} file - file to be deleted
 * @param {function} callback - callback an error or false
 */
lib.remove = (dir, file, callback) => {
    //unlink will delete file
    fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
        if (!err) {
            callback(false);
        } else {
            callback('Could not remove the file.')
        }
    });
};

/**
 * List out the files in a given directory
 * @param {string} dir - directory name 
 * @param {function} callback - callback filenames or an error 
 */
lib.list = (dir, callback) => {
    fs.readdir(`${lib.baseDir}${dir}/`, (err, data) => {
        if (!err && data && data.length > 0) {
            const trimmedFileNames = [];
            data.forEach(fileName => {
                trimmedFileNames.push(fileName.replace('.json', ''));
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};


module.exports = lib;