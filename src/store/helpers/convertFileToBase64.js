const safeProgress = (callback, percent) => {
    if (typeof callback !== "function") return;
    callback(Math.max(0, Math.min(100, Math.round(percent))));
};

const createAbortError = () => {
    const error = new Error("upload_cancelled");
    error.name = "AbortError";
    return error;
};

const withAbortHandling = (reader, signal, reject) => {
    if (!signal) return () => {};

    if (signal.aborted) {
        reject(createAbortError());
        return () => {};
    }

    const handleAbort = () => {
        try {
            if (reader.readyState === 1) {
                reader.abort();
            }
        } catch {
            // Ignore abort errors from FileReader state transitions.
        }
        reject(createAbortError());
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    return () => {
        signal.removeEventListener("abort", handleAbort);
    };
};

export function convertFileToBase64(file, onProgress, options = {}) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const cleanupAbort = withAbortHandling(reader, options.signal, reject);

        reader.onprogress = (event) => {
            if (!event.lengthComputable) return;
            safeProgress(onProgress, (event.loaded / event.total) * 85);
        };

        reader.onloadend = () => {
            if (typeof reader.result !== "string") {
                cleanupAbort();
                reject(new Error("invalid_file"));
                return;
            }

            const base64Value = reader.result.split(',')[1];
            if (!base64Value) {
                cleanupAbort();
                reject(new Error("empty_file"));
                return;
            }

            safeProgress(onProgress, 90);
            cleanupAbort();
            resolve(base64Value);
        };

        reader.onerror = (error) => {
            cleanupAbort();
            reject(error);
        };
        if (options.signal?.aborted) {
            cleanupAbort();
            reject(createAbortError());
            return;
        }

        reader.readAsDataURL(file);
    });
}

export const convertFileToBase64WithAsArrayBuffer = (file, onProgress, options = {}) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const cleanupAbort = withAbortHandling(reader, options.signal, reject);

        reader.onprogress = (event) => {
            if (!event.lengthComputable) return;
            safeProgress(onProgress, (event.loaded / event.total) * 80);
        };

        if (file.type.includes("text") || file.type.includes("wordprocessingml")) {
            if (options.signal?.aborted) {
                cleanupAbort();
                reject(createAbortError());
                return;
            }

            reader.readAsBinaryString(file);
            reader.onload = () => {
                if (options.signal?.aborted) {
                    cleanupAbort();
                    reject(createAbortError());
                    return;
                }

                if (!reader.result || reader.result.trim().length === 0) {
                    cleanupAbort();
                    reject(new Error("empty_file"));
                } else {
                    safeProgress(onProgress, 90);
                    cleanupAbort();
                    resolve(btoa(reader.result));
                }
            };
        } else {
            if (options.signal?.aborted) {
                cleanupAbort();
                reject(createAbortError());
                return;
            }

            reader.readAsArrayBuffer(file);
            reader.onload = () => {
                if (options.signal?.aborted) {
                    cleanupAbort();
                    reject(createAbortError());
                    return;
                }

                const arrayBuffer = reader.result;
                if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                    cleanupAbort();
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
                            if (options.signal?.aborted) {
                                cleanupAbort();
                                reject(createAbortError());
                                return;
                            }
                            binary += String.fromCharCode(bytes[i]);
                        }

                        safeProgress(onProgress, 90);
                        cleanupAbort();
                        resolve(btoa(binary));
                    } catch (error) {
                        cleanupAbort();
                        reject(error);
                    }
                }, 0);
            };
        }

        reader.onerror = (error) => {
            cleanupAbort();
            reject(error);
        };
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
