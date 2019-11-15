import {crc32} from './crc32';
import {streamCreate, writeUint16, writeUint32, writeBytes} from './streams';

const encoder = new TextEncoder();

//hi:
//00 = MSDOS
//03 = unix
//lo:
//3f = zip 6.3.x
const versionMadeBy = 0x033f;

//2.0 no compression, no encription, has directories??
const versionToExtract = 0x0014;

// general purpose bit flag        2 bytes
// 0  - 0 no encryption
// 1  - 0 no imploding, no deflate, no lzma
// 2  - 0 no imploding, no deflate, no lzma
// 3  - 0 we know crc32 upfront
// 4  - 0 no deflate
// 5  - 0 no patch
// 6  - 0 no encryption
// 7  - 0 not used
// = 0x00

// 8  - 0 not used
// 9  - 0 not used
// 10 - 0 not used
// 11 - 1 (1 = utf-8, 0 = IBM CP437) Language encoding flag
// 12 - 0 no compression, reserved
// 13 - 0 no encryption
// 14 - 0 reserved
// 15 - 0 reserved
// = 0x08
const gpBitFlags = 0x0800;

const encodeLocalFileH = (output, file) => {
    writeUint32(output, 0x04034b50);

    // version needed to extract       2 bytes
    writeUint16(output, versionToExtract);

    // general purpose bit flag        2 bytes
    writeUint16(output, gpBitFlags);

    // compression method              2 bytes
    writeUint16(output, 0);// - no compression

    // last mod file time              2 bytes
    // last mod file date              2 bytes
    writeUint32(output, file.dateTime);

    // crc-32                          4 bytes
    writeUint32(output, file.crc32);

    // compressed size                 4 bytes
    writeUint32(output, file.bytes.length);

    // uncompressed size               4 bytes
    writeUint32(output, file.bytes.length);

    // file name length                2 bytes
    writeUint16(output, file.nameBuffer.length);
    // extra field length              2 bytes
    writeUint16(output, 0);
    // file name
    writeBytes(output, file.nameBuffer);
    // extra field
    // = empty
};

const encodeEOCDR = (output, archiveData) => {
    // end of central dir signature    4 bytes  (0x06054b50)
    writeUint32(output, 0x06054b50);
    // number of this disk             2 bytes
    writeUint16(output, 0);

    // number of the disk with the
    //     start of the central directory  2 bytes
    writeUint16(output, 0);

    // total number of entries in the
    // central directory on this disk  2 bytes
    writeUint16(output, archiveData.files.length);

    // total number of entries in the
    //     central directory           2 bytes
    writeUint16(output, archiveData.files.length);

    // size of the central directory   4 bytes
    writeUint32(output, archiveData.totalSize - archiveData.cdrOffset - 22);

    // offset of start of central directory
    //     with respect to the
    //     starting disk number        4 bytes
    writeUint32(output, archiveData.cdrOffset);
    //     .ZIP file comment length        2 bytes
    writeUint16(output, 0);
    //     .ZIP file comment       (variable size)
    //= empty
};
const dosStartDT = new Date(0);
dosStartDT.setFullYear(1980, 0, 1);

const dosStartTime = dosStartDT.valueOf();
const oneDay = 86400000;
const msDosDateTime = (t) => {
    //time zone is ignored because it is included in both dosStartTime and t
    const delta = t - dosStartTime;
    const days = (delta / oneDay) | 0;
    const time = ((delta % oneDay) / 2000) | 0;
    return (days << 16) | (time & 0xffff);
};

const encodeCDR = (output, file) => {
    // central file header signature   4 bytes  (0x02014b50)
    writeUint32(output, 0x02014b50);

    // version made by                 2 bytes
    writeUint16(output, versionMadeBy);

    // version needed to extract       2 bytes
    writeUint16(output, versionToExtract);

    // general purpose bit flag        2 bytes
    writeUint16(output, gpBitFlags);

    // compression method              2 bytes
    writeUint16(output, 0);// - no compression

    // last mod file time              2 bytes
    // last mod file date              2 bytes
    writeUint32(output, file.dateTime);

    // crc-32                          4 bytes
    writeUint32(output, file.crc32);
    // compressed size                 4 bytes
    writeUint32(output, file.bytes.length);
    // uncompressed size               4 bytes
    writeUint32(output, file.bytes.length);
    // file name length                2 bytes
    writeUint16(output, file.nameBuffer.length);
    // extra field length              2 bytes
    writeUint16(output, 0);
    // file comment length             2 bytes
    writeUint16(output, 0);
    // disk number start               2 bytes
    writeUint16(output, 0);

    // internal file attributes        2 bytes
    // 0 - 0 (0=binary, 1=ascii)
    // 1 - 0 reserved
    // 2 - 0 reserved
    // 3..15 - unused
    writeUint16(output, 0);

    // external file attributes        4 bytes
    writeUint32(output, 0);

    // relative offset of local header 4 bytes
    writeUint32(output, file.offset);

    // file name (variable size)
    writeBytes(output, file.nameBuffer);

    // extra field (variable size)
    // = empty

    // file comment (variable size)
    // = empty
};

const forEachFile = (archiveData, fn) => {
    archiveData.files.forEach(fn);
};

const preprocessZipStructure = (archiveData) => {
    /**
     * file1_file2_file3_cdr1_cdr2_cdr3_eocdr
     *
     * file = lfh_bytes
     *
     * lfh = 30 + name
     * cdr = 46 + name
     * eocdr = 22
     */

    let pos = 0;
    let totalSize = 0;
    forEachFile(archiveData, file => {
        const n = file.nameBuffer = encoder.encode(file.name);
        file.offset = pos;

        pos += 30 + n.length;
        pos += file.bytes.length;

        totalSize += 76 + (n.length << 1);
        totalSize += file.bytes.length;

        file.crc32 = crc32(0, file.bytes, file.bytes.length, 0);
        file.dateTime = msDosDateTime(Date.now());
    });

    totalSize += 22;

    archiveData.totalSize = totalSize;
    archiveData.cdrOffset = pos;
};

export const encodeZip = (archiveData) => {
    preprocessZipStructure(archiveData);
    const output = streamCreate(archiveData.totalSize);

    forEachFile(archiveData, (file) => {
        encodeLocalFileH(output, file);
        writeBytes(output, file.bytes);
    });

    forEachFile(archiveData, file => {
        encodeCDR(output, file);
    });
    encodeEOCDR(output, archiveData);

    return output.memory;
};

export const createEmptyArchive = () => {
    return {
        files: []
    };
};

export const addFile = (archiveData, name, bytes) => {
    archiveData.files.push({name, bytes});
};

export const addTextFile = (archiveData, name, string) => {
    addFile(archiveData, name, encoder.encode(string));
};
