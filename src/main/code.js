"use strict";

/*
 * This is the only code which runs on the client outside of a module
 */

async function main() {
    let loadedModules = {}, loadedModulesAsync = {}, loadedComponents = {};

    function serverFetchSync() {

    }

    async function serverFetchAsync() {

    }

    function pathJoin(baseFile, file) {
        let part1 = baseFile.split('/');
        part1.pop();
        let parts = part1.concat(file.split('/'));

        let newParts = [parts[0]];
        for(let i = 1; i < parts.length; i++) {
            let part = parts[i];
            if(!part || part == '.')
                continue;

            if(part == '..')
                newParts.pop();
            else
                newParts.push(part);
        }

        return newParts.join('/');
    }

    function loadModule(path, code) {
        let pos = path.lastIndexOf('/');
        code = new Function('exports', 'require', 'module', '__filename', '__dirname', code);

        let module = {exports: {}};
        code(module.exports, (module) => {
            return requireAbsoluteSync(module[0] == '.' ? pathJoin(path, module) : module);
        }, module, path.substr(pos + 1), pos == -1 ? '' : path.substr(0, pos));

        loadedModules[path] = module.exports;
        return module.exports;
    }

    function requireAbsoluteSync(origPath) {
        let path;
        if(origPath[0] == '/')
            path = origPath + '.js';
        else
            path = '/lib/' + origPath + '.js';
        if(loadedModules[path])
            return loadedModules[path];

        console.warn('Fetching ' + path + ' in blocking mode as not loaded yet. Please use await require(\'[...]/main/lib\').requireAsync(\'' + origPath + '\') instead of require');

        let request = new XMLHttpRequest();
        request.open('POST', path, false);                         // POST to make sure we get static files
        request.send(null);

        if(request.status < 200 || request.status >= 300)
            throw new Error('fetch of ' + path + ' failed with status code ' + request.status);
        return loadModule(path, request.responseText);
    }

    async function requireAbsoluteAsync(path) {
        if(path[0] == '/')
            path += '.js';
        else
            path = '/lib/' + path + '.js';
        if(loadedModules[path])
            return loadedModules[path];

        if(!loadedModulesAsync[path])
            loadedModulesAsync[path] = async function() {
                let response = await fetch(path, { method: 'POST' });      // POST to make sure we get static files
                if(response.status < 200 || response.status >= 300)
                    throw new Error('fetch of ' + path + ' failed with status code ' + response.status);

                return loadModule(path, await response.text());
            };
        return await loadedModulesAsync[path]();
    }

    async function loadComponent(name) {
        if(!loadedComponents[name])
            loadedComponents[name] = async function() {
                let elems = [
                    requireAbsoluteAsync('/components/' + name + '/code'),
                    fetch('/components/' + name + '/template.html', { method: 'POST' })
                ];
                if(!loadedComponentStyles[name])
                    elems.push(fetch('/components/' + name + '/style.css', { method: 'POST' }));
                elems = await Promise.all(elems);

                let code = elems[0];
                if(!code.component.template) {
                    let template = elems[1];
                    if(template.status < 200 || template.status >= 300)
                        throw new Error('fetch of /components/' + name + '/template.html failed with status code ' + template.status);

                    code.component.template = '<div id="' + name + '">' + (await template.text()) + '</div>';
                }

                if(!loadedComponentStyles[name]) {
                    let style = elems[2];
                    if(style.status != 404) {
                        if(style.status < 200 || style.status >= 300)
                            throw new Error('fetch of /components/' + name + '/template.html failed with status code ' + template.status);

                        let node = document.createElement('style');
                        node.innerHTML = await style.text();
                        document.head.appendChild(node);
                    }
                }

                return code.component;
            };
        return await loadedComponents[name]();
    }

    function panic(err) {
        document.getElementById('overlayPanic').style.display = '';
        throw err;
    }

    try {
        // Preload all libraries in parallel
        let libsPromises = [requireAbsoluteAsync('/main/lib')];
        for(let i = 0; i < libs.length; i++)
            libsPromises.push(requireAbsoluteAsync(libs[i]));
        libsPromises = await Promise.all(libsPromises);

        // Setup lib
        let lib = libsPromises[0];

        lib.requireAsync = requireAbsoluteSync;
        lib.panic = panic;

        // Register all components other than app for lazy load
        const Vue = requireAbsoluteSync('vue');

        for(let i = 0; i < components.length; i++) {
            Vue.component(components[i], (resolve, reject) => {
                loadComponent(components[i]).then(resolve).catch(reject);
            });
        }

        let app = new Vue(await loadComponent('app'));
        // Hydrate from server
        app.$mount('#app', true);
    } catch(err) {
        panic(err);
    }
}
main();