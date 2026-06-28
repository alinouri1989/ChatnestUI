// @ts-nocheck
import { createSlice } from "@reduxjs/toolkit";
import { decryptMessage } from "../../../helpers/messageCryptoHelper";
// در store/chatSlice.js:   selector برای totalMessages
export const selectTotalMessages = (state, chatId) =>
  state.chat.totalMessagesByChat?.[chatId] ?? 0;

const initialState = {
  Individual: [],
  Group: [],
  isChatsInitialized: false,
  totalChats: 0,
  totalMessagesByChat: {}, // as Record<string, number> chatId → totalCount
  paginationByChat: {}, // chatId -> { nextCursor, hasMore, dayStart }
};

const DELETED_MESSAGE_TOMBSTONE =
  "این پیام حذف شده است.";
const DELETED_MESSAGE_KEYWORD_DELETE = "حذف";
const DELETED_MESSAGE_KEYWORD_MESSAGE = "پیام";

const isDeletedTombstoneMessage = (messageData) => {
  if (!messageData || messageData.type !== 0) {
    return false;
  }

  const content = typeof messageData.content === "string" ? messageData.content : "";

  return (
    content === DELETED_MESSAGE_TOMBSTONE ||
    (content.includes(DELETED_MESSAGE_KEYWORD_DELETE) &&
      content.includes(DELETED_MESSAGE_KEYWORD_MESSAGE))
  );
};

const mapParticipants = (chatData) => {
  if (Array.isArray(chatData?.participants)) {
    return chatData.participants;
  }

  if (Array.isArray(chatData?.chatParticipants)) {
    return chatData.chatParticipants
      .map((participant) =>
        typeof participant === "string" ? participant : participant?.userId
      )
      .filter(Boolean);
  }

  return [];
};

const toArray = (obj) =>
  Object.entries(obj).map(([id, data]) => ({ id, ...data }));

const uniqueById = (messages) => {
  const seen = new Set();
  const result = [];
  (messages || []).forEach((msg) => {
    const id = msg?.id;
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    result.push(msg);
  });
  return result;
};

