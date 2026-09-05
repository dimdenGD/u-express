// must support res.connection

const express = require("express");

const app = express();

app.get('/test', (req, res) => {
    console.log(res.writableFinished);
    console.log(res.connection.writable);
    // res.socket and res.writableFinished right after end() are not printed:
    // node moved when the socket is detached, so express drifts between minors
    res.end('bye', () => {
        console.log('end callback');
    });
});

app.get('/test2', (req, res) => {
    res.end('on cb')
    console.log(res.socket !== null) // since express/node.js end is asynchronous
    setImmediate(() => {
        console.log(res.socket) // should be null
    })
})

app.listen(13333, async () => {
    console.log('Server is running on port 13333');

    const response = await fetch('http://localhost:13333/test');
    console.log(await response.text());

    process.exit(0);
});