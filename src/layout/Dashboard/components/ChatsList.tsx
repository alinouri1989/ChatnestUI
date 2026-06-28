// @ts-nocheck
import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useModal } from "../../../contexts/ModalContext";
import { useDispatch, useSelector } from "react-redux";

import NewChatModal from "../../../components/Chats/Components/NewChat/NewChatModal";
import SearchInput from "./SearchInput";
import UserChatCard from "./UserChatCard";

import { getChatId } from "../../../store/Slices/chats/chatSlice";
import { toggleActiveContent } from "../../../store/Slices/activeContent/activeContentSlice";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { getChatDisplayLabel } from "../../../helpers/chatLabelHelper";
import { lastMessageDateHelper } from "../../../helpers/dateHelper";
import { isUserOnline } from "../../../helpers/presenceHelper";
import { ErrorAlert } from "../../../helpers/customAlert";

import NoActiveData from "../../../shared/components/NoActiveData/NoActiveData";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";
import { opacityEffect } from "../../../shared/animations/animations";
import useScreenWidth from "../../../hooks/useScreenWidth";

import { TbMessagePlus, TbMessageUser } from "react-icons/tb";
import { motion } from "framer-motion";
import "./style.scss";

import { useSignalR } from "../../../contexts/SignalRContext";

const getMessageSentAt = (message) => {
  const sentMap = message?.status?.sent;
  const sentAt =
    sentMap && typeof sentMap === "object"
      ? Object.values(sentMap)[0]
      : message?.createdDate ?? message?.sentDate ?? null;
  const parsed = new Date(sentAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getLatestVisibleMessage = (messages, userId) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  let latestMessage = null;
  let latestTime = 0;

  messages.forEach((msg) => {
    const isDeletedForUser =
      msg?.deletedFor && Object.prototype.hasOwnProperty.call(msg.deletedFor, userId);

    if (isDeletedForUser) return;

    const sentAt = getMessageSentAt(msg);
    if (!latestMessage || sentAt >= latestTime) {
      latestMessage = msg;
      latestTime = sentAt;
    }
  });

  return latestMessage;
};

function ChatsList() {
  const { showModal, closeModal } = useModal();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { Individual, isChatsInitialized, totalChats } = useSelector((state) => state.chat);
  const chatList = useSelector((state) => state.chatList.chatList);
  const { token } = useSelector((state) => state.auth);
  const userId = getUserIdFromToken(token);

  const pageSize = 7;
  const [searchUser, setSearchUser] = useState("");
  const [page, setPage] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { requestChatPage, requestTotalChats, connectionStatus, chatConnection } = useSignalR();

  const firstLoadDone = useRef(false);
  const isFetchingRef = useRef(false);

  const loadPage = useCallback(
    async (pageIndex) => {
      if (isFetchingRef.current) return false;
      if (connectionStatus !== "connected") {
        return false;
      }

      isFetchingRef.current = true;
      setIsFetching(true);

      const skip = pageIndex * pageSize;

      try {
        await requestChatPage(skip, pageSize);
        await requestTotalChats();
        return true;
      } catch (error) {
        console.error("Chat page request failed:", error);
        return false;
      } finally {
        isFetchingRef.current = false;
        setIsFetching(false);
      }
    },
    [connectionStatus, pageSize, requestChatPage, requestTotalChats]
  );

  useEffect(() => {
    if (connectionStatus !== "connected" || firstLoadDone.current) {
      return;
    }

    let isCancelled = false;
    loadPage(0).then((loaded) => {
      if (!isCancelled && loaded) {
        firstLoadDone.current = true;
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [connectionStatus, loadPage]);

  const handleLoadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || connectionStatus !== "connected") return;

    const nextPage = page + 1;
    const loaded = await loadPage(nextPage);
    if (loaded) {
      setPage(nextPage);
    }
  }, [loadPage, hasMore, connectionStatus, page]);

  useEffect(() => {
    const displayedCount = (page + 1) * pageSize;
    setHasMore(displayedCount < (Number(totalChats) || 0));
  }, [totalChats, page, pageSize]);

  const normalizedSearch = searchUser.trim().toLowerCase();

  useEffect(() => {
    if (!normalizedSearch) return;
    if (!firstLoadDone.current) return;
    if (!hasMore || isFetching) return;

    // Auto-load all pages while searching so search covers all conversations.
    handleLoadMore();
  }, [normalizedSearch, hasMore, isFetching, handleLoadMore]);

  const individualArray = useMemo(() => {
    return Array.isArray(Individual) ? Individual : Object.values(Individual);
  }, [Individual]);

  const isSmallScreen = useScreenWidth(900);
  const location = useLocation();

  const enhancedChatList = useMemo(() => {
    return Object.entries(chatList)
      .map(([receiverId, user]) => {
        const chatData = individualArray.find((chat) => {
          if (!Array.isArray(chat?.participants)) return false;
          if (receiverId === userId) {
            return (
              chat.participants.length > 0 &&
              chat.participants.every((participantId) => participantId === userId)
            );
          }

          return chat.participants.includes(receiverId) && chat.participants.includes(userId);
        });

        const chatId = chatData?.id ?? getChatId({ Individual }, userId, receiverId);
        if (!chatId) {
          return null;
        }

        const resolvedChatData =
          chatData ?? individualArray.find((chat) => chat?.id === chatId);

        const hasMessages = !!resolvedChatData?.messages?.length;
        const latestVisibleMessage = getLatestVisibleMessage(resolvedChatData?.messages, userId);

        const lastMessage = latestVisibleMessage?.content ?? (hasMessages ? "" : "هنوز پیامی ارسال نشده");
        const lastMessageDateForSort = getMessageSentAt(latestVisibleMessage);
        const lastMessageDate = latestVisibleMessage
          ? lastMessageDateHelper(Object.values(latestVisibleMessage.status?.sent ?? {})[0])
          : "";

        const isArchive =
          resolvedChatData?.archivedFor &&
          Object.prototype.hasOwnProperty.call(resolvedChatData.archivedFor, userId);
        const isActiveChat = chatId ? location.pathname.includes(chatId) : false;

        const unReadMessage =
          !isActiveChat && hasMessages
            ? resolvedChatData.messages.filter((msg) => {
              const isSentByMe = Object.keys(msg.status?.sent ?? {}).includes(userId);
              const isReadByMe = !!msg.status?.read?.[userId];
              const isDeletedForMe =
                msg.deletedFor &&
                Object.prototype.hasOwnProperty.call(msg.deletedFor, userId);

              return !isSentByMe && !isReadByMe && !isDeletedForMe;
            }).length
            : 0;

        return {
          receiverId,
          image: user.profilePhoto,
          status:
            receiverId !== userId &&
            isUserOnline(user.lastConnectionDate, user.isOnline),
          name: getChatDisplayLabel(user.displayName, receiverId, userId),
          userIdentifier: user.userIdentifier,
          lastMessage,
          lastMessageType: latestVisibleMessage?.type ?? 0,
          lastMessageDate,
          lastMessageDateForSort,
          isArchive,
          isDeleted: false,
          unReadMessage,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.lastMessageDateForSort !== b.lastMessageDateForSort) {
          return b.lastMessageDateForSort - a.lastMessageDateForSort;
        }

        const aHasUnread = a.unReadMessage > 0;
        const bHasUnread = b.unReadMessage > 0;

        if (aHasUnread !== bHasUnread) {
          return Number(bHasUnread) - Number(aHasUnread);
        }

        if (a.status !== b.status) {
          return Number(b.status) - Number(a.status);
        }

        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
  }, [chatList, individualArray, userId, location.pathname, Individual]);

  const nonArchivedChats = enhancedChatList.filter((chat) => !chat.isArchive);
  const filteredChats = nonArchivedChats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(normalizedSearch) ||
      (chat.userIdentifier ?? "").toLowerCase().includes(normalizedSearch)
  );

  const displayedChats = useMemo(() => {
    if (normalizedSearch) {
      return filteredChats;
    }

    return filteredChats.slice(0, (page + 1) * pageSize);
  }, [filteredChats, normalizedSearch, page, pageSize]);

  const handleNewChat = () => {
    showModal(<NewChatModal closeModal={closeModal} />);
  };

  const handleOpenSavedMessages = useCallback(async () => {
    if (!userId) {
      return;
    }

    const existingChatId = getChatId({ Individual: individualArray }, userId, userId);
    if (existingChatId) {
      navigate(`/chats/${existingChatId}`);
      dispatch(toggleActiveContent());
      return;
    }

    if (!chatConnection || chatConnection.state !== "Connected") {
      ErrorAlert("اتصال چت برقرار نیست.");
      return;
    }

    try {
      const savedMessagesChatId = await chatConnection.invoke("GetOrCreateSavedMessagesChat");
      if (!savedMessagesChatId) {
        ErrorAlert("باز کردن پیام‌های ذخیره‌شده انجام نشد.");
        return;
      }

      navigate(`/chats/${savedMessagesChatId}`);
      dispatch(toggleActiveContent());
    } catch {
      ErrorAlert("باز کردن پیام‌های ذخیره‌شده انجام نشد.");
    }
  }, [userId, individualArray, chatConnection, navigate, dispatch]);

  return (
    <div className="chat-list-box" style={{ overflowY: "auto", height: "100%" }}>
      {isSmallScreen && <h2 className="mobil-menu-title">گفت‌وگوها</h2>}

      <SearchInput
        value={searchUser}
        onChange={setSearchUser}
        placeholder={"در گفت‌وگوهایتان جستجو کنید..."}
      />
      <div className="flex">

        <button onClick={handleNewChat} className="create-buttons">
          {isSmallScreen ? <TbMessagePlus /> : "گفت‌وگوی جدید"}
        </button>
        <button onClick={handleOpenSavedMessages} className="create-buttons-left">
          {isSmallScreen ? <TbMessageUser /> : "پیام‌های ذخیره‌شده"}
        </button>
      </div>

      <div className="list-flex">
        <motion.div
          className="user-list"
          variants={opacityEffect(0.8)}
          initial="initial"
          animate="animate"
        >
          {displayedChats.length > 0 ? (
            displayedChats.map((chat) => (
              <motion.div
                key={chat.receiverId}
                style={{ marginBottom: "10px" }}
                variants={opacityEffect(0.8)}
              >
                <UserChatCard
                  receiverId={chat.receiverId}
                  image={chat.image}
                  status={chat.status}
                  name={chat.name}
                  userIdentifier={chat.userIdentifier}
                  lastMessage={chat.lastMessage}
                  lastMessageType={chat.lastMessageType}
                  lastMessageDate={chat.lastMessageDate}
                  isArchive={chat.isArchive}
                  unReadMessage={chat.unReadMessage}
                  isDeleted={chat.isDeleted}
                />
              </motion.div>
            ))
          ) : isChatsInitialized ? (
            <NoActiveData
              text={
                normalizedSearch
                  ? "کاربر مطابقی پیدا نشد"
                  : "گفت‌وگوی فعالی پیدا نشد"
              }
            />
          ) : (
            <PreLoader />
          )}

          {isFetching && (
            <div style={{ textAlign: "center", padding: "10px" }}>
              <PreLoader />
            </div>
          )}

          {!normalizedSearch && hasMore && !isFetching && (
            <div style={{ textAlign: "center", margin: "12px 0" }}>
              <button onClick={handleLoadMore} className="show-more">
                بارگذاری بیشتر
              </button>
            </div>
          )}

          {normalizedSearch && hasMore && (
            <div style={{ textAlign: "center", margin: "12px 0", color: "#777" }}>
              در حال بارگذاری بیشتر
            </div>
          )}

          {!hasMore && displayedChats.length > 0 && !normalizedSearch && (
            <div
              style={{
                textAlign: "center",
                padding: "8px",
                color: "#777",
              }}
            >
              تمام گفت‌وگوها نمایش داده شد
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default ChatsList;