const getMessageSentAt = (message) => {
  const sentAt = Object.values(message?.status?.sent || {})[0]
    ?? message?.createdDate
    ?? message?.sentDate
    ?? null;
  const parsed = sentAt ? new Date(sentAt).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortMessagesBySentAt = (messages) =>
  uniqueById(messages).sort((a, b) => {
    const diff = getMessageSentAt(a) - getMessageSentAt(b);
    if (diff !== 0) return diff;
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });

const getIndividualParticipantsFromMessage = (messageData, userId) => {
  const participants = [
    messageData?.senderId,
    messageData?.recipientId,
    messageData?.receiverId,
    userId,
  ].filter(Boolean);

  return [...new Set(participants)];
};

const ensureChatById = (state, chatId, chatType = null) => {
  let targetChat = state.Individual.find((c) => c.id === chatId)
    || state.Group.find((c) => c.id === chatId);
  if (targetChat) return targetChat;

  const normalizedType = String(chatType || "").toLowerCase();
  targetChat = {
    id: chatId,
    participants: [],
    archivedFor: {},
    createdDate: new Date().toISOString(),
    messages: [],
  };

  if (normalizedType === "group") {
    state.Group.push(targetChat);
  } else {
    state.Individual.push(targetChat);
  }

  return targetChat;
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    initializeChats: (state, action) => {
      const payload = action.payload || {};
      const { Individual = {}, Group = {} } = payload;

      // Always transform chats, even if they're empty objects
      state.Individual = toArray(transformChats(Individual, "individual"));
      state.Group = toArray(transformChats(Group, "group"));

      // IMPORTANT: Always set to true, even if no chats exist
      state.isChatsInitialized = true;
    },
    setTotalChats: (state, action) => {
      const v = Number(action.payload);
      state.totalChats = isNaN(v) ? 0 : v;
    },
    resetTotalChats: (state) => {
      state.totalChats = 0;
    },
    appendChats: (state, action) => {
      const newInd = toArray(transformChats(action.payload.Individual, "individual"));
      const newGrp = toArray(transformChats(action.payload.Group, "group"));

      const merge = (oldArr, newArr) => {
        const map = new Map(oldArr.map(c => [c.id, c]));
        newArr.forEach((incomingChat) => {
          const existingChat = map.get(incomingChat.id);
          if (!existingChat) {
            map.set(incomingChat.id, incomingChat);
            return;
          }

          map.set(incomingChat.id, {
            ...existingChat,
            ...incomingChat,
            participants: incomingChat.participants?.length
              ? incomingChat.participants
              : existingChat.participants,
            archivedFor: {
              ...(existingChat.archivedFor || {}),
              ...(incomingChat.archivedFor || {}),
            },
            messages: sortMessagesBySentAt([
              ...(existingChat.messages || []),
              ...(incomingChat.messages || []),
            ]),
          });
        });
        return Array.from(map.values());
      };

      state.Individual = merge(state.Individual, newInd);
      state.Group = merge(state.Group, newGrp);
      // <<< این خط جدید
      state.isChatsInitialized = true;
    },
    addNewIndividualChat: (state, action) => {
      const { chatId, chatData } = action.payload;

      const chatExists = state.Individual.some((chat) => chat.id === chatId);
      if (chatExists) {
        return;
      }
      const newChat = {
        id: chatId,
        participants: mapParticipants(chatData),
        archivedFor: chatData.archivedFor || {},
        createdDate: chatData.createdDate,
        messages: sortMessagesBySentAt(Object.entries(chatData.messages || {}).reduce(
          (acc, [messageId, messageData]) => {
            if (!messageData || isDeletedTombstoneMessage(messageData)) {
              return acc;
            }

            acc.push({
              id: messageId,
              ...messageData,
            });

            return acc;
          },
          []
        )),
      };

      state.Individual.push(newChat);
    },
    addNewGroupChat: (state, action) => {
      const { chatId, chatData } = action.payload;
      const participants = mapParticipants(chatData);

      if (!chatData || participants.length === 0) {
        return;
      }

      const groupExists = state.Group.some(
        (groupChat) => groupChat.id === chatId
      );
      if (groupExists) {
        return;
      }

      const newGroupChat = {
        id: chatId,
        participants,
        archivedFor: chatData.archivedFor || {},
        createdDate: chatData.createdDate,
        messages: sortMessagesBySentAt(Object.entries(chatData.messages || {}).reduce(
          (acc, [messageId, messageData]) => {
            if (!messageData || isDeletedTombstoneMessage(messageData)) {
              return acc;
            }

            acc.push({
              id: messageId,
              ...messageData,
            });

            return acc;
          },
          []
        )),
      };
      state.Group.push(newGroupChat);
    },
    addMessageToIndividual: (state, action) => {
      const { chatId, messageId, messageData, userId } = action.payload;

      const chat = state.Individual.find((chat) => chat.id === chatId);
      if (!messageData) {
        if (chat) {
          chat.messages = chat.messages.filter((msg) => msg.id !== messageId);
        }
        return;
      }

      const isDeletedForCurrentUser =
        messageData.deletedFor &&
        Object.prototype.hasOwnProperty.call(messageData.deletedFor, userId);
      if (isDeletedForCurrentUser && messageData.content === "") {
        if (chat) {
          chat.messages = chat.messages.filter((msg) => msg.id !== messageId);
        }
        return;
      }

      const shouldRemoveMessage = isDeletedTombstoneMessage(messageData);

      if (chat) {
        if (!chat.participants?.length) {
          const participants = getIndividualParticipantsFromMessage(messageData, userId);
          if (participants.length) {
            chat.participants = participants;
          }
        }

        if (shouldRemoveMessage) {
          chat.messages = chat.messages.filter((msg) => msg.id !== messageId);
          return;
        }

        const existingMessageIndex = chat.messages.findIndex(
          (msg) => msg.id === messageId
        );

        if (existingMessageIndex > -1) {
          const existingMessage = chat.messages[existingMessageIndex];

          const isDeletedForOthers =
            messageData.deletedFor &&
            Object.keys(messageData.deletedFor).some((id) => id !== userId);

          if (!(isDeletedForOthers && messageData.content === "")) {
            chat.messages[existingMessageIndex] = {
              ...existingMessage,
              ...messageData,
            };
          }
        } else {
          chat.messages.push({ id: messageId, ...messageData });
        }
        chat.messages = sortMessagesBySentAt(chat.messages);
      } else {
        if (shouldRemoveMessage) {
          return;
        }

        const newChat = {
          id: chatId,
          participants: getIndividualParticipantsFromMessage(messageData, userId),
          archivedFor: {},
          createdDate: new Date().toISOString(),
          messages: [{ id: messageId, ...messageData }],
        };

        state.Individual.push(newChat);
      }
    },
    addMessageToGroup: (state, action) => {
      const { chatId, messageId, messageData, userId } = action.payload;

      const chat = state.Group.find((chat) => chat.id === chatId);
      if (!messageData) {
        if (chat) {
          chat.messages = chat.messages.filter((msg) => msg.id !== messageId);
        }
        return;
      }

      const isDeletedForCurrentUser =
        messageData.deletedFor &&
        Object.prototype.hasOwnProperty.call(messageData.deletedFor, userId);
      if (isDeletedForCurrentUser && messageData.content === "") {
        if (chat) {
          chat.messages = chat.messages.filter((msg) => msg.id !== messageId);
        }
        return;
      }

      const shouldRemoveMessage = isDeletedTombstoneMessage(messageData);

      if (chat) {
        if (shouldRemoveMessage) {
          chat.messages = chat.messages.filter((msg) => msg.id !== messageId);
          return;
        }

        const existingMessageIndex = chat.messages.findIndex(
          (msg) => msg.id === messageId
        );

        if (existingMessageIndex > -1) {
          const existingMessage = chat.messages[existingMessageIndex];

          const isDeletedForOthers =
            messageData.deletedFor &&
            Object.keys(messageData.deletedFor).some((id) => id !== userId);

          if (!(isDeletedForOthers && messageData.content === "")) {
            chat.messages[existingMessageIndex] = {
              ...existingMessage,
              ...messageData,
            };
          }
        } else {
          chat.messages.push({ id: messageId, ...messageData });
        }
        chat.messages = sortMessagesBySentAt(chat.messages);
      } else {
        if (shouldRemoveMessage) {
          return;
        }

        const newChat = {
          id: chatId,
          participants: [],
          archivedFor: {},
          createdDate: new Date().toISOString(),
          messages: [{ id: messageId, ...messageData }],
        };

        state.Group.push(newChat);
      }
    },
    getChatMessages: (state, action) => {
      const { type, chatId } = action.payload;
      const chat =
        type === "Individual"
          ? state.Individual.find((chat) => chat.id === chatId)
          : state.Group.find((chat) => chat.id === chatId);
      return chat ? chat.messages : [];
    },
    addArchive: (state, action) => {
      const { Individual } = action.payload;
      const chatId = Object.keys(Individual)[0];
      const archiveData = Individual[chatId];

      const chatIndex = state.Individual.findIndex(
        (chat) => chat.id === chatId
      );
      if (chatIndex !== -1) {
        state.Individual[chatIndex].archivedFor = {
          ...state.Individual[chatIndex].archivedFor,
          ...archiveData,
        };
      }
    },
    removeArchive: (state, action) => {
      const individual = action.payload.Individual;
      for (let chatId in individual) {
        if (Object.prototype.hasOwnProperty.call(individual, chatId)) {
          const chatIndex = state.Individual.findIndex(
            (chat) => chat.id === chatId
          );

          if (chatIndex !== -1) {
            state.Individual[chatIndex].archivedFor = {};
          }
        }
      }
    },
    removeIndividualChat: (state, action) => {
      const chatId = Object.keys(action.payload.Individual)[0];

      const chatIndex = state.Individual.findIndex(
        (chat) => chat.id === chatId
      );

      if (chatIndex !== -1) {
        state.Individual[chatIndex].messages = [];
      }
    },
    removeGroupChat: (state, action) => {
      state.Group = state.Group.filter((group) => group.id !== action.payload);
    },
    resetChats: (state) => {
      state.Individual = [];
      state.Group = [];
      state.isChatsInitialized = false;
    },
    forceInitialization: (state) => {
      state.isChatsInitialized = true;
    },
    setChatTotalCount: (state, action) => {
      const { chatId, total } = action.payload;
      state.totalMessagesByChat[chatId] = total;
    },
    setChatPagination: (state, action) => {
      const { chatId, nextCursor, hasMore, dayStart } = action.payload;
      state.paginationByChat[chatId] = {
        nextCursor: nextCursor ?? null,
        hasMore: Boolean(hasMore),
        dayStart: dayStart ?? null,
      };
    },
    setChatMessages: (state, action) => {
      const { chatId, chatType, messages } = action.payload;
      const targetChat = ensureChatById(state, chatId, chatType);

      targetChat.messages = sortMessagesBySentAt(messages);
    },

    prependMessages: (state, action) => {
      const { chatId, chatType, messages } = action.payload;
      const targetChat = ensureChatById(state, chatId, chatType);

      const existingIds = new Set(targetChat.messages.map((msg) => msg.id));
      const incoming = uniqueById(messages).filter((msg) => !existingIds.has(msg.id));
      targetChat.messages = sortMessagesBySentAt([
        ...incoming,
        ...targetChat.messages,
      ]);
    },

    appendMessages: (state, action) => {
      const { chatId, chatType, messages } = action.payload;
      const targetChat = ensureChatById(state, chatId, chatType);

      const existingIds = new Set(targetChat.messages.map((msg) => msg.id));
      const incoming = uniqueById(messages).filter((msg) => !existingIds.has(msg.id));
      targetChat.messages = sortMessagesBySentAt([
        ...targetChat.messages,
        ...incoming,
      ]);
    },
  },
});

