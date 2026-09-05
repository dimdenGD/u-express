// must set res.writableEnded after end(), like a node Writable

const express = require("express");

const app = express();

app.get('/test', (req, res) => {
    console.log('before', res.writableEnded);
    res.end('bye');
    console.log('after', res.writableEnded);
    console.log('aborted', req.readableAborted);
});

app.listen(13334, async () => {
    const response = await fetch('http://localhost:13334/test');
    console.log(await response.text());

    process.exit(0);
});
