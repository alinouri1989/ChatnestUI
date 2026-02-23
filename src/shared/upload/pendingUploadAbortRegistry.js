const pendingUploadControllers = new Map();

export const registerPendingUploadAbortController = (pendingId, controller) => {
  if (!pendingId || !controller) return;
  pendingUploadControllers.set(pendingId, controller);
};

export const unregisterPendingUploadAbortController = (pendingId) => {
  if (!pendingId) return;
  pendingUploadControllers.delete(pendingId);
};

export const abortPendingUpload = (pendingId) => {
  if (!pendingId) return false;

  const controller = pendingUploadControllers.get(pendingId);
  if (!controller) return false;

  controller.abort();
  pendingUploadControllers.delete(pendingId);
  return true;
};
