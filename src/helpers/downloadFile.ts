// @ts-nocheck
import axios from "axios";

export const downloadFile = async (fileName = "attachment", content) => {
    if (!content) {
        throw new Error("Download content is required");
    }

    const link = document.createElement('a');

    const safeFileName = fileName || "attachment";
    let finalFileName = safeFileName;
    const extension = safeFileName.split('.').pop().toLowerCase();

    let mimeType = 'application/octet-stream';
    switch (extension) {
        case 'pdf':
            mimeType = 'application/pdf';
            break;
        case 'docx':
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
        case 'xlsx':
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
        case 'txt':
            mimeType = 'text/plain';
            break;
        case 'zip':
            mimeType = 'application/zip';
            break;
        case 'apk':
            mimeType = 'application/vnd.android.package-archive';
            break;
        case 'rar':
            mimeType = 'application/x-rar-compressed';
            break;
        default:
            break;
    }

    if (!safeFileName.includes('.')) {
        finalFileName = `${safeFileName}`;
    }

    const response = await axios.get(content, {
        responseType: "blob",
        validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
        throw new Error("Download failed");
    }

    const blob = response.data;
    const downloadBlob = blob.type === mimeType
        ? blob
        : new Blob([blob], { type: mimeType });
    const blobURL = URL.createObjectURL(downloadBlob);
    link.href = blobURL;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobURL);
};
