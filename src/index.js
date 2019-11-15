import {addFile, addTextFile, createEmptyArchive, encodeZip} from './encode';


const writeLink = (name, buffer) => {
    const url = URL.createObjectURL(new File([buffer], name, {type: 'application/zip'}));
    document.write(`<a download href="${url}">${name}</a><br />`);
};

const archive = createEmptyArchive();
writeLink('empty.zip', encodeZip(archive));

addTextFile(archive, 'тест.txt', 'Hello world');
writeLink('one-file.zip', encodeZip(archive));

addTextFile(archive, 'test2.txt', 'Hello world');
writeLink('two-files.zip', encodeZip(archive));

addTextFile(archive, 'subdir/test3.txt', 'Hello world');
writeLink('two-files-subdir.zip', encodeZip(archive));
