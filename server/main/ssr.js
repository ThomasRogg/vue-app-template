"use strict";

const fs            = require('fs');
const path          = require('path');

const config        = require('../../config/config');

let Vue, vueRenderer;
if(config.ENABLE_SSR) {
    Vue = require('vue');
    vueRenderer = require('vue-server-renderer');
}

let template;

let renderer, components, appComponent;

exports.init = async function init() {
    let componentsPath = path.join(config.SRC_PATH, 'components');
    let paths = await fs.promises.readdir(componentsPath);

    components = [];
    for(let i = 0; i < paths.length; i++) {
        if(paths[i][0] == '.')
            continue;

        if(paths[i] != 'app')
            components.push(paths[i]);
        if(config.ENABLE_SSR) {
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
    }

    let html = await fs.promises.readFile(path.join(config.SRC_PATH, 'main/index.html'), 'utf8');
    html = html.replace('[[libs]]', JSON.stringify(Object.keys(config.LIBS)));
    html = html.replace('[[components]]', JSON.stringify(components));
    if(config.ENABLE_SSR)
        renderer = vueRenderer.createRenderer({template: html});
    else {
        let styles = await fs.promises.readFile(path.join(config.SRC_PATH, 'main/style.css'), 'utf8');
        html = html.replace('[[styles]]', styles);
        html = html.replace('[[loaded_components_map]]', 'null');

        template = html.replace('<!--vue-ssr-outlet-->', '<div id="app"></div>');
    }
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

        let styles = await fs.promises.readFile(path.join(config.SRC_PATH, 'main/style.css'), 'utf8');
        for(let name in componentNames) {
            try {
                styles += await fs.promises.readFile(path.join(config.SRC_PATH, 'components/' + name + '/style.css'), 'utf8');
            } catch(err) {
                if(err.code != 'ENOENT')
                    console.error(err);
            }
        }
        html = html.replace('[[styles]]', styles);
        html = html.replace('[[loaded_components_map]]', JSON.stringify(componentNames));

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
    });
} : async function handleRequest(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(template);
};