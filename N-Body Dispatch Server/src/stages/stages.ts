import {ExtendedWebSocketEntity} from "../websockets";
import {WebsocketSecuredServer} from "../websockets/server";

export abstract class Stage {
    protected wss: WebsocketSecuredServer;

    protected constructor(server: WebsocketSecuredServer) {
        this.wss = server;
    }

    public perform(ws: ExtendedWebSocketEntity, message: Buffer): void {
        this.overallPerform(ws, message);
    }

    public preStagePerform(): void {
        // do nothing
    }

    public postStagePerform(): void {
        // do nothing
    }

    private overallPerform = (ws: ExtendedWebSocketEntity, message: Buffer): void => {
        const body: any = JSON.parse(message.toString());

        switch (body.tag) {
            case 'hello':
                ws.lastHello = new Date();
        }
    }
}

export class InitStageAdapter extends Stage {
    constructor(server: WebsocketSecuredServer) {
        super(server);
    }

    public perform(ws: ExtendedWebSocketEntity, message: Buffer) {
        // await all clients to be connected and ready
        const body: any = JSON.parse(message.toString());
        switch (body.tag) {
            case 'ready':
                this.wss.devices[ws.uid].ready = true;
                break;
        }
    }
}

export class PollAndMergeAdapter extends Stage {
    private websocketResources: any;

    constructor(server: WebsocketSecuredServer) {
        super(server);
        this.websocketResources = {};

        const clients = this.wss.getClients(1);
        clients.forEach(client => {
            const ext = client as ExtendedWebSocketEntity;
            this.websocketResources[ext.uid] = [];
        });
    }

    private checkFinal(): boolean {
        const clients = this.wss.getClients(1);
        const stash = this.wss.buffers.buffers;

        let final = true;
        if (Object.keys(this.websocketResources).length === clients.length) {
            Object.keys(this.websocketResources).forEach((key) => {
                if (this.websocketResources[key].length !== Object.keys(stash).length)
                    final = false;
                else
                    this.websocketResources[key].forEach((el: any) => {
                        if (el.buffer == null) final = false;
                    });
            });
        } else
            final = false;

        return final;
    }

    perform(ws: ExtendedWebSocketEntity, message: any) {
        let isMessage = false;
        if (message.length <= 1000) {
            const stringified = message.toString();
            isMessage = stringified.at(0) === '{' && stringified.at(-1) === "}";
        }

        if (!isMessage) {
            console.log(ws.uid);
            console.log(this.websocketResources[ws.uid].at(-1).name, new Float32Array(message.buffer).slice(0, 4));
            this.websocketResources[ws.uid].at(-1).buffer = new Float32Array(message.buffer);
        } else {
            const body: any = JSON.parse(message.toString());
            if (body.tag === 'bufferDescription') {
                const {name, from, to} = body;

                this.websocketResources[ws.uid].push({
                    name: name,
                    from: from,
                    to: to,
                    buffer: null
                });
            }
        }

        if (this.checkFinal()) this.wss.commitStage();
    }

    postStagePerform() {
        const stash = this.wss.buffers.buffers;

        // console.log(stash['positions'].buffer as Float32Array);

        let stashPositionCopy = new Float32Array(stash['positions'].buffer);
        let stashVelocitiesCopy = new Float32Array(stash['velocities'].buffer);

        Object.keys(this.websocketResources).forEach((key) => {
            const obj = this.websocketResources[key];
            obj.forEach((ob: any) => {
                switch (ob.name) {
                    case 'positions': {
                        // console.log(ob.buffer, ob.from)
                        stashPositionCopy.set(ob.buffer, ob.from);
                        break;
                    }
                    case 'velocities': {
                        stashVelocitiesCopy.set(ob.buffer, ob.from);
                        break;
                    }
                }
            })
        });

        this.wss.buffers.updateBuffer('positions', stashPositionCopy);
        this.wss.buffers.updateBuffer('velocities', stashVelocitiesCopy);

        // console.log(stash['positions'].buffer as Float32Array);

        this.wss.buffers.commit();
    }

    preStagePerform() {
        const clients = this.wss.getClients(1);
        const stash = this.wss.buffers.buffers;

        clients.forEach((client, cid) => {
            Object.keys(stash).map((name: string) => {
                const buffer = stash[name].buffer as Float32Array;
                const elemsCount = buffer.length / clients.length;

                const from = elemsCount * cid;
                const to = (cid !== clients.length - 1) ? elemsCount * (cid + 1) : buffer.length;

                const bufferDesc = {
                    tag: 'toServer', name: name,
                    from: from, to: to
                };

                client.send(JSON.stringify(bufferDesc));
            });
        });
    }
}

export class StageTwoExecutionAdapter extends Stage {
    constructor(server: WebsocketSecuredServer) {
        super(server);
    }

    public preStagePerform() {
        // get all clients
        const clients = this.wss.getClients(1);
        const stash = this.wss.buffers.buffers;

        const buffer = stash[Object.keys(stash)[0]].buffer as Float32Array;
        const elemsCount = buffer.length / clients.length;

        clients.forEach((client, cid) => {
            const from = elemsCount * cid;
            const to = (cid !== clients.length - 1) ? elemsCount * (cid + 1) : buffer.length;

            client.send(JSON.stringify({
                'tag': 'executeStage',
                'number': 2,
                'from': from / 4,
                'to': to / 4
            }));
        });

        this.wss.commitStage();
    }
}

export class StageOneExecutionAdapter extends Stage {
    constructor(server: WebsocketSecuredServer) {
        super(server);
    }

    public preStagePerform() {
        // get all clients
        const clients = this.wss.getClients(1);
        const stash = this.wss.buffers.buffers;

        const buffer = stash[Object.keys(stash)[0]].buffer as Float32Array;
        const elemsCount = buffer.length / clients.length;

        clients.forEach((client, cid) => {
            const from = elemsCount * cid;
            const to = (cid !== clients.length - 1) ? elemsCount * (cid + 1) : buffer.length;

            client.send(JSON.stringify({
                'tag': 'executeStage',
                'number': 1,
                'from': from / 4,
                'to': to / 4
            }));
        });

        this.wss.commitStage();
    }
}

export class SendBuffersAdapter extends Stage {
    constructor(server: WebsocketSecuredServer) {
        super(server);
    }

    public preStagePerform() {
        const clients = this.wss.getClients(1);
        const stash = this.wss.buffers.buffers;

        clients.forEach(client => {
            // loop over names of available buffers
            Object.keys(stash).map((name: string) => {
                const buff = stash[name].buffer as Float32Array;

                const bufferDesc = {
                    tag: 'fromServer',
                    name: name,
                    length: buff.length,
                    bytes: buff.byteLength
                };

                client.send(JSON.stringify(bufferDesc));
                client.send(buff);
            });
        });

        // change stage to performing tasks
        this.wss.commitStage();
    }
}