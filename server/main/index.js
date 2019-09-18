"use strict";

const fs        = require('fs');
const http      = require('http');
const https     = require('https');

const config    = require('../../config/config');

const logs      = require('./logs');
const web       = require('./web');
const files     = require('./files');
const ssr       = require('./ssr');

if(!config.EXIT_ON_UNCAUGHT)
    process.on('uncaughtException', console.error);

process.on('SIGHUP', config.EXIT_ON_SHELL_CLOSE ? exitGracefully : () => {
    console.log('Terminal closed. Now running as deamon.');
});

function exitGracefully() {
    console.log('Process exiting...');
    logs.waitWrite(() => {
        process.exit(0);
    });
}
process.on('SIGINT', exitGracefully);
process.on('SIGQUIT', exitGracefully);
process.on('SIGTERM', exitGracefully);

async function main() {
    try {
        await logs.init();

        console.log('Process initializing...');

        await files.init();
        await ssr.init();

        // Start servers
        if(config.HTTP_PORT) {
            let server = http.createServer(web.httpRequest);
            server.on('error', (err) => {
                console.error(err,server.listening);
                if(!server.listening)
                    process.exit(1);
            });
            server.listen(config.HTTP_PORT);

            console.log('HTTP server available on port ' + config.HTTP_PORT);
        }
        if(config.HTTPS_PORT) {
            let sslPromises = [
                fs.promises.readFile(config.HTTPS_SSL_KEY),
                fs.promises.readFile(config.HTTPS_SSL_CERT)
            ];
            if(config.HTTPS_SSL_CA)
                sslPromises.push(fs.promises.readFile(config.HTTPS_SSL_CA));
            sslPromises = await Promise.all(sslPromises);

            let server = https.createServer({
                key: sslPromises[0],
                cert: sslPromises[1],
                ca: sslPromises[2]
            }, web.httpsRequest);
            server.on('error', (err) => {
                console.error(err,server.listening);
                if(!server.listening)
                    process.exit(1);
            });
            server.listen(config.HTTPS_PORT);

            console.log('HTTPS server available on port ' + config.HTTPS_PORT);
        }
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
main();