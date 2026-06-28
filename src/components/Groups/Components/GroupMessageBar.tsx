// @ts-nocheck
import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { HiArrowSmDown } from "react-icons/hi";
import useScreenWidth from "../../../hooks/useScreenWidth";

import { getChatBackgroundColor } from "../../../helpers/getChatBackgroundColor";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { convertToLocalTime } from "../../../helpers/convertToLocalTime";
import { groupMessagesByDate } from "../../../helpers/groupMessageByDate";

import { opacityAndTransformEffect, opacityEffect } from "../../../shared/animations/animations";
import MessageBubble from "../../../shared/components/MessageBubble/MessageBubble";
import PendingUploadsList from "../../../shared/components/PendingUploadBubble/PendingUploadsList";

import FirstChatBanner from "../../../assets/images/Home/FirstChatBanner.png";
import FirstChatBanner_dark from "../../../assets/images/Home/FirstChatBanner_dark.png";
import useThemeImage from "../../../hooks/useThemeImage";
import { useSignalR } from "../../../contexts/SignalRContext";

function GroupMessageBar({ groupId, onReplyMessage }) {
  const { user, token } = useSelector((state) => state.auth);
  const firstchatbanner = useThemeImage(FirstChatBanner, FirstChatBanner_dark);

  const { Group } = useSelector((state) => state.chat);
  const pendingUploadCount = useSelector((state) =>
    state.pendingUploads.items.reduce((count, item) => {
      if (item.chatType === "Group" && String(item.chatId) === String(groupId)) {
        return count + 1;
      }

      return count;
    }, 0)
  );
  const { groupList } = useSelector((state) => state.groupList);
  const currentUserId = getUserIdFromToken(token);

  const GroupChat = Group.find((group) => group?.id === groupId);
  const backgroundImage = getChatBackgroundColor(user.userSettings.chatBackground);
  const pagination = useSelector((state) => state.chat.paginationByChat?.[groupId]);
  const hasMore = pagination?.hasMore ?? false;
  const nextCursor = pagination?.nextCursor ?? null;

  const messagesContainerRef = useRef(null);
  const latestMessageRef = useRef(null);
  const isNearLatestRef = useRef(true);
  const lastRequestedCursorRef = useRef(null);
  const autoFillAttemptedRef = useRef(false);
  const isSmallScreen = useScreenWidth(900);
  const { requestChatMessagesPage } = useSignalR();

  const colorPalette = [
    "#4984F1",
    "#3B3BBA",
    "#21BE43",
    "#FFAB3D",
    "#FF4D4D",
    "#7E51CD",
    "#10AA91",
    "#9F2162",
    "#94775D",
  ];
  const userColorsRef = useRef(new Map());

  const assignColorToUser = (userId) => {
    if (!userColorsRef.current.has(userId)) {
      const availableColor = colorPalette[userColorsRef.current.size % colorPalette.length];
      userColorsRef.current.set(userId, availableColor);
    }
    return userColorsRef.current.get(userId);
  };

  const initialRequestDone = useRef(false);
  useEffect(() => {
    initialRequestDone.current = false;
    isNearLatestRef.current = true;
    lastRequestedCursorRef.current = null;
    autoFillAttemptedRef.current = false;
    setShowLatestButton(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId || initialRequestDone.current) return;

    requestChatMessagesPage(groupId, null);
    initialRequestDone.current = true;
  }, [groupId, requestChatMessagesPage]);

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
    if (!GroupChat || loadingMore || !hasMore || !nextCursor) return;
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

      await requestChatMessagesPage(groupId, nextCursor);
    } catch {
      lastRequestedCursorRef.current = null;
    } finally {
      setLoadingMore(false);
    }
  }, [GroupChat, loadingMore, hasMore, nextCursor, requestChatMessagesPage, groupId]);

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
  }, [GroupChat?.messages?.length, pendingUploadCount, scrollToLatestMessage, updateLatestButton]);

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
  }, [GroupChat?.messages?.length, showLoadMore, loadMore, updateLatestButton]);

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
  }, [GroupChat?.messages?.length, showLoadMore, loadingMore, loadMore]);

  const filteredGroupedMessages = groupMessagesByDate(GroupChat?.messages);

  return (
    <motion.div
      key={groupId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={isSmallScreen ? { delay: 0.4, duration: 0.5 } : { duration: 0 }}
      className="group-message-bar"
      style={{ backgroundImage }}
    >
      <div className="messages-list" ref={messagesContainerRef}>
        {filteredGroupedMessages.length === 0 ? (
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
            {filteredGroupedMessages.map(([date, messages]) => (
              <div key={date} className="date-group">
                <div className="date-heading">{date}</div>

                {messages.map((msg) => {
                  const userId = Object.keys(msg.status.sent || {})[0];
                  const group = groupList?.[groupId];
                  const senderProfile = group?.participants?.[userId];
                  const isSender = currentUserId === userId;
                  const isDeleted =
                    msg.deletedFor &&
                    Object.prototype.hasOwnProperty.call(msg.deletedFor, currentUserId);
                  const formattedTimestamp = convertToLocalTime(msg.status.sent[userId]);
                  const fileName = msg.fileName;
                  const fileSize = msg.fileSize;
                  const userColor = assignColorToUser(userId);

                  return (
                    <MessageBubble
                      key={msg.id}
                      chatId={groupId}
                      messageId={msg.id}
                      userId={currentUserId}
                      content={msg.content}
                      timestamp={formattedTimestamp}
                      isSender={isSender}
                      status={msg.status}
                      isGroupMessageBubble={true}
                      messageType={msg.type}
                      senderProfile={senderProfile}
                      userColor={userColor}
                      isDeleted={isDeleted}
                      fileName={fileName}
                      fileSize={fileSize}
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
        <PendingUploadsList chatId={groupId} chatType="Group" />
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

GroupMessageBar.propTypes = {
  groupId: PropTypes.string.isRequired,
  onReplyMessage: PropTypes.func,
};

export default GroupMessageBar;
