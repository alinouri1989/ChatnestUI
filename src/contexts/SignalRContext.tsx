// @ts-nocheck
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import PropTypes from "prop-types";

import { getJwtFromCookie } from "../store/helpers/getJwtFromCookie";
import {
  removeGroupList,
  setGroupList,
  updateGroupInformations,
  updateUserInfoToGroupList,
} from "../store/Slices/Group/groupListSlice";
import {
  addMessageToGroup,
  addMessageToIndividual,
  addNewGroupChat,
  addNewIndividualChat,
  addArchive,
  removeArchive,
  removeIndividualChat,
  removeGroupChat,
  appendChats,
  forceInitialization,
  setTotalChats,
  setChatTotalCount,
  setChatPagination,
  setChatMessages,
  prependMessages,
} from "../store/Slices/chats/chatSlice";
import { removePendingUpload } from "../store/Slices/chats/pendingUploadsSlice";
import {
  deleteCallHistory,
  handleEndCall,
  handleIncomingCall,
  handleOutgoingCall,
  setCallRecipientList,
  setCallStartedDate,
  setInitialCalls,
  setIsCallAcceptWaiting,
  setIsCallStarted,
  setIsCallStarting,
  updateCallRecipientList,
} from "../store/Slices/calls/callSlice";
import {
  addNewUserToChatList,
  setInitialChatList,
  updateUserInfoToChatList,
  appendChatList
} from "../store/Slices/chats/chatListSlice";
import { getUserIdFromToken } from "../helpers/getUserIdFromToken";
import { decryptMessage } from "../helpers/messageCryptoHelper";
import { SafeJsonHubProtocol } from "../helpers/safeJsonHubProtocol";
import { createData } from "../core/http-service/createData";

import store from "../store/index";
import { ErrorAlert } from "../helpers/customAlert";
import PreLoader from "../shared/components/PreLoader/PreLoader";

const SignalRContext = createContext();

const HUB_CONNECTED = "Connected";
const HUB_DISCONNECTED = "Disconnected";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isExpectedConnectionShutdownError = (error) => {
  const message = error?.message ?? error?.toString?.() ?? "";

  return (
    message.includes("Invocation canceled") ||
    message.includes("connection being closed") ||
    message.includes("connection was stopped") ||
    message.includes("Connection was stopped") ||
    message.includes("stop() was called") ||
    message.includes("stopped during negotiation")
  );
};

const normalizeApiMessages = (payload, fallbackChatId, requestedSkip = 0, requestedTake = 50) => {
  const messages = payload?.messages ?? payload?.msgs ?? [];
  const chatId = payload?.chatId ?? fallbackChatId ?? messages?.[0]?.chatId;
  const total = Number(payload?.totalCount ?? payload?.TotalCount ?? 0) || 0;
  const resolvedSkip = Number(payload?.skip ?? payload?.Skip ?? requestedSkip) || 0;
  const resolvedTake = Number(payload?.take ?? payload?.Take ?? requestedTake) || requestedTake;
  const serverNextCursor =
    payload?.nextSkip ??
    payload?.NextSkip ??
    payload?.nextCursorUtc ??
    payload?.NextCursorUtc ??
    payload?.nextCursor ??
    payload?.NextCursor ??
    null;
  const serverHasMore =
    payload?.hasNextPage ??
    payload?.HasNextPage ??
    payload?.hasMore ??
    payload?.HasMore;
  const derivedNextSkip = resolvedSkip + (messages.length || resolvedTake);
  const derivedHasMore = total > derivedNextSkip;

  return {
    chatId,
    chatType: payload?.chatType ?? payload?.ChatType,
    total,
    hasMore: Boolean(serverHasMore ?? derivedHasMore),
    nextCursor: serverNextCursor ?? (derivedHasMore ? derivedNextSkip : null),
    dayStart: payload?.dayStartUtc ?? payload?.DayStartUtc ?? null,
    isInitial: Boolean(payload?.isInitial ?? payload?.IsInitial ?? resolvedSkip === 0),
    messages: (messages ?? [])
      .map((msg) => {
        const messageId = msg?.messageId ?? msg?.id;
        if (!messageId) return null;

        const messageData = msg?.messageData
          ? msg.messageData
          : Object.fromEntries(Object.entries(msg).filter(([key]) => key !== "id" && key !== "messageId"));

        let decryptedContent = messageData?.content;
        if (
          messageData?.type === 0 &&
          decryptedContent &&
          decryptedContent !== "این پیام حذف شده است."
        ) {
          try {
            decryptedContent = decryptMessage(messageData.content, chatId);
          } catch {
            decryptedContent = messageData.content;
          }
        }

        return {
          id: messageId,
          ...messageData,
          content: decryptedContent,
        };
      })
      .filter(Boolean),
  };
};

const waitForHubConnection = async (connection, timeoutMs = 12000) => {
  if (!connection) return false;
  if (connection.state === HUB_CONNECTED) return true;

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (connection.state === HUB_CONNECTED) {
      return true;
    }

    if (connection.state === HUB_DISCONNECTED) {
      try {
        await connection.start();
      } catch {
        // Automatic reconnect or a later loop iteration may still recover it.
      }
    }

    await delay(250);
  }

  return connection.state === HUB_CONNECTED;
};

const ensureConnectionStopped = async (connection, timeoutMs = 5000) => {
  if (!connection) return true;
  if (connection.state === HUB_DISCONNECTED) return true;

  try {
    await connection.stop();
    return true;
  } catch (error) {
    // If stop fails due to pending invocations or connection issues,
    // wait a bit for the connection to close naturally
    const isInvocationCanceledError = 
      error?.message?.includes("Invocation canceled") ||
      error?.message?.includes("connection being closed");
    
    if (isInvocationCanceledError) {
      // This is expected during cleanup - connections closing with pending invocations
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        if (connection.state === HUB_DISCONNECTED) {
          return true;
        }
        await delay(100);
      }
      return false;
    }
    
    // For other errors, still try to wait for natural close
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (connection.state === HUB_DISCONNECTED) {
        return true;
      }
      await delay(100);
    }
    return false;
  }
};

