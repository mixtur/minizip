export const streamCreate = (capacity) => {
    return {
        bitAccum: 0,
        bitAccumSize: 0,
        capacity: capacity,
        size: 0,
        memory: new Uint8ClampedArray(capacity)
    };
};

export const streamResizeBytes = (stream, byteIncrement) => {
    if (stream.size + byteIncrement < stream.capacity) {
        return;
    }
    stream.capacity *= 2;
    const newMemory = new Uint8Array(stream.capacity);
    newMemory.set(stream.memory);
    stream.memory = newMemory;
};

export const writeUint32 = (stream, number) => {
    streamResizeBytes(stream, 4);
    if ((stream.size & 3) === 0) {
        new Uint32Array(stream.memory.buffer, stream.size, 1)[0] = number;
    } else if ((stream.size & 1) === 0) {
        const a16 = new Uint16Array(stream.memory.buffer, stream.size, 2);
        a16[0] = number & 0xffff;
        a16[1] = number >> 16;
    } else {
        const a8 = new Uint8Array(stream.memory.buffer, stream.size, 4);
        a8[0] = number & 0xff;
        a8[1] = (number >> 8) & 0xff;
        a8[2] = (number >> 16) & 0xff;
        a8[3] = (number >> 24) & 0xff;
    }
    stream.size += 4;
};

export const writeUint16 = (stream, number) => {
    streamResizeBytes(stream, 2);
    if ((stream.size & 1) === 0) {
        new Uint16Array(stream.memory.buffer, stream.size, 1)[0] = number;
    } else {
        const a8 = new Uint8Array(stream.memory.buffer, stream.size, 2);
        a8[0] = number & 0xff;
        a8[1] = (number >> 8) & 0xff;
    }
    stream.size += 2;
};

export const writeBytes = (stream, bytes) => {
    streamResizeBytes(stream, bytes.length);
    new Uint8Array(stream.memory.buffer, stream.size, bytes.length).set(bytes);
    stream.size += bytes.length;
};

export const writeBits = (stream, number, nBitsToWrite) => {
    const accumSize = 32;
    const restBitsCount = accumSize - stream.bitAccumSize;
    if (restBitsCount > nBitsToWrite) {// it fits into bit accumulator
        stream.bitAccum = stream.bitAccum | (number << stream.bitAccumSize);
        stream.bitAccumSize += nBitsToWrite;
    } else if (restBitsCount === nBitsToWrite) {
        stream.bitAccum = stream.bitAccum | (number << stream.bitAccumSize);
        writeUint32(stream, stream.bitAccum);
        stream.bitAccum = 0;
    } else {//restBitsCount < nBitsToWrite
        stream.bitAccum = stream.bitAccum | (number << restBitsCount);
        writeUint32(stream, stream.bitAccum);
        stream.bitAccumSize = nBitsToWrite - restBitsCount;
        stream.bitAccum = number >> restBitsCount;
    }
};
