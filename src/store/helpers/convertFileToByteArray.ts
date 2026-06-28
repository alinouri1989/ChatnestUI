// @ts-nocheck
export function convertFileToByteArray(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            const byteArray = new Uint8Array(arrayBuffer);
            resolve(byteArray);
        };
        reader.onerror = () => reject('FileReader error occurred.');
        reader.readAsArrayBuffer(file);
    });
}