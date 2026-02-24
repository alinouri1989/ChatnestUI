import { createSlice } from "@reduxjs/toolkit";
import { decryptMessage } from "../../../helpers/messageCryptoHelper";

const initialState = {
  Individual: [],
  Group: [],
  isChatsInitialized: false,
};

const DELETED_MESSAGE_TOMBSTONE =
  "\u0627\u06cc\u0646 \u067e\u06cc\u0627\u0645 \u062d\u0630\u0641 \u0634\u062f\u0647 \u0627\u0633\u062a.";
const DELETED_MESSAGE_KEYWORD_DELETE = "\u062d\u0630\u0641";
const DELETED_MESSAGE_KEYWORD_MESSAGE = "\u067e\u06cc\u0627\u0645";

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

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    initializeChats: (state, action) => {
      // Add null/undefined safety checks
      const payload = action.payload || {};
      const { Individual = {}, Group = {} } = payload;

      // Always transform chats, even if they're empty objects
      state.Individual = transformChats(Individual, "individual");
      state.Group = transformChats(Group, "group");
      
      // IMPORTANT: Always set to true, even if no chats exist
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
        messages: Object.entries(chatData.messages || {}).reduce(
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
        ),
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
        messages: Object.entries(chatData.messages || {}).reduce(
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
        ),
      };
      state.Group.push(newGroupChat);
    },
    addMessageToIndividual: (state, action) => {
      const { chatId, messageId, messageData, userId } = action.payload;

      const chat = state.Individual.find((chat) => chat.id === chatId);
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

        state.Individual.push(newChat);
      }
    },
    addMessageToGroup: (state, action) => {
      const { chatId, messageId, messageData, userId } = action.payload;

      const chat = state.Group.find((chat) => chat.id === chatId);
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
    // Updated resetChats to also reset the initialization flag
    resetChats: (state) => {
      state.Individual = [];
      state.Group = [];
      state.isChatsInitialized = false;
    },
    // Add a new action to force initialization (useful for debugging)
    forceInitialization: (state) => {
      state.isChatsInitialized = true;
    },
  },
});

export const getChatId = (state, authId, receiveId) => {
  const chat = state.Individual.find(
    (chat) =>
      Array.isArray(chat?.participants) &&
      chat.participants.includes(authId) &&
      chat.participants.includes(receiveId)
  );
  return chat ? chat.id : null;
};

// Updated transformChats function with proper null/undefined handling
const transformChats = (chats) => {
  // Handle null, undefined, or empty object cases
  if (!chats || typeof chats !== 'object') {
    console.log("transformChats: No chats data or invalid data type", chats);
    return [];
  }

  const chatKeys = Object.keys(chats);
  if (chatKeys.length === 0) {
    console.log("transformChats: Empty chats object");
    return [];
  }

  console.log("transformChats: Processing chats", chatKeys);
  
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
      messages: Object.entries(chatData.messages || {}).reduce(
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
      ),
    };
  });
};

export const {
  initializeChats,
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
} = chatSlice.actions;

export default chatSlice.reducer;
