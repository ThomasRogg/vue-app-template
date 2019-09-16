"use strict";

const fs        = require('fs');
const path      = require('path');

const config    = require('../../config/config');

const files     = require('./files');

let Vue, VueRouter, VueRenderer, Vuex;
if(config.ENABLE_SSR) {
    Vue = require('vue');
    VueRouter = require('vue-router');
    Vuex = require('vuex');
    VueRenderer = require('vue-server-renderer');

    Vue.use(VueRouter);
    Vue.use(Vuex);
    Vue.use(VueRenderer);
}

let renderer, components, styles;
let routes, storeData;

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

        let ok = false;
        try {
            await fs.promises.access(componentsPath + '/' + paths[i] + '/code.js');
            ok = true;
        } catch(e) {}

        let code;
        if(ok) {
            code = require(componentsPath + '/' + paths[i] + '/code.js');
            if(typeof code == 'function')
                code = await code();
        } else
            code = {};
        if(code.template === undefined)
            code.template = await fs.promises.readFile(componentsPath + '/' + paths[i] + '/template.html', 'utf8');

        Vue.component(paths[i], code);
    }

    routes = require('../../src/routes');
    storeData = require('../../src/store/index');

    let template = await fs.promises.readFile(path.join(srcPath, 'index.html'), 'utf8');
    template = template.replace('[[preload_modules]]', JSON.stringify(config.PRELOAD_MODULES));
    template = template.replace('[[components]]', JSON.stringify(components));
    renderer = VueRenderer.createRenderer({template});

    styles = [];
    for(let i = 0; i < config.STYLES.length; i++)
        styles.push(fs.promises.readFile(config.STYLES[i], 'utf8'));
    styles = (await Promise.all(styles)).join('\n');
}

exports.handleRequest = config.ENABLE_SSR ? function handleRequest(req, res) {
    let router = new VueRouter(routes);
    let store = new Vuex.Store(storeData);
    let app = new Vue({
        router,
        store,
        render: h => h('App')
    });

    router.onReady(() => {
        let context = {
            statusCode: 200,
            rendered() {
                context.storeState = JSON.stringify(store.state);
            }
        };
        renderer.renderToString(app, context, async (err, html) => {
            if(err) {
                console.error(err);

                res.statusCode = 500;
                res.end();

                return;
            }

            let componentNames = {};
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

            let htmlStyles = [styles];
            for(let name in componentNames) {
                try {
                    htmlStyles.push((await files.get(path.join(srcPath, 'components/' + name + '/style.css'), {})).data.toString());
                } catch(err) {
                    if(err.code != 'ENOENT')
                        console.error(err);
                }
            }
            html = html.replace('[[styles]]', htmlStyles.join('\n'));
            html = html.replace('[[loaded_components_map]]', JSON.stringify(componentNames));

            let proto = req.connection.encrypted ? 'https://' : 'http://';
            let port = req.socket.localPort == (req.connection.encrypted ? 443 : 80) ? '' : ':' + req.socket.localPort;
            let host = req.headers['host'];
            if(host) {
                if(host.lastIndexOf(']') < host.lastIndexOf(':'))
                    port = '';
                else if(host.indexOf(':') >= 0)
                        host = '[' + host + ']';
            } else {
                host = req.socket.localAddress;
                if(host.indexOf(':') >= 0)
                    host = '[' + host + ']';
            }
            html = html.replace('[[base]]', proto + host + port + '/');

            res.writeHead(context.statusCode, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(html);
        });
    });
    router.push(req.url);
} : async function handleRequest(req, res) {
    let componentsPath = path.join(srcPath, 'components');
    let paths = await fs.promises.readdir(componentsPath);

    let components = [];
    for(let i = 0; i < paths.length; i++) {
        if(paths[i][0] == '.')
            continue;
        components.push(paths[i]);
    }

    let html = (await files.get(path.join(srcPath, 'index.html'), {})).data.toString();
    html = html.replace('[[preload_modules]]', JSON.stringify(config.PRELOAD_MODULES));
    html = html.replace('[[components]]', JSON.stringify(components));
    let styles = [];
    for(let i = 0; i < config.STYLES.length; i++)
        styles.push((await files.get(config.STYLES[i], {})).data.toString());
    html = html.replace('[[styles]]', styles.join('\n'));
    html = html.replace('[[loaded_components_map]]', 'null');
    html = html.replace('{{{storeState}}}', 'null');

    let proto = req.connection.encrypted ? 'https://' : 'http://';
    let port = req.socket.localPort == (req.connection.encrypted ? 443 : 80) ? '' : ':' + req.socket.localPort;
    let host = req.headers['host'];
    if(host) {
        if(host.lastIndexOf(']') < host.lastIndexOf(':'))
            port = '';
        else if(host.indexOf(':') >= 0)
                host = '[' + host + ']';
    } else {
        host = req.socket.localAddress;
        if(host.indexOf(':') >= 0)
            host = '[' + host + ']';
    }
    html = html.replace('[[base]]', proto + host + port + '/');

    html = html.replace('<!--vue-ssr-outlet-->', '<div></div>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
};