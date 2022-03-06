import {Buffers} from "./index";
import {WebSocketServer} from "ws";

export class BuffersStash {
    private toClientWss = new WebSocketServer({port: 9010});
    private _buffers: Buffers;

    constructor() {
        this._buffers = {};

        // this.toClientWss.on('connection', (ws) => {
        //     ws.send('connected');
        // });
    }

    public addBuffer(length: number, name: string) {
        this._buffers[name] = {
            name: name,
            length: length,
            type: 'float32',
            buffer: new Float32Array(length)
        };
    }

    public updateBuffer(name: string, buffer: ArrayBufferLike) {
        this._buffers[name] = {
            ...this.buffers[name],
            buffer: buffer
        };
    }

    public commit() {
        this.toClientWss.clients.forEach((client) => {
            client.send(this._buffers['positions'].buffer);
        });
    }

    get buffers(): Buffers {
        return this._buffers;
    }
}