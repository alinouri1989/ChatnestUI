import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import useScreenWidth from '../../../hooks/useScreenWidth.js';
import PropTypes from "prop-types";

import { getChatBackgroundColor } from '../../../helpers/getChatBackgroundColor.js';
import { getUserIdFromToken } from '../../../helpers/getUserIdFromToken.js';
import { convertToLocalTime } from '../../../helpers/convertToLocalTime.js';
import { groupMessagesByDate } from '../../../helpers/groupMessageByDate.js';

import MessageBubble from '../../../shared/components/MessageBubble/MessageBubble.jsx';
import { opacityAndTransformEffect, opacityEffect } from '../../../shared/animations/animations.js';

import FirstChatBanner from "../../../assets/images/Home/FirstChatBanner.webp";
import { motion } from "framer-motion"

function UserMessageBar({ ChatId }) {

  const { token, user } = useSelector((state) => state.auth);
  const { Individual } = useSelector((state) => state.chat);
  const isSmallScreen = useScreenWidth(900);
  const messagesContainerRef = useRef(null);

  const userId = getUserIdFromToken(token);
  const backgroundImage = getChatBackgroundColor(user.userSettings.chatBackground);

  const chat = Individual.find(chat => chat?.id === ChatId);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [chat?.messages.length]);

  const filteredGroupedMessages = groupMessagesByDate(chat?.messages);

  return (
    <motion.div
      key={ChatId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={isSmallScreen ? { delay: 0.4, duration: 0.5 } : { duration: 0 }}
      className="user-message-bar" style={{ backgroundImage }}>
      <div className="messages-list" ref={messagesContainerRef}>
        {filteredGroupedMessages.length === 0 ? (
          <motion.div
            variants={opacityEffect(1.5)}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.5 }}
            className='first-chat-box'>
            <img src={FirstChatBanner} alt="No messages yet" />
            <motion.p
              {...opacityAndTransformEffect(0.5, 30, 0.5)}
            >
              با ارسال اولین پیام، گفت‌وگو را شروع کنید
            </motion.p>
          </motion.div>
        ) : (
          filteredGroupedMessages.map(([date, messages]) => (
            <div key={date} className="date-group">
              <div className="date-heading">{date}</div>
              {messages.map((msg) => {
                const senderId = Object.keys(msg.status.sent)[0];
                const isSender = senderId === userId;
                const isDeleted = msg.deletedFor && Object.prototype.hasOwnProperty.call(msg.deletedFor, userId);
                const formattedTimestamp = convertToLocalTime(msg.status.sent[senderId]);
                const fileName = msg.fileName;
                const fileSize = msg.fileSize;

                return (
                  <MessageBubble
                    chatId={ChatId}
                    key={msg.id}
                    messageId={msg.id}
                    content={msg.content}
                    timestamp={formattedTimestamp}
                    isSender={isSender}
                    status={msg.status}
                    messageType={msg.type}
                    userId={userId}
                    isDeleted={isDeleted}
                    fileName={fileName}
                    fileSize={fileSize}
                  />
                );
              })}

            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
UserMessageBar.propTypes = {
  ChatId: PropTypes.string.isRequired,
};

export default UserMessageBar;
