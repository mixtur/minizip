/**
 * The following functions come from pako, from pako/lib/zlib/crc32.js
 * released under the MIT license, see pako https://github.com/nodeca/pako/
 */

// Use ordinary array, since untyped makes no boost here
const makeTable = () => {
    let c;
    const table = new Uint32Array(256);

    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
};

// Create table on load. Just 255 signed longs. Not a problem.
const crcTable = makeTable();

export const crc32 = (crc, buf, len, pos) => {
    const end = pos + len;
    crc = crc ^ (-1);

    for (let i = pos; i < end; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }

    return (crc ^ (-1)); // >>> 0;
};
