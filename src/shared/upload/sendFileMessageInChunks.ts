// @ts-nocheck
import { createData } from "../../core/http-service/createData";

const MAX_IN_FLIGHT_PERCENT = 99;

const createAbortError = () => {
  const error = new Error("upload_cancelled");
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

export const sendFileMessageInChunks = async ({
  chatType,
  chatId,
  contentType,
  file,
  fileName,
  clientMessageId = null,
  replyToMessageId = null,
  signal,
  onProgress,
}) => {
  if (!file || file.size <= 0) {
    throw new Error("empty_file");
  }

  const resolvedFileName = fileName || file.name || "attachment";

  throwIfAborted(signal);

  onProgress?.({
    uploadedBytes: 0,
    totalBytes: file.size,
    percent: 1,
  });

  const formData = new FormData();
  formData.append("chatType", chatType);
  formData.append("contentType", String(contentType));
  formData.append("file", file, resolvedFileName);

  if (clientMessageId) {
    formData.append("clientMessageId", clientMessageId);
  }

  if (replyToMessageId) {
    formData.append("replyToMessageId", replyToMessageId);
  }

  try {
    const response = await createData(`Chat/${chatId}/Messages/File`, {
      method: "POST",
      body: formData,
      signal,
      onUploadProgress: ({ loaded, total }) => {
        const effectiveTotal = total && total > 0 ? total : file.size;
        const percent = effectiveTotal > 0
          ? Math.min(
            MAX_IN_FLIGHT_PERCENT,
            Math.max(1, Math.round((loaded / effectiveTotal) * 100)),
          )
          : 1;

        onProgress?.({
          uploadedBytes: Math.min(loaded, file.size),
          totalBytes: file.size,
          percent,
        });
      },
    });

    throwIfAborted(signal);
    onProgress?.({
      uploadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
    });

    return response;
  } catch (error) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    throw error;
  }
};
