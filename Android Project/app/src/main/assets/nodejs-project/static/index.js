const makeId = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++)
        result += characters.charAt(Math.floor(Math.random() * charactersLength));

    return result;
}

let nextBufferDesc = {};
let buffers = {};

const messageHandler = (webSocket, message) => {
    if (message.data instanceof ArrayBuffer) {
        const data = new Float32Array(message.data);
        const converted = new Uint8Array(data.buffer);

        let ptr;
        if (!(nextBufferDesc.name in buffers)) {
            ptr = Module._malloc(converted.byteLength);
            Module.HEAPU8.set(converted, ptr);
        } else {
            ptr = buffers[nextBufferDesc.name].pointer;
            Module.HEAPU8.set(converted, ptr);
        }

        buffers[nextBufferDesc.name] = {
            pointer: ptr,
            elements: nextBufferDesc.length,
            bytes: nextBufferDesc.byteLength,
        }

        Module.declareResource(ptr, nextBufferDesc.length, nextBufferDesc.name);
    } else {
        const body = JSON.parse(message.data.toString());
        switch (body.tag) {
            case 'fromServer': {
                // console.log('buffer from server', body)
                nextBufferDesc = body;
                break;
            }
            case 'executeStage': {
                // console.log('stage', body)
                Module['stage' + body.number](body.from, body.to);
                break;
            }
            case 'toServer': {
                console.log('buffer to server', body)
                const from = body.from * 4, to = body.to * 4;

                const ptr = buffers[body.name].pointer;

                const buffer = Module.HEAPU8.slice(ptr + from, ptr + to);
                console.log(new Float32Array(buffer.buffer).slice(0, 4));
                console.log('');
                console.log('');

                webSocket.send(JSON.stringify({
                    tag: 'bufferDescription',
                    name: body.name,
                    from: body.from,
                    to: body.to
                }));

                webSocket.send(buffer);
                break;
            }
        }
    }
}

let webSocket = null;
var Module = {
    onRuntimeInitialized: () => {
        webSocket = new WebSocket('wss://192.168.0.6:9000/');
        webSocket.binaryType = 'arraybuffer';

        webSocket.onopen = () => {
            webSocket.send(JSON.stringify({'tag': 'register', 'device': makeId(10)}));
            webSocket.send(JSON.stringify({'tag': 'ready'}));
        };

        webSocket.onmessage = (message) => {
            messageHandler(webSocket, message);
        }

        webSocket.onerror = (error) => {
            console.log(error);
        }
    }
}