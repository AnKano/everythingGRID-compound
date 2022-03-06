const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const net = require('net');

const app = express();
const expressPort = 3000;
const tcpPort = 3020;

const root = path.dirname(__filename);

const privateKey = fs.readFileSync(`${root}/key.pem`);
const certificate = fs.readFileSync(`${root}/cert.pem`);

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Cross-Origin-Opener-Policy', 'same-origin');
    res.append('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

app.use(express.static(`${root}/static`));

https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(expressPort);

// print network interfaces
const os = require('os');
const networkInterfaces = os.networkInterfaces();
console.log(networkInterfaces);

const server = net.createServer(function (socket) {
    socket.write('Echo server\r\n');
    socket.pipe(socket);
});
server.listen(tcpPort, '0.0.0.0');