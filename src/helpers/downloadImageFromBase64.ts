// @ts-nocheck
export const downloadImageFromBase64 = (base64Data, fileName = 'ChatNestImage.png') => {
    if (base64Data.startsWith('data:image')) {
        base64Data = base64Data.split(',')[1];
    }

    const byteCharacters = atob(base64Data);

    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
    }

    const blob = new Blob(byteArrays, { type: 'image/png' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
};
