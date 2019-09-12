"use strict";

const fs        = require('fs');
const path      = require('path');

const config    = require('./config');

let zlib, gzip, deflate;
if(config.ENABLE_COMPRESSION) {
    zlib = require('zlib');

    const util = require('util');
    gzip = util.promisify(zlib.gzip);
    deflate = util.promisify(zlib.deflate);
}

let babel, coreJSBuilder;
if(config.ENABLE_TRANSPILATION) {
    babel = require('@babel/core');
    coreJSBuilder = require('core-js-builder');
}

let cache = {}, mainPrefix = '';

exports.init = async function() {
    if(config.ENABLE_TRANSPILATION && config.TRANSPILATION_TARGETS && config.TRANSPILATION_TARGETS.length)
        mainPrefix
            = await coreJSBuilder({targets: config.TRANSPILATION_TARGETS}) + '\n'
            + await fs.readFileSync(path.join(__dirname, '../../node_modules/regenerator-runtime/runtime.js')) + '\n';
}

/*
 * options.compression      undefined, 'gzip' or 'deflate'
 * options.javaScript       handle transpilation and strict mode
 * options.isMainCode       adds coreJS bundle and regenerator runtime if transpiling is active
 * options.streamAllowed    allows to return a stream instead of the data if there is no need to load the file
 * 
 * Cache key is filePath x options.compression, so javaScript and isMainCode is expected to be the same always
 */

exports.get = async function get(filePath, options) {
    let key = filePath + (options.compression ? '/' + options.compression : '');

    let cachePromise = cache[key];
    if(!cachePromise) {
        let doTranspile = options.javaScript && config.ENABLE_TRANSPILATION;
        let doCache = config.CACHE_MAX_FILE_SIZE && (await fs.promises.stat(filePath)).size < config.CACHE_MAX_FILE_SIZE;

        if(options.streamAllowed && !doTranspile && !doCache) {
            // Return file streamed
            return await new Promise((resolve, reject) => {
                let stream = fs.createReadStream(filePath);
                stream.on('ready', () => {
                    resolve({stream});
                });
                stream.on('error', reject);

                if(options && options.compression == 'gzip') {
                    let compression = zlib.createGzip();
                    stream.pipe(compression);
                    stream = compression;
                } else if(options && options.compression == 'deflate') {
                    let compression = zlib.createDeflate();
                    stream.pipe(compression);
                    stream = compression;
                }
            });
        }

        async function handleLoad() {
            let data;
            if(options.javaScript) {
                data = await fs.promises.readFile(filePath, 'utf8');
                if(doTranspile) {
                    let pos = filePath.lastIndexOf('/');
                    let filename = pos == -1 ? filePath : filePath.substr(pos + 1);

                    let presets = [];
                    if(config.TRANSPILATION_TARGETS && config.TRANSPILATION_TARGETS.length)
                        presets.push([
                            '@babel/preset-env', {
                                'useBuiltIns': 'entry',
                                'corejs': 3,
                                'targets': config.TRANSPILATION_TARGETS
                            }
                        ]);
                    if(config.TRANSPILATION_MINIFY)
                        presets.push(['minify', {'mangle': {
                            'exclude': ['module', 'exports', '__dirname', '__filename']
                        }}]);

                    data = (await babel.transform(data, {
                        filename,
                        presets,
                        babelrc: false,
                        configFile: false,
                    })).code;
                }
                data = data.replace('"use strict"', '').replace("'use strict'", '');
                if(options.isMainCode)
                    data = mainPrefix + data;
                if(config.STRICT_MODE)
                    data = '"use strict";\n' + data;
                data = Buffer.from(data);
            } else
                data = await fs.promises.readFile(filePath);
            if(options && options.compression == 'gzip')
                data = await gzip(data);
            else if(options && options.compression == 'deflate')
                data = await deflate(data);

            return {data};
        }

        if(!doCache)
            return await handleLoad();
        cachePromise = cache[key] = handleLoad();
    }

    return await cachePromise;
}