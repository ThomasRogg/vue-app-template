"use strict";

const fs        = require('fs');
const path      = require('path');

const config    = require('../../config/config');

let logFile = path.join(__dirname, '../../logs/console.log');

exports.init = function() {
	let logWriting = false;
	let logWriteTxt = '';

	function logWrite(txt) {
		let now = new Date();
		logWriteTxt += now.toString() + '  ' + txt;

		function doWrite() {
            logWriting = true;
			fs.open(logFile, 'a', (err, fd) => {
                if(err)
                console.log(err);
				fs.fstat(fd, (err, stats) => {
					if(err) {
						fs.close(fd, (err) => {
							logWriting = false;
						});
						return;
					}

					let buf = Buffer.from(logWriteTxt);
					logWriteTxt = '';

					if(stats.size + buf.length > config.MAX_LOG_FILE_SIZE) {
						fs.close(fd, (err) => {
							logWriting = false;
						});
					} else {
						fs.write(fd, buf, 0, buf.length, null, (err, written, buffer) => {
							fs.close(fd, (err) => {
								logWriting = false;
								if(logWriteTxt != '')
									doWrite();
							});
						});
					}
				});
			});
		}
		if(!logWriting)
			doWrite();
	}

	function exitSave() {
		process.exit(0);
	}

    // redirect stdout and stderr to log file by overriding
	// the write function of the underlying stream
    // this override is on a global level
    let stdoutWrite = process.stdout.write.bind(process.stdout);
	process.stdout.write = (string, encoding) => {
        if(config.CONSOLE_STDOUT)
            stdoutWrite(string, encoding);
        if(config.CONSOLE_LOGFILE)
            logWrite('INFO  ' + string);
	};
    let stderrWrite = process.stderr.write.bind(process.stderr);
	process.stderr.write = (string, encoding) => {
        if(config.CONSOLE_STDOUT)
            stderrWrite(string, encoding);
        if(config.CONSOLE_LOGFILE)
            logWrite('INFO  ' + string);
    };

	process.on('uncaughtException', (err) => {
        console.log('Exception:', err);
    });

	process.on('SIGHUP', () => {
        console.log('Terminal closed. Now running as deamon.');
    });
	process.on('SIGINT', exitSave);
	process.on('SIGQUIT', exitSave);
	process.on('SIGTERM', exitSave);

	console.log('Process initing');
}
