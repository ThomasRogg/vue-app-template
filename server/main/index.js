"use strict";

const fs        = require('fs');
const http      = require('http');
const https     = require('https');
const path      = require('path');
const url       = require('url');

const config    = require('./config');
const files     = require('./files');
const ssr       = require('./ssr');

let zlib;
if(config.ENABLE_COMPRESSION)
    zlib = require('zlib');

/*
 * handleRequest
 *
 * Handles a HTTP/HTTPS request by
 * - first trying to .. file
 * lib bundle
 * api call
 * server side rendering
 * error page
 */

async function handleResponse(req, res, body) {
    let ext;

    // Prefer gzip to work around IE 11 bug
    let compression;
    if(config.ENABLE_COMPRESSION) {
        let acceptEncoding = req.headers['accept-encoding'] || '';
        if(acceptEncoding.match(/\bgzip\b/))
            compression = 'gzip';
        else if(acceptEncoding.match(/\bdeflate\b/))
            compression = 'deflate';
    }

    function fileNotFound() {
        if(req.method == 'GET' && !ext) {
            // File is not a static file... We give control to server side rendering, but compress here
            if(compression) {
                let resCompression;
                if(compression == 'gzip')
                    resCompression = zlib.createGzip();
                else if(compression == 'deflate')
                    resCompression = zlib.createDeflate();

                res.setHeader('Content-Encoding', compression);
                resCompression.setHeader = res.setHeader.bind(res);
                resCompression.writeHead = res.writeHead.bind(res);
                resCompression.pipe(res);
                res = resCompression;
            }
            ssr.handleRequest(req, res);
        } else {
            res.statusCode = 404;
            res.end();
            return;
        }
    }

    try {
        let urlObj = url.parse(req.url, false, false);
        let urlPath = urlObj.pathname;
        if(urlPath.substr(-1) == '/') {
            // A directory cannot be a static file
            fileNotFound();
            return;
        }

        let pos = urlPath.lastIndexOf('.');
        if(pos != -1)
            ext = config.FILE_EXTENSIONS[urlPath.substr(pos + 1).toLowerCase()];
        let javaScript = ext && ext.javaScript;

        let filePath;
        if(urlPath.substr(0, '/lib/'.length) == '/lib/' && javaScript) {
            filePath = config.LIBS[urlPath.substring('/lib/'.length, pos)];
            javaScript = false;
        }
        if(!filePath) {
            filePath = path.join(config.SRC_PATH, urlPath);
            // Do not allow access outside of source directory
            if(filePath.substr(0, config.SRC_PATH.length) != config.SRC_PATH) {
                res.statusCode = 403;
                res.end();
                return;
            }
        }

        if(ext && !ext.compress)
            compression = undefined;
        let file = await files.get(filePath, {
            compression,
            javaScript,
            isMainCode: urlPath == '/main/code.js',
            streamAllowed: true
        });
        if(!ext) {
            console.warn('unknown file type with ' + req.url)
            ext = config.FILE_EXTENSIONS['txt'];
        }

        res.setHeader('Content-Type', ext.mime);
        if(compression)
            res.setHeader('Content-Encoding', compression);

        if(file.stream)
            file.stream.pipe(res);
        else
            res.end(file.data);
    } catch(err) {
        if(err.code == 'ENOENT') {
            fileNotFound();
        } else {
            console.error(err);

            res.statusCode = 500;
            res.end();
        }
    }
}

function handleRequest(req, res) {
    let data = [], allSize = 0;

    req.on('data', (chunk) => {
        if(!data)
            return;

        allSize += chunk.length;
        if(allSize > config.MAX_BODY_SIZE) {
            console.error('reached maximum body size');

            res.statusCode = 500;
            res.end();

            data = null;
            return;
        }

        data.push(chunk);
    });
    req.on('end', () => {
        if(!data)
            return;

        handleResponse(req, res, Buffer.concat(data));
    });
}

function redirectRequest(req, res) {
    let host = req.headers['host'] || req.socket.localAddress;
    if(host.indexOf(':') >= 0)
        host = '[' + host + ']';
    let port = config.HTTPS_PORT == 443 ? '' : ':' + config.HTTPS_PORT;

    res.writeHead(301, {
        'Location': 'https://' + host + port + req.url
    });
    res.end();
}

async function main() {
    try {
        console.log("Loading...");

        let sslPromises;
        if(config.HTTPS_PORT) {
            sslPromises = [
                fs.promises.readFile(config.HTTPS_SSL_KEY),
                fs.promises.readFile(config.HTTPS_SSL_CERT),
                
            ];
            if(config.HTTPS_SSL_CA)
                sslPromises.push(fs.promises.readFile(config.HTTPS_SSL_CA));
            sslPromises = await Promise.all(sslPromises);
        }
        await files.init();
        await ssr.init();

        if(config.HTTP_PORT) {
            let server = http.createServer(config.HTTP_REDIRECT_HTTPS && config.HTTPS_PORT ? redirectRequest : handleRequest);
            server.listen(config.HTTP_PORT);
        }
        if(config.HTTPS_PORT) {
            let server = https.createServer({
                key: sslPromises[0],
                cert: sslPromises[1],
                ca: sslPromises[2]
            }, handleRequest);
            server.listen(config.HTTPS_PORT);
        }

        console.log("Ready.");
    } catch(err) {
        console.error(err);
    }
}
main();