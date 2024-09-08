function pathMatches(pattern, path) {
    // /abcd - /abcd
    // /abc?d - /abcd, /abd
    // /ab+cd - /abcd, /abbcd, /abbbbbcd, and so on
    // /ab*cd -  /abcd, /abxcd, /abFOOcd, /abbArcd, and so on
    // /a(bc)?d - /ad and /abcd
    // /:test - /a, /b, /c as query params
    // /* - anything
    // /test/* - /test/a, /test/b, /test/c, /test/a/b/c, and so on
    // /test/:test - /test/a, /test/b, /test/c, /test/a/b/c, and so on

    if(pattern instanceof RegExp) {
        return pattern.test(path);
    }
    
    if(pattern === '*' || pattern === '/*') {
        return true;
    }

    return pattern === path;
}

function patternToRegex(pattern) {
    let regexPattern = pattern
        .replace(/\//g, '\\/') // Escape slashes
        .replace(/\*/g, '.*') // Convert * to .*
        .replace(/:(\w+)/g, (match, param) => {
            return `(?<${param}>[^/]+)`;
        }); // Convert :param to capture group

    return new RegExp(`^${regexPattern}$`);
}

function needsConversionToRegex(pattern) {
    if(pattern === '*' || pattern === '/*') {
        return false;
    }

    return pattern.includes('*') || pattern.includes('?') || pattern.includes('+') || pattern.includes('(') || pattern.includes(')') || pattern.includes(':');
}

const methods = [
    'get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace', 'connect',
    'checkout', 'copy', 'lock', 'mkcol', 'move', 'purge', 'propfind', 'proppatch',
    'search', 'subscribe', 'unsubscribe', 'report', 'mkactivity', 'checkout', 'merge',
    'm-search', 'notify', 'subscribe', 'unsubscribe', 'search'
];

export default class Router {
    #app;
    #routes;
    constructor(app) {
        this.#app = app;
        this.#routes = [];

        methods.forEach(method => {
            this[method] = (path, callback) => {
                this.#createRoute(method.toUpperCase(), path, callback);
            };
        });
    }
    #createRoute(method, path, callback) {
        const route = {
            method,
            path,
            pattern: needsConversionToRegex(path) ? patternToRegex(path) : path,
            callback,
        };
        
        this.#routes.push(route);
    }

    #extractParams(pattern, path) {
        let match = pattern.exec(path);
        return match.groups;
    }

    #preprocessRequest(req, route) {
        if(route.pattern instanceof RegExp) {
            req.params = this.#extractParams(route.pattern, req.path);
        } else {
            req.params = {};
        }
    }

    async route(req, res, i = 0) {
        return new Promise(async (resolve, reject) => {
            while (i < this.#routes.length) {
                const route = this.#routes[i];
                if ((route.method === req.method || route.method === 'ALL') && pathMatches(route.pattern, req.path)) {
                    let calledNext = false;
                    this.#preprocessRequest(req, route);
                    await route.callback(req, res, function next() {
                        calledNext = true;
                        resolve(this.route(req, res, i + 1));
                    });
                    if(!calledNext) {
                        resolve(true);
                    }
                    return;
                }
                i++;
            }
            resolve(false);
        });
    }
    all(path, callback) {
        this.#createRoute('ALL', path, callback);
    }
}