const safeProgress = (callback, percent) => {
    if (typeof callback !== "function") return;
    callback(Math.max(0, Math.min(100, Math.round(percent))));
};

export function convertFileToBase64(file, onProgress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onprogress = (event) => {
            if (!event.lengthComputable) return;
            safeProgress(onProgress, (event.loaded / event.total) * 85);
        };

        reader.onloadend = () => {
            if (typeof reader.result !== "string") {
                reject(new Error("invalid_file"));
                return;
            }

            const base64Value = reader.result.split(',')[1];
            if (!base64Value) {
                reject(new Error("empty_file"));
                return;
            }

            safeProgress(onProgress, 90);
            resolve(base64Value);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const convertFileToBase64WithAsArrayBuffer = (file, onProgress) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onprogress = (event) => {
            if (!event.lengthComputable) return;
            safeProgress(onProgress, (event.loaded / event.total) * 80);
        };

        if (file.type.includes("text") || file.type.includes("wordprocessingml")) {
            reader.readAsBinaryString(file);
            reader.onload = () => {
                if (!reader.result || reader.result.trim().length === 0) {
                    reject(new Error("empty_file"));
                } else {
                    safeProgress(onProgress, 90);
                    resolve(btoa(reader.result));
                }
            };
        } else {
            reader.readAsArrayBuffer(file);
            reader.onload = () => {
                const arrayBuffer = reader.result;
                if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                    reject(new Error("empty_file"));
                    return;
                }

                safeProgress(onProgress, 85);

                // Allow UI to paint the progress update before CPU-heavy base64 conversion.
                setTimeout(() => {
                    try {
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = "";

                        for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }

                        safeProgress(onProgress, 90);
                        resolve(btoa(binary));
                    } catch (error) {
                        reject(error);
                    }
                }, 0);
            };
        }

        reader.onerror = (error) => reject(error);
    });
};

export function convertFileToBase64ForGroupPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
