import {Camera} from "./Camera";
import {ShaderProgram} from "./Shader";
import {Mesh} from "./Mesh";
import {mat4, vec3, vec4} from "gl-matrix";

const canvas = (document.getElementById('scene')) as HTMLCanvasElement;
const ctx = canvas.getContext('webgl2');
if (!ctx)
    throw new Error('WebGL2 Context not allowed in this device!');

const vertShader = `#version 300 es

precision highp float;
 
in vec4 a_position;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

uniform mat4 u_modelMatrix;

void main() {
    mat4 v_mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
    gl_Position = v_mvp * a_position;
}
`;

const fragShader = `#version 300 es

precision highp float;

out vec4 o_color; 

void main() {
    o_color = vec4(1.0f);
}
`;

const shader = new ShaderProgram(ctx, 'main');
shader.declareFragmentShader(fragShader);
shader.declareVertexShader(vertShader);
shader.build();

const camera = new Camera(
    [0.0, 1.0, 50.0],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 1.0]
);

const mesh = new Mesh(ctx, 'square');
mesh.declareAttribBufferByName(
    new Float32Array([
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, -1.0, 0.0]),
    shader.getGLShader(),
    'a_position',
    {
        components: 3,
        type: ctx.FLOAT,
        normalize: false,
        stride: 0,
        offset: 0,
    }
);
mesh.declareIndicesBuffer(new Uint16Array([0, 1, 2, 0, 2, 3]));
mesh.build();

const numParticles = 30 * 256;
let positions = new Float32Array(numParticles * 4);
const initPositions = (): void => {
    for (let i = 0; i < numParticles; i++) {
        const offset = i * 4;
        const t = Math.random() * 2.0 * Math.PI, s = Math.random() * 100.0;

        positions[offset] = Math.cos(t) * s;
        positions[offset + 1] = Math.sin(t) * s;
        positions[offset + 2] = Math.random() * 4.0;
        positions[offset + 3] = 1.0;
    }
};

const ws = new WebSocket('ws://localhost:9010');
ws.binaryType = 'arraybuffer';
ws.onmessage = (event) => {
    positions = new Float32Array(event.data);
    draw();
};

const draw = () => {
    const width = ctx.canvas.width, height = ctx.canvas.height;

    ctx.viewport(0, 0, width, height);
    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

    camera.update(width, height);

    shader.bind();

    const camViewMatrixLoc = ctx.getUniformLocation(shader.getGLShader(), 'u_viewMatrix');
    const camProjectionMatrixLoc = ctx.getUniformLocation(shader.getGLShader(), 'u_projectionMatrix');
    const modelMatrixLoc = ctx.getUniformLocation(shader.getGLShader(), 'u_modelMatrix');

    ctx.uniformMatrix4fv(camViewMatrixLoc, false, camera.getViewMatrix());
    ctx.uniformMatrix4fv(camProjectionMatrixLoc, false, camera.getProjectionMatrix());

    console.log(numParticles * 4)
    for (let i = 0; i < numParticles * 4; i += 4) {
        const transMat = mat4.create();
        mat4.translate(transMat, transMat, vec3.fromValues(
            positions[i],
            positions[i + 1],
            positions[i + 2]
        ));
        const scaleMat = mat4.create();
        mat4.scale(scaleMat, scaleMat, vec3.fromValues(0.1, 0.1, 0.1));


        const modelViewMatrix = mat4.create();
        mat4.mul(modelViewMatrix, modelViewMatrix, transMat);
        mat4.mul(modelViewMatrix, modelViewMatrix, scaleMat);
        ctx.uniformMatrix4fv(modelMatrixLoc, false, modelViewMatrix);

        mesh.draw();
    }

    shader.unbind();

    // window.requestAnimationFrame(loop);
}

const main = () => {
    initPositions();

    ctx.clearColor(0.0, 0.0, 0.0, 1.0);
    ctx.enable(ctx.DEPTH_TEST);
    ctx.disable(ctx.CULL_FACE);
    ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    draw();
}

main();
