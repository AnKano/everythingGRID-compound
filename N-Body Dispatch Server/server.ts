import express from 'express';
import {vec3} from 'gl-matrix';

import {WebsocketSecuredServer} from "./src/websockets/server";

const app = express();
app.listen(3000, () => console.log(`HttpServer started on ${3000}`))
const wss = new WebsocketSecuredServer(9000);

const numParticles = 30 * 256;
wss.buffers.addBuffer(numParticles * 4, 'positions');
wss.buffers.addBuffer(numParticles * 4, 'velocities');

const init = (): void => {
    const posBuffer = wss.buffers.buffers['positions'].buffer as Float32Array;
    const velBuffer = wss.buffers.buffers['velocities'].buffer as Float32Array;
    for (let i = 0; i < numParticles; i++) {
        const offset = i * 4;
        const t = Math.random() * 2.0 * Math.PI, s = Math.random() * 100.0;

        posBuffer[offset] = Math.cos(t) * s;
        posBuffer[offset + 1] = Math.sin(t) * s;
        posBuffer[offset + 2] = Math.random() * 4.0;
        posBuffer[offset + 3] = 1.0;

        const position = vec3.fromValues(
            posBuffer[offset],
            posBuffer[offset + 1],
            posBuffer[offset + 2]
        );
        const velocity = vec3.create();
        vec3.cross(velocity, position, vec3.fromValues(0.0, 0.0, 1.0));

        const orbitalVeclocity = Math.sqrt(2.0 * vec3.len(velocity));

        vec3.normalize(velocity, velocity);
        vec3.scale(velocity, velocity, orbitalVeclocity);

        velBuffer[offset] = velocity[0];
        velBuffer[offset + 1] = velocity[1];
        velBuffer[offset + 2] = velocity[2];
        velBuffer[offset + 3] = 0.0;
    }
};
init();

app.get('/', (req, res) => {
    res.send(JSON.stringify(wss.devices, null, 2));
    // res.send(task.buffers['positions'].buffer);
})

app.post('/swap', (req, res) => {
    wss.startStageChain();
    res.send();
})
