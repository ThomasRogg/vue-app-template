"use strict";

/*
 * This is the only code which runs on the client outside of a module
 */

async function main() {
    if(loadedComponentsMap && window.location.protocol != 'http:' && window.location.protocol != 'https:') {
        // User downloaded the web page. Let him see a static version
        // Only possible with SSR enabled (loadedComponentsMap != null)
        return;
    }

    const FETCH_TIMEOUT_MS = 30000;

    let loadedModules = {}, loadedModulesAsync = {}, loadedComponents = {};

    let connectionErrorCount = 0;
    function connectionError(inc) {
        if(inc) {
            if(!connectionErrorCount++)
                document.getElementById('overlayNoConnection').style.display = '';
        } else {
            if(!--connectionErrorCount)
                document.getElementById('overlayNoConnection').style.display = 'none';
        }
    }

    let store, loadingCount = 0;
    function loading(inc) {
        if(inc) {
            if(!loadingCount++ && store)
                store.commit('loading', true);
        } else {
            if(!--loadingCount && store)
                store.commit('loading', false);
        }
    }

    function serverFetchSync(url, options) {
        let isStatus = true;
        function status(isStatusNow) {
            if(!isStatus && isStatusNow)
                connectionError(false);
            else if(isStatus && !isStatusNow)
                connectionError(true);
            isStatus = isStatusNow;
        }

        loading(true);
        while(true) {
            let request = new XMLHttpRequest();
            let ok = true;
            try {
                request.open('POST', url, false);
                request.responseType = 'text';
                if(options && options.fileNotFoundOK)
                    request.setRequestHeader('X-FileNotFound-OK', 'true')
                request.send(null);
            } catch(err) {
                ok = false;
            }

            if(ok && request.status >= 200 && request.status < 300 && (!request.getResponseHeader('X-FileNotFound') || (options && options.fileNotFoundOK))) {
                status(true);
                loading(false);

                return request.getResponseHeader('X-FileNotFound') ? undefined : request.responseText;
            } else if(ok && request.status) {
                document.getElementById('overlayPanic').style.display = '';
                throw new Error('syncronous fetch of ' + url + ' returned status code ' + request.status);
            }

            status(false);
        }
    }

    function serverFetchAsync(url, options) {
        let isStatus = true;
        function status(isStatusNow) {
            if(!isStatus && isStatusNow)
                connectionError(false);
            else if(isStatus && !isStatusNow)
                connectionError(true);
            isStatus = isStatusNow;
        }

        loading(true);
        return new Promise((resolve, reject) => {
            function loop1() {
                let done = false;

                let request = new XMLHttpRequest();
                request.open('POST', url, true);

                request.onload = () => {
                    if(done)
                        return;
                    done = true;

                    if(request.status >= 200 && request.status < 300 && (!request.getResponseHeader('X-FileNotFound') || (options && options.fileNotFoundOK))) {
                        status(true);
                        loading(false);

                        resolve(request.getResponseHeader('X-FileNotFound') ? undefined : request.responseText);
                    } else if(request.status)
                        panic(new Error('asyncronous fetch of ' + url + ' returned status code ' + request.status));
                    else {
                        status(false);
                        setTimeout(loop1, 1000);
                    }
                };
                request.onerror = () => {
                    if(done)
                        return;
                    done = true;

                    status(false);
                    setTimeout(loop1, 1000);
                };
                request.ontimeout = () => {
                    if(done)
                        return;
                    done = true;

                    status(false);
                    loop1();
                };

                request.responseType = 'text';
                request.timeout = FETCH_TIMEOUT_MS;
                if(options && options.fileNotFoundOK)
                    request.setRequestHeader('X-FileNotFoundOK', 'true')
                request.send();
            }
            loop1();
        });
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
        code = new Function('exports', 'require', 'module', '__filename', '__dirname', code);

        let module = {exports: {}};
        let pos = path.lastIndexOf('/');

        code(module.exports, (module) => {
            return requireAbsoluteSync(module[0] == '.' ? pathJoin(path, module) : module);
        }, module, path.substr(pos + 1), pos == -1 ? '' : path.substr(0, pos));

        loadedModules[path] = module.exports;
        return module.exports;
    }

    function requireAbsoluteSync(origPath, options) {
        let path;
        if(origPath[0] == '/')
            path = origPath + '.js';
        else
            path = '/lib/' + origPath + '.js';
        if(loadedModules[path])
            return loadedModules[path];

        console.warn('Fetching ' + path + ' in blocking mode as not loaded yet. Please use await require(\'[...]/main/lib\').requireAsync(\'' + origPath + '\') instead of require');

        let response = serverFetchSync(path, options);
        return response ? loadModule(path, response) : undefined;
    }

    async function requireAbsoluteAsync(path, options) {
        if(path[0] == '/')
            path += '.js';
        else
            path = '/lib/' + path + '.js';
        if(loadedModules[path])
            return loadedModules[path];

        let loadedPromise = loadedModulesAsync[path];
        if(!loadedPromise)
            loadedPromise = loadedModulesAsync[path] = async function() {
                let response = await serverFetchAsync(path, options);
                return response ? loadModule(path, response) : undefined;
            }();
        return await loadedPromise;
    }

    async function loadComponent(name, cssLoaded) {
        let loadedPromise = loadedComponents[name];
        if(!loadedPromise)
            loadedPromise = loadedComponents[name] = async function() {
                let elems = [
                    requireAbsoluteAsync('/components/' + name + '/code', {fileNotFoundOK: true}),
                    serverFetchAsync('/components/' + name + '/template.html', {fileNotFoundOK: true})
                ];
                if(!cssLoaded)
                    elems.push(serverFetchAsync('/components/' + name + '/style.css', {fileNotFoundOK: true}));
                elems = await Promise.all(elems);

                let code = elems[0];
                if(!code)
                    code = {};
                else if(typeof code == 'function')
                    code = await code();

                if(code.template === undefined) {
                    if(elems[1] === undefined)
                        throw new Error('/components/' + name + '/template.html not found');

                    let template = elems[1];
                    code.template = template;
                }

                if(!cssLoaded) {
                    let style = elems[2];
                    if(style) {
                        let node = document.createElement('style');
                        node.innerHTML = style;
                        document.head.appendChild(node);
                    }
                }

                return code;
            }();
        return await loadedPromise;
    }

    function panic(err) {
        document.getElementById('overlayPanic').style.display = '';
        console.error(err);

		// Block foreever
        return new Promise(() => {});
    }

    try {
        // Preload all libraries in parallel
        window._libExports = {
            requireAbsoluteAsync,
            panic
        }

        let libsPromises = [requireAbsoluteAsync('/main/lib')];
        for(let i = 0; i < preloadModules.length; i++)
            libsPromises.push(requireAbsoluteAsync(preloadModules[i]));
        libsPromises = await Promise.all(libsPromises);

        // Register components. The ones we are already using from SSR are loaded directly,
        // the other ones are lazy loaded
        const Vue = requireAbsoluteSync('vue');
        const VueRouter = requireAbsoluteSync('vue-router');
        const Vuex = requireAbsoluteSync('vuex');

        Vue.use(VueRouter);
        Vue.use(Vuex);

        let componentPromises = [
            requireAbsoluteAsync('/routes'),
            requireAbsoluteAsync('/store/index')
        ];
        for(let i = 0; i < components.length; i++) {
            if(loadedComponentsMap && loadedComponentsMap[components[i]]) {
                // Load now
                let promise = loadComponent(components[i], true);

                componentPromises.push(promise);
                Vue.component(components[i], (resolve, reject) => {
                    promise.then(resolve).catch(reject);
                });
            } else {
                // Load later
                Vue.component(components[i], (resolve, reject) => {
                    loadComponent(components[i]).then(resolve).catch(reject);
                });
            }
        }
        // We need to resolve all components here, because overwise hydration might bail
        componentPromises = await Promise.all(componentPromises);

        // Create app and hydrate from server
        let routes = componentPromises[0];
        if(typeof routes == 'function')
            routes = await routes();
        let storeData = componentPromises[1];
        if(typeof routes == 'function')
            storeData = await storeData();

        store = new Vuex.Store(storeData);
        if(storeState)
            store.replaceState(storeState);
        if(loadingCount)
            store.commit('loading', true);

        let app = new Vue({
            router: new VueRouter(routes),
            store,
            render: h => h('App')
        });
        app.$mount('body > :first-child', loadedComponentsMap ? true : false);
    } catch(err) {
        await panic(err);
    }
}
main();