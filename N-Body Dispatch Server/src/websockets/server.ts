import * as ws from 'ws';
import {Devices, ExtendedWebSocketEntity} from "./index";
import {
    InitStageAdapter,
    PollAndMergeAdapter,
    SendBuffersAdapter,
    Stage,
    StageOneExecutionAdapter,
    StageTwoExecutionAdapter
} from "../stages/stages";

import {getUniqueID} from "./utils";
import {BuffersStash} from "../buffers/stash";
import * as https from "https";
import * as fs from "fs";

export class WebsocketSecuredServer {
    private readonly _wssServer: ws.Server;
    private readonly _httpsServer: https.Server;

    private _currentStageAdapter: Stage;
    private _currStageIdx: number;
    private _stages: { new(server: WebsocketSecuredServer): Stage; }[];

    private _devices: Devices;
    private _buffers: BuffersStash;

    constructor(port: number = 9000) {
        this._httpsServer = https.createServer({
            cert: fs.readFileSync('cert.pem'),
            key: fs.readFileSync('key.pem')
        });
        this._httpsServer.listen(port);

        this._wssServer = new ws.Server(
            {server: this._httpsServer},
            () => console.log(`WebSocket started on ${port}`)
        );
        this._devices = {};
        this._buffers = new BuffersStash();

        this._currentStageAdapter = new InitStageAdapter(this);

        this._currStageIdx = 0;
        this._stages = [
            SendBuffersAdapter,
            StageOneExecutionAdapter,
            PollAndMergeAdapter,
            SendBuffersAdapter,
            StageTwoExecutionAdapter,
            PollAndMergeAdapter
        ]

        this.instantiateEvents();
    }

    private instantiateEvents() {
        this._wssServer.on('connection', (ws: ExtendedWebSocketEntity) => {
            this.registerDevice(ws);

            ws.on('message', (message: any) => {
                this._currentStageAdapter.perform(ws, message);
            });

            ws.on('error', e => ws.send(e));
        });
    }

    private registerDevice(ws: ExtendedWebSocketEntity) {
        const uid = getUniqueID();
        ws.lobbyId = 1;
        ws.uid = uid;

        this._devices[uid] = {
            device: uid,
            ready: false,
        }
    }

    public startStageChain() {
        this._currStageIdx = 0;
        console.log('stage ', this._currStageIdx)
        this.swapStageAdapter(this._stages[this._currStageIdx]);
    }

    public commitStage() {
        this._currStageIdx = (this._currStageIdx + 1) % this._stages.length;
        console.log('stage ', this._currStageIdx)
        this.swapStageAdapter(this._stages[this._currStageIdx]);
    }

    private swapStageAdapter<T extends Stage>(StageType: { new(server: WebsocketSecuredServer): T; }) {
        this._currentStageAdapter.postStagePerform();
        this._currentStageAdapter = new StageType(this);
        this._currentStageAdapter.preStagePerform();
    }

    public getClients(lobbyId: number) {
        return [...this._wssServer.clients].filter((client) => {
            const socket = client as ExtendedWebSocketEntity;
            if (socket.lobbyId === lobbyId) return true;
        });
    }

    get devices(): Devices {
        return this._devices;
    }

    get buffers(): BuffersStash {
        return this._buffers;
    }
}