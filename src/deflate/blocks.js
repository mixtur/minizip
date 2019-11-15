import {writeBits} from '../streams';

export const writeBlock = (stream, uncompressedData) => {
    const finalBlockFlag = isFinalBlock(uncompressedData);
    writeBits(stream, finalBlockFlag & 1, 1);

    if (finalBlockFlag) {//todo: eliminate this condition
        // todo: final block
    } else {
        // 0 = 00 - no compression
        // 1 = 01 - fixed Huffman
        // 2 = 10 - dynamic Huffman
        // 3 = 11 - reserved
        writeBits(stream, 2, 1); //always use dynamic Huffman codes

        const repetitionsStream = computeRepetitionsStream(uncompressedData);
        writeCodeTrees(stream, repetitionsStream);
        writeCode(stream, repetitionsStream);

        // todo: usual block
    }
};

const countCodes = (repetitionStream) => {
    const codes = new Uint32Array(286);
    forEachUint32(repetitionStream, (uint32) => {
        codes[uint32 & 0xffff]++;
        codes[uint32 >> 16]++;
    });
    return codes;
};

const buildHuffmanTree = (codeStats) => {
    //todo: use bin-heap
    const codes = new Uint8Array(286);
    for (let i = 0; i < 286; i++) {
        codes[i] = i;
    }

    for (let i = 0; i < 286; i++) {
        let bottom1Index = i;
        for (let j = i + 2; j < 286; j++) {
            if (codeStats[j] > codeStats[bottom1Index]) {
                bottom1Index = j;
            }
        }


    }
};

export const writeCodeTrees = (stream, repetitionsStream) => {
    const stats = countCodes(repetitionsStream);
};
