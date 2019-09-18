"use strict";

const fs        = require('fs');
const path      = require('path');

const config    = require('../../config/config');

let stdoutWrite = process.stdout.write.bind(process.stdout);
let stderrWrite = process.stderr.write.bind(process.stderr);

let logData = {}, waitWriteCallbacks = [];

exports.waitWrite = function(callback) {
    if(Object.keys(logData).length)
        waitWriteCallbacks.push(callback);
    else
        callback();
};

exports.write = function write(logFile, txt) {
    let now = new Date();

    let fileName = path.join(__dirname, '../../logs/' + logFile + '-' + now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2) + '.txt');
    let log = logData[fileName];
    if(!log)
        log = logData[fileName] = {data: []}

    log.data.push(Buffer.from(('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2) + ' ' + txt));
    function doWrite() {
        log.writing = true;
        fs.open(fileName, 'a', (err, fd) => {
            if(err) {
                stderrWrite(err.toString() + '\n');
                log.writing = false;
                return;
            }

            fs.fstat(fd, (err, stats) => {
                if(err) {
                    stderrWrite(err.toString() + '\n');
                    fs.close(fd, (err) => {
                        log.writing = false;
                    });
                    return;
                }

                let buf = Buffer.concat(log.data);
                log.data = [];

                if(stats.size + buf.length > config.MAX_LOG_FILE_SIZE) {
                    fs.close(fd, (err) => {
                        log.writing = false;
                    });
                } else {
                    fs.write(fd, buf, 0, buf.length, null, (err, written, buffer) => {
                        if(err) {
                            stderrWrite(err.toString() + '\n');
                            fs.close(fd, (err) => {
                                log.writing = false;
                            });
                            return;
                        }

                        fs.close(fd, (err) => {
                            if(err)
                                stderrWrite(err.toString() + '\n');

                            log.writing = false;
                            if(log.data.length)
                                doWrite();
                            else {
                                delete logData[fileName];
                                if(!Object.keys(logData).length) {
                                    let cbs = waitWriteCallbacks;
                                    waitWriteCallbacks = [];
                                    for(let i = 0; i < cbs.length; i++)
                                        cbs[i]();
                                }
                            }
                        });
                    });
                }
            });
        });
    }
    if(!log.writing)
        doWrite();
}

async function cleanLogs() {
    let now = new Date();
    now.setHours(0);

    try {
        let logFiles = await fs.promises.readdir(path.join(__dirname, '../../logs'));
        for(let i = 0; i < logFiles.length; i++) {
            let logFile = logFiles[i];
            if(logFile == '.' || logFile == '..')
                continue;

            let parts = logFile.split('-');
            if(parts.length >= 4) {
                let lastParts = parts[parts.length - 1].split('.');
                if(lastParts.length == 2 && lastParts[1] == 'txt') {
                    let year = parts[parts.length - 3] | 0;
                    let month = parts[parts.length - 2] | 0;
                    let day = lastParts[0] | 0;

                    if(year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        let date = new Date(year, month - 1, day);
                        let daysDiff = Math.round((now.getTime() - date.getTime()) / (24 * 3600 * 1000));
                        if(daysDiff >= config.REMOVE_LOG_AFTER_DAYS) {
                            try {
                                await fs.promises.unlink(path.join(__dirname, '../../logs/') + logFile);
                            } catch(err) {
                                console.error(err);
                            }
                        }

                        continue;
                    }
                }
            }

            console.error('Found log file "' + logFile + '" with unknown file name format, ignoring');
        }
    } catch(err) {
        setTimeout(cleanLogs, 60 * 60 * 1000);
        throw err;
    }

    setTimeout(cleanLogs, 60 * 60 * 1000);
}

exports.init = async function init() {
    if(config.REMOVE_LOG_AFTER_DAYS)
        await cleanLogs();

    // redirect stdout and stderr to log file by overriding
	// the write function of the underlying stream
    // this override is on a global level
	process.stdout.write = (string, encoding) => {
        if(config.CONSOLE_STDOUT)
            stdoutWrite(string, encoding);
        if(config.CONSOLE_LOGFILE) {
            exports.write('main', 'info:  ' + string);
        }
	};

    process.stderr.write = (string, encoding) => {
        if(config.CONSOLE_STDOUT)
            stderrWrite(string, encoding);
        if(config.CONSOLE_LOGFILE)
            exports.write('main', 'error: ' + string);
    };
}
