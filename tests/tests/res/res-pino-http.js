// must be seen as completed by pino-http, not aborted

const express = require("express");
const pinoHttp = require("pino-http");

const app = express();

const lines = [];
app.use(pinoHttp({
    // drop pid, hostname and time, so the two runs print the same
    base: null,
    timestamp: false
}, {
    write: line => {
        const log = JSON.parse(line);
        lines.push(`${log.msg} ${log.res.statusCode}`);
    }
}));

app.get('/test', (req, res) => {
    res.end('bye');
});

app.listen(13335, async () => {
    const response = await fetch('http://localhost:13335/test');
    console.log(await response.text());

    setTimeout(() => {
        console.log(lines.join('\n'));
        process.exit(0);
    }, 100);
});
