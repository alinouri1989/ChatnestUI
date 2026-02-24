export const SAVED_MESSAGES_LABEL = "پیام‌های ذخیره‌شده";

export const getChatDisplayLabel = (displayName, recipientId, currentUserId) => {
  if (recipientId && currentUserId && recipientId === currentUserId) {
    return SAVED_MESSAGES_LABEL;
  }

  return displayName;
};