export const useSignalR = () => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error("useSignalR must be used within a SignalRProvider");
  }

  const {
    chatConnection,
    notificationConnection,
    callConnection,
    typingUsersByChat,

    // status
    connectionStatus,
    error,
    loading,

    handleAcceptCall,

    // chat helpers
    requestChatPage,
    requestChatMessagesPage,
    requestTotalChats,
    ensureChatConnection,
  } = context;

  return {
    chatConnection,
    notificationConnection,
    callConnection,
    typingUsersByChat,
    connectionStatus,
    error,
    loading,
    handleAcceptCall,
    requestChatPage,
    requestChatMessagesPage,
    requestTotalChats,
    ensureChatConnection,
  };
};


export const SignalRProvider = ({ children }) => {
  const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [notificationConnection, setNotificationConnection] = useState(null);
  const [chatConnection, setChatConnection] = useState(null);
  const [callConnection, setCallConnection] = useState(null);
  const [typingUsersByChat, setTypingUsersByChat] = useState({});

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const { callId, callType } = useSelector((state) => state.call);
  const { Individual, Group } = useSelector((state) => state.chat);
  const { token, user } = useSelector((state) => state.auth);
  const userId = getUserIdFromToken(token);
  const currentUserProfile = {
    displayName: user?.displayName ?? "",
    email: user?.email ?? "",
    biography: user?.biography ?? "",
    profilePhoto: user?.profilePhoto ?? null,
    lastConnectionDate: user?.lastConnectionDate ?? "0001-01-01T00:00:00",
    isOnline: true,
    userIdentifier: user?.userIdentifier ?? "",
  };

  const callIdRef = useRef(callId);
  const callConnectionRef = useRef(null);

  const pendingRequestsRef = useRef(new Set());
  const typingTimeoutsRef = useRef(new Map());
  const abortControllerRef = useRef(new AbortController());
  const logCallDebug = (message, data) => {
    if (data !== undefined) {
      console.log(`[Call Debug] ${message}`, data);
      return;
    }
    console.log(`[Call Debug] ${message}`);
  };

  const ensureChatConnection = useCallback(
    async () => {
      const isReady = await waitForHubConnection(chatConnection);
      if (isReady) {
        setConnectionStatus("connected");
      }
      return isReady;
    },
    [chatConnection]
  );

  const getTypingTimeoutKey = useCallback(
    (chatId, typingUserId) => `${chatId}:${typingUserId}`,
    []
  );

  const removeTypingUser = useCallback(
    (chatId, typingUserId) => {
      if (!chatId || !typingUserId) return;

      const timeoutKey = getTypingTimeoutKey(chatId, typingUserId);
      const timeoutId = typingTimeoutsRef.current.get(timeoutKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        typingTimeoutsRef.current.delete(timeoutKey);
      }

      setTypingUsersByChat((current) => {
        const existingUsers = current[chatId] ?? [];
        if (!existingUsers.includes(typingUserId)) {
          return current;
        }

        const nextUsers = existingUsers.filter((id) => id !== typingUserId);
        const next = { ...current };

        if (nextUsers.length === 0) {
          delete next[chatId];
        } else {
          next[chatId] = nextUsers;
        }

        return next;
      });
    },
    [getTypingTimeoutKey]
  );

  const clearAllTypingUsers = useCallback(() => {
    typingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    typingTimeoutsRef.current.clear();
    setTypingUsersByChat({});
  }, []);

  // Helper function to safely handle SignalR invocations with proper error suppression
  const safeInvoke = useCallback((connection, method, ...args) => {
    if (!connection) {
      return Promise.resolve();
    }
    return connection.invoke(method, ...args).catch((error) => {
      // Suppress "invocation canceled" errors that occur during connection cleanup
      if (error?.message?.includes("Invocation canceled due to the underlying connection being closed")) {
        return; // Silently ignore cleanup-related errors
      }
      // Log other unexpected errors
      if (error && !error.toString().includes("connection")) {
        console.error(`[SignalR] Error invoking ${method}:`, error);
      }
    });
  }, []);

  const handleTypingEvent = useCallback(
    ({ chatId, userId: typingUserId, isTyping }) => {
      if (!chatId || !typingUserId || typingUserId === userId) {
        return;
      }

      if (!isTyping) {
        removeTypingUser(chatId, typingUserId);
        return;
      }

      setTypingUsersByChat((current) => {
        const existingUsers = current[chatId] ?? [];
        if (existingUsers.includes(typingUserId)) {
          return current;
        }

        return {
          ...current,
          [chatId]: [...existingUsers, typingUserId],
        };
      });

      const timeoutKey = getTypingTimeoutKey(chatId, typingUserId);
      const previousTimeoutId = typingTimeoutsRef.current.get(timeoutKey);
      if (previousTimeoutId) {
        clearTimeout(previousTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        removeTypingUser(chatId, typingUserId);
      }, 3500);
      typingTimeoutsRef.current.set(timeoutKey, timeoutId);
    },
    [getTypingTimeoutKey, removeTypingUser, userId]
  );

  const requestTotalChats = useCallback(async () => {
    try {
      const total = await createData("Chat/Total");
      store.dispatch(setTotalChats(Number(total ?? 0)));
      return true;
    } catch (err) {
      console.error("[REST] failed to load total chats", err);
      return false;
    }
  }, []);

  const requestChatPage = useCallback(async (skip = 0, take = 7) => {
    try {
      const query = new URLSearchParams({
        skip: String(Math.max(0, skip)),
        take: String(Math.max(1, take)),
      });
      const data = await createData(`Chat/Initial?${query.toString()}`);
      const chats = data?.chats ?? data?.Chats ?? { Individual: {}, Group: {} };
      const recipientProfiles = data?.recipientProfiles ?? data?.RecipientProfiles ?? {};
      const groupProfiles = data?.groupProfiles ?? data?.GroupProfiles ?? {};
      const totalChats = data?.totalChats ?? data?.TotalChats;

      store.dispatch(appendChats(chats));
      store.dispatch(forceInitialization());

      const currentChatList = store.getState().chatList?.chatList ?? {};
      if (Object.keys(currentChatList).length === 0) {
        store.dispatch(setInitialChatList(recipientProfiles));
      } else {
        store.dispatch(appendChatList(recipientProfiles));
      }

      store.dispatch(setGroupList(groupProfiles));

      if (totalChats !== undefined && totalChats !== null) {
        store.dispatch(setTotalChats(Number(totalChats) || 0));
      }

      return true;
    } catch (err) {
      console.error("[REST] failed to load chats", err);
      store.dispatch(forceInitialization());
      return false;
    }
  }, []);

  const requestChatMessagesPage = useCallback(async (chatId, nextSkip = null) => {
    if (!chatId) return false;

    try {
      const pageSize = 50;
      const skip = Number.isFinite(Number(nextSkip)) ? Math.max(0, Number(nextSkip)) : 0;
      const query = new URLSearchParams();
      query.set("skip", String(skip));
      query.set("take", String(pageSize));

      const data = await createData(`Chat/${chatId}/Messages?${query.toString()}`);
      const normalized = normalizeApiMessages(data, chatId, skip, pageSize);
      if (!normalized.chatId) return false;

      store.dispatch(setChatTotalCount({ chatId: normalized.chatId, total: normalized.total }));
      store.dispatch(setChatPagination({
        chatId: normalized.chatId,
        nextCursor: normalized.nextCursor,
        hasMore: normalized.hasMore,
        dayStart: normalized.dayStart,
      }));

      if (normalized.isInitial || skip === 0) {
        store.dispatch(setChatMessages({
          chatId: normalized.chatId,
          chatType: normalized.chatType,
          messages: normalized.messages,
        }));
      } else {
        store.dispatch(prependMessages({
          chatId: normalized.chatId,
          chatType: normalized.chatType,
          messages: normalized.messages,
        }));
      }

      return true;
    } catch (err) {
      console.error("[REST] failed to load chat messages", err);
      return false;
    }
  }, []);

  useEffect(() => {
    callConnectionRef.current = callConnection;
  }, [callConnection]);

  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  useEffect(() => {
    const reconnectDelays = [0, 2000, 5000, 10000, 20000];

    const chatConnection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}hub/Chat`, {
        accessTokenFactory: () => getJwtFromCookie() || "",
      })
      .withHubProtocol(new SafeJsonHubProtocol("chat"))
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect(reconnectDelays)
      .build();

    const notificationConnection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}hub/Notification`, {
        accessTokenFactory: () => getJwtFromCookie() || "",
      })
      .withHubProtocol(new SafeJsonHubProtocol("notification"))
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect(reconnectDelays)
      .build();

    const callConnection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}hub/Call`, {
        accessTokenFactory: () => getJwtFromCookie() || "",
      })
      .withHubProtocol(new SafeJsonHubProtocol("call"))
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect(reconnectDelays)
      .build();

    [chatConnection, notificationConnection, callConnection].forEach((connection) => {
      connection.serverTimeoutInMilliseconds = 120000;
      connection.keepAliveIntervalInMilliseconds = 15000;
      
      // Add global error handler to suppress "invocation canceled" errors during cleanup
      // These errors are expected when connections close with pending invocations
      const originalOnerror = connection.onerror;
      connection.onerror = (error) => {
        // Filter out the expected "invocation canceled" errors that occur during cleanup
        if (error?.message?.includes("Invocation canceled due to the underlying connection being closed")) {
          // Suppress this error - it's expected during cleanup
          return;
        }
        // Call the original error handler for other errors
        if (originalOnerror) {
          originalOnerror(error);
        }
      };
    });

    chatConnection.onreconnecting(() => {
      clearAllTypingUsers();
      setConnectionStatus("reconnecting");
    });
    notificationConnection.onreconnecting(() => setConnectionStatus("reconnecting"));
    callConnection.onreconnecting(() => setConnectionStatus("reconnecting"));

    chatConnection.onclose(() => {
      clearAllTypingUsers();
      setConnectionStatus("disconnected");
    });
    notificationConnection.onclose(() => setConnectionStatus("disconnected"));
    callConnection.onclose(() => setConnectionStatus("disconnected"));

    chatConnection.onreconnected(() => {
      setConnectionStatus("connected");
      requestTotalChats().catch(() => { });
      requestChatPage(0, 7).catch(() => { });
    });

    notificationConnection.onreconnected(() => {
      setConnectionStatus("connected");
      notificationConnection.invoke("Initial").catch(() => { });
    });

    callConnection.onreconnected(() => {
      setConnectionStatus("connected");
      callConnection.invoke("Initial").catch(() => { });
    });

    setConnectionStatus("connecting");

    const handleReceiveChatMessages = (payload) => {
      const {
        totalCount,
        messages,
        msgs,
        chatId: payloadChatId,
        chatType: payloadChatType,
        hasMore,
        nextCursorUtc,
        dayStartUtc,
        isInitial,
      } = payload ?? {};

      const total = totalCount ?? 0;
      const msgsArray = messages ?? msgs ?? [];

      const chatId = payloadChatId ?? msgsArray[0]?.chatId;
      if (!chatId) {
        if (msgsArray?.length) {
          console.error("[SignalRProvider] No chatId found in payload!");
        }
        return;
      }

      const payloadSafe = payload ?? {};
      const isPageResponse =
        Object.prototype.hasOwnProperty.call(payloadSafe, "hasMore") ||
        Object.prototype.hasOwnProperty.call(payloadSafe, "nextCursorUtc") ||
        Object.prototype.hasOwnProperty.call(payloadSafe, "dayStartUtc") ||
        Object.prototype.hasOwnProperty.call(payloadSafe, "isInitial") ||
        Object.prototype.hasOwnProperty.call(payloadSafe, "nextCursor");

      const resolvedNextCursor = nextCursorUtc ?? payloadSafe.nextCursor ?? null;
      const resolvedHasMore = typeof hasMore === "boolean"
        ? hasMore
        : Boolean(resolvedNextCursor);
      const resolvedDayStart = dayStartUtc ?? payloadSafe.dayStartUtc ?? null;
      const resolvedInitial = Boolean(isInitial);

      store.dispatch(setChatTotalCount({ chatId, total }));

      if (isPageResponse) {
        store.dispatch(
          setChatPagination({
            chatId,
            nextCursor: resolvedNextCursor,
            hasMore: resolvedHasMore,
            dayStart: resolvedDayStart,
          })
        );
      }

      if (!msgsArray?.length) {
        if (isPageResponse && resolvedInitial) {
          store.dispatch(setChatMessages({ chatId, chatType: payloadChatType, messages: [] }));
        }
        return;
      }

      const normalizedMessages = [];

      msgsArray.forEach((msg) => {
        const { messageId, messageData } = (() => {
          if (msg.messageId && msg.messageData) {
            return { messageId: msg.messageId, messageData: msg.messageData };
          }
          const id = msg.id ?? msg.messageId ?? "";
          const data = { ...msg };
          delete data.id;
          delete data.messageId;
          return { messageId: id, messageData: data };
        })();

        if (!messageId) return;

        const isIncoming =
          !!messageData?.senderId && messageData.senderId !== userId;

        let decryptedContent = messageData?.content;
        if (
          messageData?.type === 0 &&
          decryptedContent &&
          decryptedContent !== "این پیام حذف شده است."
        ) {
          decryptedContent = decryptMessage(messageData.content, chatId);
        }

        const normalizedMessage = {
          id: messageId,
          ...messageData,
          content: decryptedContent,
        };

        normalizedMessages.push(normalizedMessage);

        if (isPageResponse) {
          return;
        }

        if (isIncoming) {
          postToAndroidWebView("incoming_message", {
            scope: messageData?.scope ?? "Individual",
            chatId,
            messageId,
            senderId: messageData?.senderId ?? null,
            recipientId: userId ?? null,
            type: messageData?.type ?? null,
            content: decryptedContent ?? null,
            clientMessageId: messageData?.clientMessageId ?? null,
            status: messageData?.status ?? null,
            sentAt:
              messageData?.status?.sent &&
              Object.keys(messageData.status.sent).length > 0
                ? messageData.status.sent[
                Object.keys(messageData.status.sent)[0]
                ]
                : null,
          });
        }

        if (messageData?.clientMessageId) {
          store.dispatch(removePendingUpload(messageData.clientMessageId));
        }

        if (isIncoming) {
          dispatch(addNewUserToChatList({ [messageData.senderId]: {} }));
          const senderProfile = store.getState().chatList?.chatList?.[messageData.senderId];
          if (!senderProfile?.displayName) {
            requestChatPage(0, 7).catch(() => { });
          }

          const currentIndividualChats = store.getState().chat?.Individual || [];
          const currentChat = currentIndividualChats.find(
            (c) => c.id === chatId
          );

          const isArchivedForCurrentUser =
            currentChat?.archivedFor &&
            Object.prototype.hasOwnProperty.call(
              currentChat.archivedFor,
              userId
            );

          if (isArchivedForCurrentUser) {
            dispatch(removeArchive({ Individual: { [chatId]: {} } }));
            if (chatConnection?.state === "Connected") {
              chatConnection.invoke("UnarchiveChat", chatId).catch(() => { });
            }
          }
        }

        if (messageData?.scope === "Group" || payload?.Group) {
          store.dispatch(
            addMessageToGroup({
              chatId,
              messageId,
              messageData: {
                ...messageData,
                content: decryptedContent,
              },
              userId,
            })
          );
        } else {
          store.dispatch(
            addMessageToIndividual({
              chatId,
              messageId,
              messageData: {
                ...messageData,
                content: decryptedContent,
              },
              userId,
            })
          );
        }
      });

      if (isPageResponse) {
        if (resolvedInitial) {
          store.dispatch(setChatMessages({ chatId, chatType: payloadChatType, messages: normalizedMessages }));
        } else {
          store.dispatch(prependMessages({ chatId, chatType: payloadChatType, messages: normalizedMessages }));
        }
      }
    };

    let isDisposed = false;
    const connectionStartPromises = new Map();

    const waitForConnectionStartToSettle = async (connection, timeoutMs = 15000) => {
      const startPromise = connectionStartPromises.get(connection);
      if (!startPromise) {
        return;
      }

      await Promise.race([
        startPromise.catch(() => { }),
        delay(timeoutMs),
      ]);
    };

    const startHubConnection = async (connection) => {
      if (isDisposed || connection.state !== HUB_DISCONNECTED) {
        return;
      }

      const startPromise = connection.start();
      connectionStartPromises.set(connection, startPromise);

      try {
        await startPromise;
      } finally {
        connectionStartPromises.delete(connection);
      }
    };

    const stopHubConnection = async (connection) => {
      if (!connection) {
        return true;
      }

      await waitForConnectionStartToSettle(connection);
      return ensureConnectionStopped(connection);
    };

    const startConnections = async () => {
      try {
        await Promise.all([
          startHubConnection(chatConnection),
          startHubConnection(notificationConnection),
          startHubConnection(callConnection),
        ]);

        if (isDisposed) {
          return;
        }

        setConnectionStatus("connected");
        setLoading(false);
        if (userId) {
          dispatch(addNewUserToChatList({ [userId]: currentUserProfile }));
        }

        //! ===========  CHAT CONNECTION ===========
        chatConnection.off("ReceiveChatMessages");
        chatConnection.on("ReceiveChatMessages", handleReceiveChatMessages);

        chatConnection.off("ReceiveInitialChats");
        chatConnection.on("ReceiveInitialChats", (data) => {
          try {
            const safeData = data || { Individual: {}, Group: {} };
            // به‌روزرسانی چت‌ها (append)
            store.dispatch(appendChats(safeData));
            // ✅ تنظیم flag «initialized»
            store.dispatch(forceInitialization());
          } catch (err) {
            console.error("Error in ReceiveInitialChats handler:", err);
            // در صورت خطا هم به‌طور پیش‌فرض فلَگ را روشن می‌کنیم تا UI به حالت loading نماند
            store.dispatch(forceInitialization());
          }
        });

        chatConnection.off("ReceiveTotalChats");
        chatConnection.on("ReceiveTotalChats", (data) => {
          const total = data ?? 0;
          // console.log("[SignalR] total chats:", total);
          store.dispatch(setTotalChats(total));
        });

        // یک‌بار درخواست عدد کل چت‌ها
        if (chatConnection.state === "Connected") {
          requestTotalChats().catch(() => { });
          requestChatPage(0, 7).catch(() => { });
        }

        chatConnection.off("ReceiveInitialRecipientChatProfiles");
        chatConnection.on("ReceiveInitialRecipientChatProfiles", (data) => {
          const safeData = data || {};
          const mergedData = userId
            ? { ...safeData, [userId]: { ...currentUserProfile, ...(safeData[userId] || {}) } }
            : safeData;

          const current = store.getState().chatList.chatList;
          if (Object.keys(current).length === 0) {
            store.dispatch(setInitialChatList(mergedData));
          } else {
            store.dispatch(appendChatList(mergedData));
          }
        });

        chatConnection.off("ReceiveInitialGroupProfiles");
        chatConnection.on("ReceiveInitialGroupProfiles", (data) => {
          dispatch(setGroupList(data));
        });

        chatConnection.off("ReceiveGetMessages");
        chatConnection.on("ReceiveGetMessages", (data) => {
          // console.log("ReceiveGetMessages:", {
          //   hasIndividual: !!data?.Individual,
          //   hasGroup: !!data?.Group,
          // });

          // -----------------------------
          // INDIVIDUAL
          // -----------------------------
          if (data?.Individual) {
            Object.entries(data.Individual).forEach(([chatId, messages]) => {
              Object.entries(messages || {}).forEach(([messageId, messageData]) => {
                if (!messageData) {
                  store.dispatch(
                    addMessageToIndividual({
                      chatId,
                      messageId,
                      messageData: null,
                      userId,
                    })
                  );
                  return;
                }

                const isIncoming =
                  !!messageData?.senderId && messageData.senderId !== userId;

                if (isIncoming) {
                  removeTypingUser(chatId, messageData.senderId);
                }

                // decrypt (مثل قبل)
                let decryptedContent = messageData?.content;
                if (
                  messageData?.type === 0 &&
                  decryptedContent &&
                  decryptedContent !== "این پیام حذف شده است."
                ) {
                  decryptedContent = decryptMessage(messageData.content, chatId);
                }

               // ✅ Send event to Android WebView (Native) - لحظه دریافت پیام
                // فقط برای پیام‌های ورودی (نه پیام‌هایی که خود userId فرستاده)
                if (isIncoming) {
                  postToAndroidWebView("incoming_message", {
                    scope: "Individual",
                    chatId,
                    messageId,
                    senderId: messageData?.senderId ?? null,
                    recipientId: userId ?? null,
                    type: messageData?.type ?? null,
                    content: decryptedContent ?? null,

                    // متادیتاهای مفید (اختیاری)
                    clientMessageId: messageData?.clientMessageId ?? null,
                    status: messageData?.status ?? null,
                    sentAt: messageData?.status?.sent
                      ? messageData.status.sent[Object.keys(messageData.status.sent)[0]]
                      : null,
                  });
                }

                // کد خودت: آپدیت لیست کاربرها + آرشیو
                if (isIncoming) {
                  dispatch(addNewUserToChatList({ [messageData.senderId]: {} }));
                  const senderProfile = store.getState().chatList?.chatList?.[messageData.senderId];
                  if (!senderProfile?.displayName) {
                    requestChatPage(0, 7).catch(() => { });
                  }

                  const currentIndividualChats = store.getState().chat?.Individual || [];
                  const currentChat = currentIndividualChats.find(
                    (chat) => chat.id === chatId
                  );

                  const isArchivedForCurrentUser =
                    currentChat?.archivedFor &&
                    Object.prototype.hasOwnProperty.call(currentChat.archivedFor, userId);

                  if (isArchivedForCurrentUser) {
                    dispatch(removeArchive({ Individual: { [chatId]: {} } }));

                    if (chatConnection?.state === "Connected") {
                      chatConnection.invoke("UnarchiveChat", chatId).catch(() => {
                        // ignore
                      });
                    }
                  }
                }

                // pending upload cleanup
                if (messageData?.clientMessageId) {
                  store.dispatch(removePendingUpload(messageData.clientMessageId));
                }

                // dispatch to store
                store.dispatch(
                  addMessageToIndividual({
                    chatId,
                    messageId,
                    messageData: { ...messageData, content: decryptedContent },
                    userId,
                  })
                );
              });
            });
          }

          // -----------------------------
          // GROUP
          // -----------------------------
          if (data?.Group) {
            Object.entries(data.Group).forEach(([chatId, messages]) => {
              Object.entries(messages || {}).forEach(([messageId, messageData]) => {
                if (!messageData) {
                  store.dispatch(
                    addMessageToGroup({
                      chatId,
                      messageId,
                      messageData: null,
                      userId,
                    })
                  );
                  return;
                }

                const isIncoming =
                  !!messageData?.senderId && messageData.senderId !== userId;

                if (isIncoming) {
                  removeTypingUser(chatId, messageData.senderId);
                }

                let decryptedContent = messageData?.content;
                if (
                  messageData?.type === 0 &&
                  decryptedContent &&
                  decryptedContent !== "این پیام حذف شده است."
                ) {
                  decryptedContent = decryptMessage(messageData.content, chatId);
                }

                // ✅ Send event to Android WebView (Native) - لحظه دریافت پیام گروه
                if (isIncoming) {
                  postToAndroidWebView("incoming_message", {
                    scope: "Group",
                    chatId,
                    messageId,
                    senderId: messageData?.senderId ?? null,
                    recipientId: userId ?? null,
                    type: messageData?.type ?? null,
                    content: decryptedContent ?? null,

                    clientMessageId: messageData?.clientMessageId ?? null,
                    status: messageData?.status ?? null,
                    sentAt: messageData?.status?.sent
                      ? messageData.status.sent[Object.keys(messageData.status.sent)[0]]
                      : null,
                  });
                }

                if (messageData?.clientMessageId) {
                  store.dispatch(removePendingUpload(messageData.clientMessageId));
                }

                store.dispatch(
                  addMessageToGroup({
                    chatId,
                    messageId,
                    messageData: { ...messageData, content: decryptedContent },
                    userId,
                  })
                );
              });
            });
          }
        });

        chatConnection.off("ReceiveRecipientProfiles");
        chatConnection.on("ReceiveRecipientProfiles", (data) => {
          dispatch(addNewUserToChatList(data));
        });

        chatConnection.off("UserTyping");
        chatConnection.on("UserTyping", handleTypingEvent);

        chatConnection.off("ReceiveCreateChat");
        chatConnection.on("ReceiveCreateChat", (data) => {
          if (data.Individual) {
            const individualData = data.Individual;
            const chatId = Object.keys(individualData)[0];

            if (chatId) {
              const chatData = individualData[chatId];
              dispatch(addNewIndividualChat({ chatId, chatData }));

              const participants = Array.isArray(chatData?.participants)
                ? chatData.participants
                : Array.isArray(chatData?.chatParticipants)
                  ? chatData.chatParticipants
                    .map((participant) =>
                      typeof participant === "string"
                        ? participant
                        : participant?.userId
                    )
                    .filter(Boolean)
                  : [];

              const receiverId = participants.find(
                (participantId) => participantId !== userId
              );

              if (receiverId) {
                dispatch(addNewUserToChatList({ [receiverId]: {} }));
              } else if (userId) {
                dispatch(
                  addNewUserToChatList({
                    [userId]: currentUserProfile,
                  })
                );
              }
            }
          } else if (data.Group) {
            const groupData = data.Group;
            const groupId = Object.keys(groupData)[0];

            if (groupId) {
              const groupChatData = groupData[groupId];

              if (
                groupChatData.messages &&
                Object.keys(groupChatData.messages).length > 0
              ) {
                groupChatData.messages = Object.entries(groupChatData.messages)
                  .map(([messageId, msg]) => {
                    let decryptedContent = msg.content;
                    if (
                      msg.type === 0 &&
                      decryptedContent &&
                      decryptedContent !== "این پیام حذف شده است."
                    ) {
                      decryptedContent = decryptMessage(msg.content, groupId);
                    }
                    return {
                      id: messageId,
                      ...msg,
                      content: decryptedContent,
                      sentDate: new Date(
                        msg.status.sent?.[Object.keys(msg.status.sent)[0]]
                      ),
                    };
                  })
                  .sort((a, b) => a.sentDate - b.sentDate)
                  .map(({ ...msg }) => msg);
              }

              dispatch(
                addNewGroupChat({ chatId: groupId, chatData: groupChatData })
              );
            }
          }
        });

        chatConnection.off("ReceiveArchiveChat");
        chatConnection.on("ReceiveArchiveChat", (data) => {
          dispatch(addArchive(data));
        });

        chatConnection.off("ReceiveUnarchiveChat");
        chatConnection.on("ReceiveUnarchiveChat", (data) => {
          dispatch(removeArchive(data));
        });

        chatConnection.off("ReceiveClearChat");
        chatConnection.on("ReceiveClearChat", (data) => {
          dispatch(removeIndividualChat(data));
        });
        // Add missing chat error handlers
        chatConnection.off("UnexpectedError");
        chatConnection.on("UnexpectedError", (data) => {
          console.error("Chat Hub Error:", data);         
          ErrorAlert(data.message);
        });

        chatConnection.off("ValidationError");
        chatConnection.on("ValidationError", (data) => {
          console.error("Chat Validation Error:", data);
          ErrorAlert(data.message);
        });

        chatConnection.off("ConnectionError");
        chatConnection.on("ConnectionError", (data) => {
          console.error("Chat Connection Error:", data);
          ErrorAlert(data.message);
        });

        // chatConnection.invoke("Initial", 0, 10);

        //! =========== NOTIFICATION CONNECTION ===========

        notificationConnection.off("ReceiveRecipientProfiles");
        notificationConnection.on("ReceiveRecipientProfiles", (data) => {
          dispatch(updateUserInfoToChatList(data));
          dispatch(updateUserInfoToGroupList(data));
          dispatch(updateCallRecipientList(data));
        });

        notificationConnection.off("ReceiveNewGroupProfiles");
        notificationConnection.on("ReceiveNewGroupProfiles", (data) => {
          dispatch(setGroupList(data));
          const groupId = Object.keys(data)[0];

          if (groupId) {
            if (chatConnection.state === "Connected") {
              chatConnection.invoke("CreateChat", "Group", groupId).catch(() => { });
            }
          }
        });

        notificationConnection.off("ReceiveGroupProfiles");
        notificationConnection.on("ReceiveGroupProfiles", (data) => {
          const groupId = Object.keys(data)[0];
          const groupData = data[groupId];

          const userParticipant = groupData.participants[userId];

          if (userParticipant && userParticipant.role === 2) {
            dispatch(removeGroupChat(groupId));
            dispatch(removeGroupList(groupId));
            navigate("/groups");
            return;
          }

          const currentGroupList = store.getState().groupList;
          if (Object.hasOwn(currentGroupList.groupList, groupId)) {
            dispatch(updateGroupInformations(data));
          } else {
            dispatch(updateGroupInformations(data));
            if (chatConnection.state === "Connected") {
              chatConnection.invoke("CreateChat", "Group", groupId).catch(() => { });
            }
          }
        });
        // Add missing notification handlers
        notificationConnection.off("NotificationHubInitialized");
        notificationConnection.on("NotificationHubInitialized", (data) => {
          console.log("Notification Hub initialized:", data);
        });

        notificationConnection.off("UnexpectedError");
        notificationConnection.on("UnexpectedError", (data) => {
          console.error("Notification Hub Error:", data);
          ErrorAlert(data.message);
        });

        notificationConnection.off("ReceiveSearchUsers");
        notificationConnection.on("ReceiveSearchUsers", (data) => {
          console.log("Search results:", data);
          // Handle search results
        });

        notificationConnection.off("ValidationError");
        notificationConnection.on("ValidationError", (data) => {
          console.error("Notification Validation Error:", data);
          ErrorAlert(data.message);
        });

        notificationConnection.off("ConnectionError");
        notificationConnection.on("ConnectionError", (data) => {
          console.error("Notification Connection Error:", data);
          ErrorAlert(data.message);
        });

        notificationConnection.invoke("Initial").catch(() => { });

        //! ===========  CALL CONNECTION ===========

        callConnection.off("ReceiveInitialCalls");
        callConnection.on("ReceiveInitialCalls", async (data) => {
          dispatch(setInitialCalls(data));
        });

        callConnection.off("ReceiveInitialCallRecipientProfiles");
        callConnection.on(
          "ReceiveInitialCallRecipientProfiles",
          async (data) => {
            dispatch(setCallRecipientList(data));
          }
        );

        callConnection.off("ReceiveIncomingCall");
        callConnection.on("ReceiveIncomingCall", (data) => {
          const callType = data.callType;

          logCallDebug("ReceiveIncomingCall", {
            callId: data.callId,
            callType,
          });

          // âœ… Send event to Android WebView (Native)
          postToAndroidWebView("incoming_call", {
            callId: data.callId,
            callType: data.callType,
            callerId: data.callerId ?? null,
            recipientId: data.recipientId ?? null,
            fullData: data,
          });

          handleIncomingCall(data, dispatch, userId);
        });

        callConnection.off("ReceiveOutgoingCall");
        callConnection.on("ReceiveOutgoingCall", async (data) => {
          logCallDebug("ReceiveOutgoingCall", {
            callId: data.callId,
            callType: data.callType,
          });
          handleOutgoingCall(data, dispatch, userId);
        });

        callConnection.off("ReceiveEndCall");
        callConnection.on("ReceiveEndCall", (data) => {
          logCallDebug("ReceiveEndCall", { call: data.call });
          handleEndCall(data.call, dispatch);
          const otherDataKey = Object.keys(data).find((key) => key !== "call");
          if (otherDataKey) {
            const otherDataObject = data[otherDataKey];
            if (otherDataObject) {
              const formattedData = {
                [otherDataKey]: {
                  id: otherDataKey,
                  ...otherDataObject,
                },
              };
              dispatch(updateCallRecipientList(formattedData));
            }
          }
        });

        callConnection.off("ReceiveDeleteCall");
        callConnection.on("ReceiveDeleteCall", (data) => {
          dispatch(deleteCallHistory(data));
        });

        callConnection.off("ReceiveAcceptCall");
        callConnection.on("ReceiveAcceptCall", () => {
          logCallDebug("ReceiveAcceptCall");
          dispatch(setIsCallStarted(true));
          dispatch(setIsCallStarting(false));
          dispatch(setCallStartedDate(new Date().toISOString()));
        });

        // Add missing call error handlers
        callConnection.off("UnexpectedError");
        callConnection.on("UnexpectedError", (data) => {
          console.error("Call Hub Error:", data);
          // Don't show every database error to users - log them instead
          if (data.message.includes("LINQ expression")) {
            console.error("Database query error - check server logs");
            // Optionally show a generic error to user
            ErrorAlert("یک خطای داخلی رخ داده است. لطفاً دوباره تلاش کنید.");
          } else {
            ErrorAlert(data.message);
          }
        });

        callConnection.off("ValidationError");
        callConnection.on("ValidationError", (data) => {
          console.error("Call Validation Error:", data);
          ErrorAlert(data.message);
        });

        callConnection.off("ConnectionError");
        callConnection.on("ConnectionError", (data) => {
          console.error("Call Connection Error:", data);
          ErrorAlert(data.message);
        });

        callConnection.invoke("Initial").catch(() => { });

        //! ==== CONNECTION ERRORS =====

        chatConnection.on("Error", (data) => {
          ErrorAlert(data.message);
        });

        notificationConnection.on("Error", (data) => {
          ErrorAlert(data.message);
        });
      } catch (err) {
        if (isDisposed || isExpectedConnectionShutdownError(err)) {
          return;
        }

        setConnectionStatus("failed");
        setError(err);
        setLoading(false);
        console.error("[SignalRProvider] Failed to start connections:", err);
      }
    };

    const startConnectionsTimer = window.setTimeout(() => {
      startConnections();
    }, 0);

    setChatConnection(chatConnection);
    setNotificationConnection(notificationConnection);
    setCallConnection(callConnection);

    const handleBeforeUnload = () => {
      if (chatConnection) chatConnection.stop();
      if (notificationConnection) notificationConnection.stop();
      if (callConnection) callConnection.stop();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isDisposed = true;
      window.clearTimeout(startConnectionsTimer);
      clearAllTypingUsers();
      
      // Cancel any pending requests to abort them gracefully
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
      }

      // Properly stop all connections in the cleanup function
      // Wrap in a try-catch to suppress "connection closed" errors which are expected during cleanup
      try {
        Promise.all([
          stopHubConnection(chatConnection),
          stopHubConnection(notificationConnection),
          stopHubConnection(callConnection),
        ]).catch((err) => {
          // Suppress "connection closed" errors during cleanup - these are expected
          if (err && !isExpectedConnectionShutdownError(err)) {
            console.error("[SignalRProvider] Error stopping connections:", err);
          }
        });
      } catch (e) {
        // Suppress cleanup errors silently
      }
      
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [clearAllTypingUsers, dispatch, handleTypingEvent, navigate, removeTypingUser, requestChatMessagesPage, requestChatPage, requestTotalChats, userId]);

  useEffect(() => {
    if (
      userId &&
      chatConnection?.state === "Connected" &&
      (Individual?.length > 0 || Group?.length > 0)
    ) {
      deliverMessages();
    }
  }, [chatConnection, Individual, Group, location.pathname, userId]);

  //! ====== METHODS ======

  const handleAcceptCall = async () => {
    logCallDebug("handleAcceptCall invoked", {
      callId: callIdRef.current,
      callType,
      callConnectionState: callConnection?.state,
    });

    if (!callConnection || callConnection.state !== "Connected" || !callIdRef.current) {
      ErrorAlert("برقراری تماس امکان‌پذیر نیست. دوباره تلاش کنید.");
      return;
    }

    try {
      dispatch(setIsCallAcceptWaiting(true));
      await callConnection.invoke("AcceptCall", callIdRef.current);
      dispatch(setIsCallStarted(true));
      dispatch(setIsCallStarting(false));
      dispatch(setCallStartedDate(new Date().toISOString()));
      logCallDebug("AcceptCall hub invoke sent", { callId: callIdRef.current });
    } catch (error) {
      logCallDebug("handleAcceptCall error", error);
      dispatch(setIsCallAcceptWaiting(false));
      ErrorAlert("پذیرش تماس انجام نشد.");
    }
  };


  const addPendingRequest = (messageId) => {
    pendingRequestsRef.current.add(messageId);
  };

  const removePendingRequest = (messageId) => {
    pendingRequestsRef.current.delete(messageId);
  };

  const deliverMessages = async () => {
    try {
      const chatIdFromLocation =
        window.location.pathname.includes("chats") ||
          window.location.pathname.includes("archives")
          ? window.location.pathname.split("/")[2]
          : null;
      const groupIdFromLocation = window.location.pathname.includes("groups")
        ? window.location.pathname.split("/")[2]
        : null;

      const individualPromises = Individual.flatMap((chat) =>
        chat?.messages
          .filter((message) => {
            const isSent =
              message.status.sent &&
              Object.keys(message.status.sent).includes(userId);
            const isDelivered =
              message.status.delivered &&
              Object.keys(message.status.delivered).includes(userId);

            return (
              !isSent &&
              !isDelivered &&
              !pendingRequestsRef.current.has(message.id)
            );
          })
          .map(async (message) => {
            addPendingRequest(message.id);
            try {
              await chatConnection.invoke(
                "DeliverMessage",
                "Individual",
                chat.id,
                message.id
              );
            } finally {
              removePendingRequest(message.id);
            }
          })
      );

      const individualReadPromises = chatIdFromLocation
        ? Individual.flatMap((chat) => {
          if (chat.id === chatIdFromLocation) {
            return chat.messages
              .filter((message) => {
                const isDelivered =
                  message.status.delivered &&
                  Object.keys(message.status.delivered).includes(userId);
                const isRead =
                  message.status.read &&
                  Object.keys(message.status.read).includes(userId);
                const isSentByUser =
                  message.status.sent &&
                  Object.keys(message.status.sent).includes(userId);

                return (
                  isDelivered &&
                  !isRead &&
                  !isSentByUser &&
                  !pendingRequestsRef.current.has(message.id)
                );
              })
              .map(async (message) => {
                addPendingRequest(message.id);
                try {
                  await chatConnection.invoke(
                    "ReadMessage",
                    "Individual",
                    chat.id,
                    message.id
                  );
                } finally {
                  removePendingRequest(message.id);
                }
              });
          }
          return [];
        })
        : [];

      const groupPromises = Group.flatMap((chat) =>
        chat.messages
          .filter((message) => {
            const isSent =
              message.status.sent &&
              Object.keys(message.status.sent).includes(userId);
            const isDelivered =
              message.status.delivered &&
              Object.keys(message.status.delivered).includes(userId);
            return (
              !(isSent || isDelivered) &&
              !pendingRequestsRef.current.has(message.id)
            );
          })
          .map(async (message) => {
            addPendingRequest(message.id);
            try {
              await chatConnection.invoke(
                "DeliverMessage",
                "Group",
                chat.id,
                message.id
              );
            } finally {
              removePendingRequest(message.id);
            }
          })
      );

      const groupReadPromises = groupIdFromLocation
        ? Group.flatMap((chat) => {
          if (chat.id === groupIdFromLocation) {
            return chat.messages
              .filter((message) => {
                const isRead =
                  message.status.read &&
                  Object.keys(message.status.read).includes(userId);
                const isSentByUser =
                  message.status.sent &&
                  Object.keys(message.status.sent).includes(userId);
                return (
                  !isRead &&
                  !isSentByUser &&
                  !pendingRequestsRef.current.has(message.id)
                );
              })
              .map(async (message) => {
                addPendingRequest(message.id);
                try {
                  await chatConnection.invoke(
                    "ReadMessage",
                    "Group",
                    chat.id,
                    message.id
                  );
                } finally {
                  removePendingRequest(message.id);
                }
              });
          }
          return [];
        })
        : [];

      await Promise.all([
        ...individualPromises,
        ...individualReadPromises,
        ...groupPromises,
        ...groupReadPromises,
      ]);
    } catch {
      /* empty */
    }
  };

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "var(--app-height)",
          background:
            user.userSettings.theme === "Dark" ? "#141414" : "#ffffff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <PreLoader />
      </div>
    );
  }

  return (
    <SignalRContext.Provider
      value={{
        chatConnection,
        notificationConnection,
        callConnection,
        typingUsersByChat,
        connectionStatus,
        error,
        loading,
        handleAcceptCall,
        requestChatPage,
        requestChatMessagesPage,
        requestTotalChats,
        ensureChatConnection,
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
};

SignalRProvider.propTypes = {
  children: PropTypes.node.isRequired,
};


const postToAndroidWebView = (eventName, payload = {}) => {
  try {
    if (typeof window === "undefined") return;
    if (!window.AndroidBridge) return;

    if (
      eventName === "incoming_call" &&
      typeof window.AndroidBridge.onIncomingCall === "function"
    ) {
      window.AndroidBridge.onIncomingCall(JSON.stringify(payload));
      return;
    }

    if (
      eventName === "incoming_message" &&
      typeof window.AndroidBridge.onIncomingMessage === "function"
    ) {
      window.AndroidBridge.onIncomingMessage(JSON.stringify(payload));
      return;
    }
  } catch (err) {
    console.error("AndroidBridge postMessage failed:", err);
  }
};
