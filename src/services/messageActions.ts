import { createData } from "../core/http-service/createData";

type ChatType = "Individual" | "Group" | string;
type DeleteMessageScope = "me" | "everyone";

type SendTextMessageRequest = {
  chatId: string | number;
  chatType: ChatType;
  encryptedContent: string;
  replyToMessageId?: string | number | null;
  thumbnailUrl?: string;
};

type DeleteMessageRequest = {
  chatId: string | number;
  messageId: string | number;
  chatType: ChatType;
  scope: DeleteMessageScope;
};

type ForwardAttachmentRequest = {
  sourceMessageId: string | number;
  targetChatId: string | number;
  targetChatType: ChatType;
};

type ForwardAttachmentToUserRequest = {
  sourceMessageId: string | number;
  recipientId: string | number;
};

export const sendTextMessage = ({
  chatId,
  chatType,
  encryptedContent,
  replyToMessageId = null,
  thumbnailUrl = "",
}: SendTextMessageRequest) =>
  createData(`Chat/${chatId}/Messages?chatType=${encodeURIComponent(chatType)}`, {
    method: "POST",
    body: {
      ContentType: 0,
      Content: encryptedContent,
      ReplyToMessageId: replyToMessageId,
      ThumbnailUrl: thumbnailUrl,
    },
  });

export const deleteMessage = ({
  chatId,
  messageId,
  chatType,
  scope,
}: DeleteMessageRequest) => {
  const routeScope = scope === "everyone" ? "ForEveryone" : "ForMe";

  return createData(
    `Chat/${chatId}/Messages/${messageId}/${routeScope}?chatType=${encodeURIComponent(chatType)}`,
    { method: "DELETE" },
  );
};

export const forwardAttachment = ({
  sourceMessageId,
  targetChatId,
  targetChatType,
}: ForwardAttachmentRequest) =>
  createData(`Chat/${targetChatId}/Messages/ForwardAttachment`, {
    method: "POST",
    body: {
      SourceMessageId: String(sourceMessageId),
      TargetChatType: targetChatType,
    },
  });

export const forwardAttachmentToUser = ({
  sourceMessageId,
  recipientId,
}: ForwardAttachmentToUserRequest) =>
  createData(`Chat/Messages/${sourceMessageId}/ForwardToUser/${recipientId}`, {
    method: "POST",
  });
