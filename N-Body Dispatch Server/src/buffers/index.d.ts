interface BufferDescription {
    name: string,
    length: number,
    type: string,
    buffer: ArrayBufferLike
}

export interface Buffers {
    [key: string]: BufferDescription
}