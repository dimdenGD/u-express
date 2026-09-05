# µExpress / Ultimate Express

The *Ultimate* Express. Fastest http server with **full** Express compatibility, based on µWebSockets.

This library is a very fast re-implementation of Express.js 4.
It is designed to be a drop-in replacement for Express.js, with the same API and functionality, while being much faster. It is not a fork of Express.js.  
To make sure µExpress matches behavior of Express in all cases, we run all tests with Express first, and then with µExpress and compare results to make sure they match.  

`npm install ultimate-express` -> replace `express` with `ultimate-express` -> done[*](https://github.com/dimdenGD/ultimate-express?tab=readme-ov-file#differences-from-express)  

[![Node.js >= 22.0.0](https://img.shields.io/badge/Node.js-%3E=22.0.0-green)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/ultimate-express?label=last+version)](https://npmjs.com/package/ultimate-express)
[![Patreon](https://img.shields.io/badge/donate-Patreon-orange)](https://patreon.com/dimdendev)

> Use `npm install ultimate-express@2.1.0` to install last version that supported Node.js v21, v20 and v19.

> Use `npm install ultimate-express@node-v18` to install last version that supported Node.js v18.

## Difference from similar projects

Similar projects based on uWebSockets:

- `express` on Bun - since Bun uses uWS for its HTTP module, Express is about 2-3 times faster than on Node.js, but still almost 2 times slower than µExpress because it doesn't do uWS-specific optimizations.
- `hyper-express` - while having a similar API to Express, it's very far from being a drop-in replacement, and implements most of the functionality differently. This creates a lot of random quirks and issues, making the switch quite difficult. Built in middlewares are also very different, middlewares for Express are mostly not supported.
- `uwebsockets-express` - this library is closer to being a drop-in replacement, but misses a lot of APIs, depends on Express by calling it's methods under the hood and doesn't try to optimize routing by using native uWS router.

## Performance

### Performance against Express

Tested using [wrk](https://github.com/wg/wrk) (`-d 60 -t 1 -c 200`). Tested on Ubuntu 22.04, Node.js 20.17.0, AMD Ryzen 5 3600, 64GB RAM.

| Test                                          | Express req/sec | µExpress req/sec | Express throughput | µExpress throughput | µExpress speedup |
| --------------------------------------------- | --------------- | ---------------- | ------------------ | ------------------- | ---------------- |
| routing/simple-routes (/)                     | 11.16k          | 75.14k           | 2.08 MB/sec        | 14.46 MB/sec        | **6.73X**        |
| routing/lot-of-routes (/999)                  | 4.63k           | 54.57k           | 0.84 MB/sec        | 10.03 MB/sec        | **11.78X**       |
| routing/some-middlewares (/90)                | 10.12k          | 61.92k           | 1.79 MB/sec        | 11.32 MB/sec        | **6.12X**        |
| routers/nested-routers (/abccc/nested/ddd)    | 10.18k          | 51.15k           | 1.82 MB/sec        | 9.40 MB/sec         | **5.02X**        |
| middlewares/express-static (/static/index.js) | 6.58k           | 32.45k           | 10.15 MB/sec       | 49.43 MB/sec        | **4.87X**        |
| engines/ejs (/test)                           | 5.50k           | 40.82k           | 2.45 MB/sec        | 18.38 MB/sec        | **7.42X**        |
| middlewares/body-urlencoded (/abc)            | 8.07k           | 50.52k           | 1.68 MB/sec        | 10.78 MB/sec        | **6.26X**        |
| middlewares/compression-file (/small-file)    | 4.81k           | 14.92k           | 386 MB/sec         | 1.17 GB/sec         | **3.10X**        |

### Performance against other frameworks
 - [TechEmpower / FrameworkBenchmarks](https://www.techempower.com/benchmarks/#section=data-r23&test=plaintext&l=zik0sf-pa7)
 - [the-benchmarker / web-frameworks](https://web-frameworks-benchmark.netlify.app/result?l=javascript)
 - [HttpArena](https://www.http-arena.com/leaderboard/)

### Performance on real-world application

Also tested on a [real-world application](https://nekoweb.org) with templates, static files and dynamic pages with data from database, and showed 1.5-4X speedup in requests per second depending on the page.

## Differences from Express

In a lot of cases, you can just replace `require("express")` with `require("ultimate-express")` and everything works the same. But there are some differences:

- `case sensitive routing` is enabled by default.
- a new option `catch async errors` is added. If it's enabled, you don't need to use `express-async-errors` module.
- request body is only read for POST, PUT and PATCH requests by default. You can add additional methods by setting `body methods` to array with uppercased methods.
- For HTTPS, instead of doing this:  
```js
const https = require("https");
const express = require("express");

const app = express();

https.createServer({
    key: fs.readFileSync('path/to/key.pem'),
    cert: fs.readFileSync('path/to/cert.pem')
}, app).listen(3000, () => {
    console.log('Server is running on port 3000');
});
```

You have to pass `uwsOptions` to the `express()` constructor:
```js
const express = require("ultimate-express");

const app = express({
    uwsOptions: {
        // https://unetworking.github.io/uWebSockets.js/generated/interfaces/AppOptions.html
        key_file_name: 'path/to/key.pem',
        cert_file_name: 'path/to/cert.pem'
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
```

- This also applies to non-SSL HTTP too. Do not create http server manually, use `app.listen()` instead.
- Node.JS max header size is 16384 bytes, while uWebSockets by default is 4096 bytes, so if you need longer headers set the env variable `UWS_HTTP_MAX_HEADERS_SIZE` to max byte count you need.

## Performance tips

1. µExpress tries to optimize routing as much as possible, but it's only possible if:
- `case sensitive routing` is enabled (it is by default, unlike in normal Express).
- only string paths without regex characters like *, +, (), {}, etc. can be optimized.
  
Optimized routes can be up to 10 times faster than normal routes, as they're using native uWS router and have pre-calculated path.

2. Do not use external `serve-static` module. Instead use built-in `express.static()` middleware, which is optimized for uExpress.

3. Do not use `body-parser` module. Instead use built-in `express.text()`, `express.json()` etc.

4. Do not set `body methods` to read body of requests with GET method or other methods that don't need a body. Reading body makes endpoint about 15% slower.

5. By default, µExpress creates 1 (or 0 if your CPU has only 1 core) child thread to improve performance of reading files. You can change this number by setting `threads` to a different number in `express()`, or set to 0 to disable thread pool (`express({ threads: 0 })`). Threads are shared between all express() instances, with largest `threads` number being used. Using more threads will not necessarily improve performance. Sometimes not using threads at all is faster, please [test](https://github.com/wg/wrk/) both options.

## WebSockets

Since you don't create http server manually, you can't properly use http.on("upgrade") to handle WebSockets. To solve this, there's currently 2 options:

- There's a sister library that implements `ws` compatible API: [Ultimate WS](https://github.com/dimdenGD/ultimate-ws). It's same concept as this library, but for WebSockets: fast drop-in replacement for `ws` module with support for Ultimate Express upgrades. There's a guide for how to upgrade http requests in the documentation.  
- You can simply use `app.uwsApp` to access uWebSockets.js `App` instance and call its `ws()` method directly.

## HTTP/3

HTTP/3 is supported. To use:

```js
const app = express({
  http3: true,
  uwsOptions: {
    key_file_name: '/path/to/example.key',
    cert_file_name: '/path/to/example.crt'
  }
});
```

## Compatibility

In general, basically all features and options are supported. Use [Express 4.x documentation](https://expressjs.com/en/4x/api.html) for API reference.

✅ - Full support (all features and options are supported)  
🚧 - Partial support (some options are not supported)  
❌ - Not supported  

### express

- ✅ express()
- ✅ express.Router()
- ✅ express.json()
- ✅ express.urlencoded()
- ✅ express.static()
- ✅ express.text()
- ✅ express.raw()
- 🚧 express.request (this is not a constructor but a prototype for replacing methods)
- 🚧 express.response (this is not a constructor but a prototype for replacing methods)

### Application

- ✅ app.listen(port[, host][, callback])
- ✅ app.listen(unix_socket[, callback])
- ✅ app.METHOD() (app.get, app.post, etc.)
- ✅ app.route()
- ✅ app.all()
- ✅ app.use()
- ✅ app.mountpath
- ✅ app.set()
- ✅ app.get()
- ✅ app.enable()
- ✅ app.disable()
- ✅ app.enabled()
- ✅ app.disabled()
- ✅ app.path()
- ✅ app.param(name, callback)
- ✅ app.param(callback)
- ✅ app.engine()
- ✅ app.render()
- ✅ app.locals
- ✅ app.settings
- ✅ app.engines
- ✅ app.on("mount")
- ✅ HEAD method
- ✅ OPTIONS method

### Application settings

- ✅ case sensitive routing
- ✅ env
- ✅ etag
- ✅ jsonp callback name
- ✅ json escape
- ✅ json replacer
- ✅ json spaces
- ✅ query parser
- ✅ strict routing
- ✅ subdomain offset
- ✅ trust proxy
- ✅ views
- ✅ view cache
- ✅ view engine
- ✅ x-powered-by

### Request
- ✅ implements Readable stream
- ✅ req.app
- ✅ req.baseUrl
- ✅ req.body
- ✅ req.cookies
- ✅ req.fresh
- ✅ req.hostname
- ✅ req.header
- ✅ req.headers
- ✅ req.headersDistinct
- ✅ req.rawHeaders
- ✅ req.ip
- ✅ req.ips
- ✅ req.method
- ✅ req.url
- ✅ req.originalUrl
- ✅ req.params
- ✅ req.path
- ✅ req.protocol
- ✅ req.query
- ✅ req.res
- ✅ req.secure
- ✅ req.signedCookies
- ✅ req.stale
- ✅ req.subdomains
- ✅ req.xhr
- 🚧 req.route (route implementation is different from Express)
- 🚧 req.connection, req.socket (only `end()`, `encrypted`, `remoteAddress`, `remotePort` and `localPort` are supported)
- ✅ req.accepts()
- ✅ req.acceptsCharsets()
- ✅ req.acceptsEncodings()
- ✅ req.acceptsLanguages()
- ✅ req.get()
- ✅ req.is()
- ✅ req.param()
- ✅ req.range()

### Response

- ✅ implements Writable stream
- ✅ res.app
- ✅ res.headersSent
- ✅ res.req
- ✅ res.locals
- ✅ res.append()
- ✅ res.attachment()
- ✅ res.cookie()
- ✅ res.clearCookie()
- ✅ res.download()
- ✅ res.end()
- ✅ res.format()
- ✅ res.getHeader(), res.get()
- ✅ res.json()
- ✅ res.jsonp()
- ✅ res.links()
- ✅ res.location()
- ✅ res.redirect()
- ✅ res.render()
- ✅ res.send()
- ✅ res.sendFile()
- - ✅ options.maxAge
- - ✅ options.root
- - ✅ options.lastModified
- - ✅ options.headers
- - ✅ options.dotfiles
- - ✅ options.acceptRanges
- - ✅ options.cacheControl
- - ✅ options.immutable
- - ✅ Range header
- - ✅ Setting ETag header
- - ✅ If-Match header
- - ✅ If-Modified-Since header
- - ✅ If-Unmodified-Since header
- - ✅ If-Range header
- ✅ res.sendStatus()
- ✅ res.header(), res.setHeader(), res.set()
- ✅ res.status()
- ✅ res.type()
- ✅ res.vary()
- ✅ res.removeHeader()
- ✅ res.write()
- ✅ res.writeHead()

### Router

- ✅ router.all()
- ✅ router.METHOD() (router.get, router.post, etc.)
- ✅ router.route()
- ✅ router.use()
- ✅ router.param(name, callback)
- ✅ router.param(callback)
- ✅ options.caseSensitive
- ✅ options.strict
- ✅ options.mergeParams

## Tested middlewares

Almost all middlewares that are compatible with Express are compatible with µExpress. Here's list of middlewares that we test for compatibility:

- ✅ [body-parser](https://npmjs.com/package/body-parser) (use `express.text()` etc instead for better performance)
- ✅ [cookie-parser](https://npmjs.com/package/cookie-parser)
- ✅ [cookie-session](https://npmjs.com/package/cookie-session)
- ✅ [compression](https://npmjs.com/package/compression)
- ✅ [serve-static](https://npmjs.com/package/serve-static) (use `express.static()` instead for better performance)
- ✅ [serve-index](https://npmjs.com/package/serve-index)
- ✅ [cors](https://npmjs.com/package/cors)
- ✅ [errorhandler](https://npmjs.com/package/errorhandler)
- ✅ [method-override](https://npmjs.com/package/method-override)
- ✅ [multer](https://npmjs.com/package/multer)
- ✅ [response-time](https://npmjs.com/package/response-time)
- ✅ [express-fileupload](https://npmjs.com/package/express-fileupload)
- ✅ [express-session](https://npmjs.com/package/express-session)
- ✅ [express-rate-limit](https://npmjs.com/package/express-rate-limit)
- ✅ [express-subdomain](https://npmjs.com/package/express-subdomain)
- ✅ [vhost](https://npmjs.com/package/vhost)
- ✅ [tsoa](https://github.com/lukeautry/tsoa)
- ✅ [express-mongo-sanitize](https://www.npmjs.com/package/express-mongo-sanitize)
- ✅ [helmet](https://www.npmjs.com/package/helmet)
- ✅ [passport](https://www.npmjs.com/package/passport)
- ✅ [morgan](https://www.npmjs.com/package/morgan)
- ✅ [pino-http](https://www.npmjs.com/package/pino-http)
- ✅ [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)
- ✅ [graphql-http](https://www.npmjs.com/package/graphql-http)
- ✅ [better-sse](https://www.npmjs.com/package/better-sse)
- ✅ [supertest](https://www.npmjs.com/package/supertest)

Middlewares and modules that are confirmed to not work:

- ❌ [express-async-errors](https://npmjs.com/package/express-async-errors) - doesn't work, use `app.set('catch async errors', true)` instead.

## Tested view engines

Any Express view engine should work. Here's list of engines we include in our test suite:

- ✅ [ejs](https://npmjs.com/package/ejs)
- ✅ [pug](https://npmjs.com/package/pug)
- ✅ [express-dot-engine](https://npmjs.com/package/express-dot-engine)
- ✅ [express-art-template](https://npmjs.com/package/express-art-template)
- ✅ [express-handlebars](https://npmjs.com/package/express-handlebars)
- ✅ [swig](https://npmjs.com/package/swig)
