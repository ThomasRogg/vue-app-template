"use strict";

const fs        = require('fs');
const path      = require('path');

const config    = require('../../config/config');

const files     = require('./files');

let Vue, vueRenderer;
if(config.ENABLE_SSR) {
    Vue = require('vue');
    vueRenderer = require('vue-server-renderer');
}

let template;

let renderer, components, appComponent, styles;

let srcPath = path.join(__dirname, '../../src');

exports.init = async function init() {
    if(!config.ENABLE_SSR)
        return;

    let componentsPath = path.join(srcPath, 'components');
    let paths = await fs.promises.readdir(componentsPath);

    components = [];
    for(let i = 0; i < paths.length; i++) {
        if(paths[i][0] == '.')
            continue;

        components.push(paths[i]);
        let code;

        try {
            code = require(componentsPath + '/' + paths[i] + '/code');
        } catch(e) {
            if(e.code != 'MODULE_NOT_FOUND')
                throw e;

            code = {};
        }
        if(typeof code == 'function')
            code = await code();
        if(!code.template)
            code.template = '<div id="' + paths[i] + '">' + await fs.promises.readFile(componentsPath + '/' + paths[i] + '/template.html', 'utf8') + '</div>';

        if(paths[i] == 'app')
            appComponent = code;
        else {
            components.push(paths[i]);
            Vue.component(paths[i], code);
        }
    }

    let template = await fs.promises.readFile(path.join(srcPath, 'index.html'), 'utf8');
    template = template.replace('[[libs]]', JSON.stringify(config.PRELOAD_MODULES));
    template = template.replace('[[components]]', JSON.stringify(components));
    renderer = vueRenderer.createRenderer({template});

    styles = '';
    for(let i = 0; i < config.STYLES.length; i++)
        styles += await fs.promises.readFile(config.STYLES[i], 'utf8') + '\n';
}

exports.handleRequest = config.ENABLE_SSR ? function handleRequest(req, res) {
    let app = new Vue(appComponent);
    renderer.renderToString(app, async (err, html) => {
        if(err) {
            console.error(err);

            res.statusCode = 500;
            res.end();

            return;
        }

        let componentNames = {'app': true};
        let compSet = new Set();
        function iterateComponents(component) {
            if(compSet.has(component))
                return;
            compSet.add(component);
    
            let name = component.$options.name;
            if(name)
                componentNames[name] = true;
            for(let i = 0; i < component.$children.length; i++)
                iterateComponents(component.$children[i]);
        }
        iterateComponents(app);

        let htmlStyles = styles;
        for(let name in componentNames) {
            try {
                htmlStyles += (await files.get(path.join(srcPath, 'components/' + name + '/style.css'), {})).data.toString() + '\n';
            } catch(err) {
                if(err.code != 'ENOENT')
                    console.error(err);
            }
        }
        html = html.replace('[[styles]]', htmlStyles);
        html = html.replace('[[loaded_components_map]]', JSON.stringify(componentNames));

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
    });
} : async function handleRequest(req, res) {
    let componentsPath = path.join(srcPath, 'components');
    let paths = await fs.promises.readdir(componentsPath);

    components = [];
    for(let i = 0; i < paths.length; i++) {
        if(paths[i][0] == '.')
            continue;

        components.push(paths[i]);
    }

    let html = (await files.get(path.join(srcPath, 'index.html'), {})).data.toString();
    html = html.replace('[[libs]]', JSON.stringify(config.PRELOAD_MODULES));
    html = html.replace('[[components]]', JSON.stringify(components));
    let styles = '';
    for(let i = 0; i < config.STYLES.length; i++)
        styles += (await files.get(config.STYLES[i], {})).data.toString() + '\n';
    html = html.replace('[[styles]]', styles);
    html = html.replace('[[loaded_components_map]]', 'null');
    html = html.replace('<!--vue-ssr-outlet-->', '<div id="app"></div>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
};