export const getChatId = (state, authId, receiveId) => {
  const chat = state.Individual.find(
    (chat) => {
      if (!Array.isArray(chat?.participants)) {
        return false;
      }

      if (authId === receiveId) {
        return (
          chat.participants.length > 0 &&
          chat.participants.every((participantId) => participantId === authId)
        );
      }

      return (
        chat.participants.includes(authId) &&
        chat.participants.includes(receiveId)
      );
    }
  );
  return chat ? chat.id : null;
};

// Updated transformChats function with proper null/undefined handling
const transformChats = (chats) => {
  // Handle null, undefined, or empty object cases
  if (!chats || typeof chats !== 'object') {
    // console.log("transformChats: No chats data or invalid data type", chats);
    return [];
  }

  const chatKeys = Object.keys(chats);
  if (chatKeys.length === 0) {
    // console.log("transformChats: Empty chats object");
    return [];
  }

  // console.log("transformChats: Processing chats", chatKeys);
  return chatKeys.map((chatId) => {
    const chatData = chats[chatId];
    // Ensure chatData exists and has required properties
    if (!chatData) {
      console.warn(`transformChats: Invalid chat data for chatId ${chatId}`);
      return {
        id: chatId,
        participants: [],
        archivedFor: {},
        createdDate: new Date().toISOString(),
        messages: [],
      };
    }

    return {
      id: chatId,
      participants: mapParticipants(chatData),
      archivedFor: chatData.archivedFor || {},
      createdDate: chatData.createdDate || new Date().toISOString(),
      messages: sortMessagesBySentAt(Object.entries(chatData.messages || {}).reduce(
        (acc, [messageId, messageData]) => {
          if (!messageData) {
            acc.push({
              id: messageId,
              content: "",
              type: 0,
              status: { sent: {}, delivered: {}, read: {} },
              deletedFor: {},
            });
            return acc;
          }

          if (isDeletedTombstoneMessage(messageData)) {
            return acc;
          }

          let decryptedContent = messageData.content || "";

          // Only decrypt text messages that are not delete tombstones
          if (messageData.type === 0 && decryptedContent) {
            try {
              decryptedContent = decryptMessage(messageData.content, chatId);
            } catch (error) {
              console.error("Error decrypting message:", error);
              decryptedContent = messageData.content; // Fallback to original content
            }
          }

          acc.push({
            id: messageId,
            ...messageData,
            content: decryptedContent,
          });

          return acc;
        },
        []
      )),
    };
  });
};

export const {
  initializeChats,
  appendChats,
  addNewIndividualChat,
  addNewGroupChat,
  addMessageToIndividual,
  addMessageToGroup,
  getChatMessages,
  removeIndividualChat,
  removeGroupChat,
  resetChats,
  addArchive,
  removeArchive,
  forceInitialization,
  setTotalChats,
  resetTotalChats,
  setChatTotalCount,
  setChatPagination,
  setChatMessages,
  prependMessages,
  appendMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
