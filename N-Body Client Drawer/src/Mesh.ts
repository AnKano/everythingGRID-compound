type BufferType =
    | WebGL2RenderingContext['FLOAT']
    | WebGL2RenderingContext['UNSIGNED_INT'];

interface VBODeclaration {
    components: number;
    type: BufferType;
    normalize: boolean;
    stride: number;
    offset: number;
}

interface VBODescription {
    buffer: WebGLBuffer;
    declaration: VBODeclaration;
}

export class Mesh {
    private readonly context: WebGL2RenderingContext;
    private readonly name: string;

    private VAO: WebGLVertexArrayObject;
    private readonly VBOs: Map<number, VBODescription>;
    private indicesVBO: WebGLBuffer;
    private indicesCount: number;

    constructor(context: WebGL2RenderingContext, name: string) {
        this.context = context;
        this.name = name;

        this.VAO = null;
        this.VBOs = new Map<number, VBODescription>();
    }

    findBufferLocation(locationName: string, shader: WebGLShader) {
        const location = this.context.getAttribLocation(shader, locationName);
        if (location < 0)
            throw new Error(
                `Mesh - ${this.name}: Attrib with name '${locationName}' not found!`
            );

        return location;
    }

    declareAttribBufferByIndex(
        data: ArrayBufferLike,
        locationIndex: number,
        declaration: VBODeclaration
    ) {
        const locationIdx = locationIndex;

        const buffer = this.context.createBuffer();
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        this.context.bufferData(
            this.context.ARRAY_BUFFER,
            data,
            this.context.STATIC_DRAW
        );

        this.VBOs.set(locationIdx, {
            buffer: buffer,
            declaration: declaration,
        });

        this.context.bindBuffer(this.context.ARRAY_BUFFER, null);
        // console.info(`Mesh - ${this.name}: Attribute buffer 'idx:${locationIndex}' declared successfully!`);
        return this;
    }

    declareAttribBufferByName(
        data: ArrayBufferLike,
        shader: WebGLShader,
        locationName: string,
        declaration: VBODeclaration
    ) {
        const locationIdx: number = this.findBufferLocation(locationName, shader);

        const buffer: WebGLBuffer = this.context.createBuffer();
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        this.context.bufferData(
            this.context.ARRAY_BUFFER,
            data,
            this.context.STATIC_DRAW
        );

        this.VBOs.set(locationIdx, {
            buffer: buffer,
            declaration: declaration,
        });

        this.context.bindBuffer(this.context.ARRAY_BUFFER, null);
        // console.info(`Mesh - ${this.name}: Attribute buffer 'name:${locationName}' declared successfully!`);
        return this;
    }

    declareIndicesBuffer(data: Uint16Array) {
        const buffer = this.context.createBuffer();
        this.context.bindBuffer(this.context.ELEMENT_ARRAY_BUFFER, buffer);
        this.context.bufferData(
            this.context.ELEMENT_ARRAY_BUFFER,
            data,
            this.context.STATIC_DRAW
        );

        this.indicesVBO = buffer;
        this.indicesCount = data.length;

        this.context.bindBuffer(this.context.ELEMENT_ARRAY_BUFFER, null);
        return this;
    }

    build() {
        this.VAO = this.context.createVertexArray();
        this.context.bindVertexArray(this.VAO);

        this.VBOs.forEach((VBODescription, location) => {
            this.context.enableVertexAttribArray(location);
            this.context.bindBuffer(this.context.ARRAY_BUFFER, VBODescription.buffer);

            if (VBODescription.declaration.type == this.context.INT)
                this.context.vertexAttribIPointer(
                    location,
                    VBODescription.declaration.components,
                    VBODescription.declaration.type,
                    VBODescription.declaration.stride,
                    VBODescription.declaration.offset
                );
            else
                this.context.vertexAttribPointer(
                    location,
                    VBODescription.declaration.components,
                    VBODescription.declaration.type,
                    VBODescription.declaration.normalize,
                    VBODescription.declaration.stride,
                    VBODescription.declaration.offset
                );
        });

        this.context.bindBuffer(this.context.ELEMENT_ARRAY_BUFFER, this.indicesVBO);

        this.context.bindVertexArray(null);

        return this;
    }

    draw() {
        this.context.bindVertexArray(this.VAO);
        this.context.bindBuffer(this.context.ELEMENT_ARRAY_BUFFER, this.indicesVBO);
        this.context.drawElements(
            this.context.TRIANGLES,
            this.indicesCount,
            this.context.UNSIGNED_SHORT,
            0
        );
        this.context.bindBuffer(this.context.ELEMENT_ARRAY_BUFFER, null);
        this.context.bindVertexArray(null);
    }

    dispose() {
        this.VBOs.forEach((VBODescription) =>
            this.context.deleteBuffer(VBODescription.buffer)
        );
        this.context.deleteBuffer(this.indicesVBO);
        this.context.deleteVertexArray(this.VAO);
    }
}