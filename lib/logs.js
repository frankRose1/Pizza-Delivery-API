/**
 * Library for logging data
 */
const path = require('path');
const fs = require('fs');

const logs = {};

logs.baseDir = path.join(__dirname, '/../.logs/');

/**
 * Append data to a file and create the file if it doesnt exist
 */
logs.append = (fileName, data, callback) => {
  fs.open(logs.baseDir + fileName + '.log', 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, data + '\n', err => {
        if (!err) {
          //close the file
          fs.close(fileDescriptor, err => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing file that was being appended.');
            }
          });
        } else {
          callback('Error appending data to file.');
        }
      });
    } else {
      callback('Could not open file for appending.');
    }
  });
};

module.exports = logs;
