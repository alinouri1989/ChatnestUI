import { useRef, useEffect } from 'react'
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { motion } from "framer-motion";
import useScreenWidth from '../../../hooks/useScreenWidth.js';

import { getChatBackgroundColor } from '../../../helpers/getChatBackgroundColor.js';
import { getUserIdFromToken } from '../../../helpers/getUserIdFromToken.js';
import { convertToLocalTime } from '../../../helpers/convertToLocalTime.js';
import { groupMessagesByDate } from '../../../helpers/groupMessageByDate.js';

import { opacityAndTransformEffect, opacityEffect } from '../../../shared/animations/animations.js';
import MessageBubble from "../../../shared/components/MessageBubble/MessageBubble.jsx";
import PendingUploadsList from "../../../shared/components/PendingUploadBubble/PendingUploadsList.jsx";

import FirstChatBanner from "../../../assets/images/Home/FirstChatBanner.webp";

function GroupMessageBar({ groupId }) {

    const { user, token } = useSelector((state) => state.auth);

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

    const GroupChat = Group.find(group => group?.id === groupId);
    const backgroundImage = getChatBackgroundColor(user.userSettings.chatBackground);

    const messagesContainerRef = useRef(null);
    const isSmallScreen = useScreenWidth(900);

    const colorPalette = ["#4984F1", "#3B3BBA", "#21BE43", "#FFAB3D", "#FF4D4D", "#7E51CD", "#10AA91", "#9F2162", "#94775D"];
    const userColorsRef = useRef(new Map());

    const assignColorToUser = (userId) => {
        if (!userColorsRef.current.has(userId)) {
            const availableColor = colorPalette[userColorsRef.current.size % colorPalette.length];
            userColorsRef.current.set(userId, availableColor);
        }
        return userColorsRef.current.get(userId);
    };

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [GroupChat?.messages, pendingUploadCount]);

    const filteredGroupedMessages = groupMessagesByDate(GroupChat?.messages);

    return (
        <motion.div
            key={groupId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={isSmallScreen ? { delay: 0.4, duration: 0.5 } : { duration: 0 }}
            className="group-message-bar" style={{ backgroundImage }}>
            <div className="messages-list" ref={messagesContainerRef} >
                {filteredGroupedMessages.length === 0 ? (
                    <motion.div
                        variants={opacityEffect(1.5)}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: 0.5 }}
                        className="first-chat-box"
                    >
                        <img src={FirstChatBanner} alt="No messages yet" />
                        <motion.p {...opacityAndTransformEffect(0.5, 30, 0.5)}>
                            با ارسال اولین پیام، گفت‌وگو را شروع کنید
                        </motion.p>
                    </motion.div>
                ) : (
                    filteredGroupedMessages.map(([date, messages]) => (
                        <div key={date} className="date-group">
                            <div className="date-heading">{date}</div>

                            {messages.map((msg) => {
                                const userId = Object.keys(msg.status.sent || {})[0];
                                const groupListId = GroupChat?.participants?.[0];
                                const group = groupList[groupListId];
                                const senderProfile = group?.participants?.[userId];
                                const isSender = currentUserId === userId;
                                const isDeleted = msg.deletedFor && Object.prototype.hasOwnProperty.call(msg.deletedFor, currentUserId);
                                const formattedTimestamp = convertToLocalTime(
                                    msg.status.sent[userId]
                                );
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
                                    />
                                );
                            })}
                        </div>
                    ))
                )}
                <PendingUploadsList chatId={groupId} chatType="Group" />
            </div>
        </motion.div>
    );
}

// PropTypes validation
GroupMessageBar.propTypes = {
    groupId: PropTypes.string.isRequired,
};

export default GroupMessageBar
