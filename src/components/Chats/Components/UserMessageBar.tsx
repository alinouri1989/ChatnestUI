// @ts-nocheck
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { HiArrowSmDown } from "react-icons/hi";

import { getChatBackgroundColor } from "../../../helpers/getChatBackgroundColor";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { convertToLocalTime } from "../../../helpers/convertToLocalTime";
import { groupMessagesByDate } from "../../../helpers/groupMessageByDate";
import MessageBubble from "../../../shared/components/MessageBubble/MessageBubble";
import PendingUploadsList from "../../../shared/components/PendingUploadBubble/PendingUploadsList";
import {
  opacityAndTransformEffect,
  opacityEffect,
} from "../../../shared/animations/animations";

import FirstChatBanner from "../../../assets/images/Home/FirstChatBanner.png";
import FirstChatBanner_dark from "../../../assets/images/Home/FirstChatBanner_dark.png";
import useThemeImage from "../../../hooks/useThemeImage";

import useScreenWidth from "../../../hooks/useScreenWidth";
import { useSignalR } from "../../../contexts/SignalRContext";

function UserMessageBar({ ChatId, onReplyMessage }) {
  const { token, user } = useSelector((s) => s.auth);
  const { Individual } = useSelector((s) => s.chat);
  const firstchatbanner = useThemeImage(FirstChatBanner, FirstChatBanner_dark);

  const isSmallScreen = useScreenWidth(900);
  const messagesContainerRef = useRef(null);
  const latestMessageRef = useRef(null);
  const isNearLatestRef = useRef(true);
  const lastRequestedCursorRef = useRef(null);
  const autoFillAttemptedRef = useRef(false);
  const userId = getUserIdFromToken(token);
  const backgroundImage = getChatBackgroundColor(user.userSettings.chatBackground);
  const chat = Individual.find((c) => c?.id === ChatId);

  const pagination = useSelector((state) => state.chat.paginationByChat?.[ChatId]);
  const hasMore = pagination?.hasMore ?? false;
  const nextCursor = pagination?.nextCursor ?? null;

  const { requestChatMessagesPage } = useSignalR();

  const initialRequestDone = useRef(false);
  useEffect(() => {
    initialRequestDone.current = false;
    isNearLatestRef.current = true;
    lastRequestedCursorRef.current = null;
    autoFillAttemptedRef.current = false;
    setShowLatestButton(false);
  }, [ChatId]);

  useEffect(() => {
    if (!ChatId || initialRequestDone.current) return;

    requestChatMessagesPage(ChatId, null);
    initialRequestDone.current = true;
  }, [ChatId, requestChatMessagesPage]);

  const prevScroll = useRef({ top: 0, height: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [showLatestButton, setShowLatestButton] = useState(false);

  const updateLatestButton = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearLatest = distanceFromBottom < 180;
    isNearLatestRef.current = isNearLatest;
    setShowLatestButton(!isNearLatest);
  }, []);

  const scrollToLatestMessage = useCallback((behavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (latestMessageRef.current) {
      latestMessageRef.current.scrollIntoView({ behavior, block: "end" });
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }

    isNearLatestRef.current = true;
    setShowLatestButton(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (!chat || loadingMore || !hasMore || !nextCursor) return;
    if (lastRequestedCursorRef.current === nextCursor) return;

    setLoadingMore(true);
    lastRequestedCursorRef.current = nextCursor;
    try {
      if (messagesContainerRef.current) {
        prevScroll.current = {
          top: messagesContainerRef.current.scrollTop,
          height: messagesContainerRef.current.scrollHeight,
        };
      }

      await requestChatMessagesPage(ChatId, nextCursor);
    } catch {
      lastRequestedCursorRef.current = null;
    } finally {
      setLoadingMore(false);
    }
  }, [chat, loadingMore, hasMore, nextCursor, requestChatMessagesPage, ChatId]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (prevScroll.current.height) {
      const { top, height } = prevScroll.current;
      const diff = container.scrollHeight - height;
      container.scrollTop = top + diff;
      prevScroll.current = { top: 0, height: 0 };
      updateLatestButton();
    } else if (isNearLatestRef.current) {
      scrollToLatestMessage("auto");
    } else {
      setShowLatestButton(true);
    }
  }, [chat?.messages?.length, scrollToLatestMessage, updateLatestButton]);

  const groupedMessages = groupMessagesByDate(chat?.messages);
  const showLoadMore = hasMore && Boolean(nextCursor);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateLatestButton();

      const threshold = 24;
      if (container.scrollTop <= threshold && showLoadMore) {
        loadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chat?.messages?.length, showLoadMore, loadMore, updateLatestButton]);

  useEffect(() => {
    if (!showLoadMore || loadingMore || autoFillAttemptedRef.current) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const rafId = requestAnimationFrame(() => {
      autoFillAttemptedRef.current = true;
      const isScrollable = container.scrollHeight > container.clientHeight + 4;
      if (!isScrollable) {
        loadMore();
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [chat?.messages?.length, showLoadMore, loadingMore, loadMore]);

  return (
    <motion.div
      key={ChatId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={isSmallScreen ? { delay: 0.4, duration: 0.5 } : { duration: 0 }}
      className="user-message-bar"
      style={{ backgroundImage }}
    >
      <div className="messages-list" ref={messagesContainerRef}>
        {groupedMessages.length === 0 ? (
          <motion.div
            variants={opacityEffect(1.5)}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.5 }}
            className="first-chat-box"
          >
            <img src={firstchatbanner} alt="No messages yet" />
            <motion.p {...opacityAndTransformEffect(0.5, 30, 0.5)}>
              با ارسال اولین پیام، گفت‌وگو را شروع کنید
            </motion.p>
          </motion.div>
        ) : (
          <>
            {loadingMore && (
              <div className="loading-more">
                 در حال بارگزاری...
                <span className="loader"></span>
              </div>
            )}
            {groupedMessages.map(([date, messages]) => (
              <div key={date || "no-date"} className="date-group">
                {date && <div className="date-heading">{date}</div>}
                {messages.map((msg) => {
                  const senderId = Object.keys(msg.status?.sent ?? {})[0];
                  const isSender = senderId === userId;
                  const isDeleted =
                    msg.deletedFor &&
                    Object.prototype.hasOwnProperty.call(msg.deletedFor, userId);
                  const formattedTimestamp = convertToLocalTime(
                    msg.status?.sent?.[senderId]
                  );

                  return (
                    <MessageBubble
                      key={msg.id}
                      chatId={ChatId}
                      messageId={msg.id}
                      content={msg.content}
                      timestamp={formattedTimestamp}
                      isSender={isSender}
                      status={msg.status}
                      messageType={msg.type}
                      userId={userId}
                      isDeleted={isDeleted}
                      fileName={msg.fileName}
                      fileSize={msg.fileSize}
                      thumbnailUrl={msg.thumbnailUrl}
                      replyToMessageId={msg.replyToMessageId}
                      replyToSenderId={msg.replyToSenderId}
                      replyToType={msg.replyToType}
                      replyToContent={msg.replyToContent}
                      replyToFileName={msg.replyToFileName}
                      onReplyMessage={onReplyMessage}
                    />
                  );
                })}
              </div>
            ))}
          </>
        )}

        <PendingUploadsList chatId={ChatId} chatType="Individual" />
        <div ref={latestMessageRef} className="latest-message-anchor" />
      </div>

      {showLatestButton && (
        <button
          type="button"
          className="latest-message-button"
          aria-label="Scroll to latest message"
          title="Scroll to latest message"
          onClick={() => scrollToLatestMessage()}
        >
          <HiArrowSmDown aria-hidden="true" />
        </button>
      )}
    </motion.div>
  );
}

UserMessageBar.propTypes = {
  ChatId: PropTypes.string.isRequired,
  onReplyMessage: PropTypes.func,
};

export default UserMessageBar;
