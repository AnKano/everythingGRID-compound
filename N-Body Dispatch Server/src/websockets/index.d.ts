import * as WebSocket from "ws";

export interface ExtendedWebSocketEntity extends WebSocket {
    lastHello: Date,
    uid: string,
    lobbyId: number,
    ready: boolean
}

export interface Device {
    device: string,
    ready: boolean
}

export interface Devices {
    [key: string]: Device
}
