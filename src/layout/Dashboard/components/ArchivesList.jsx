import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import useScreenWidth from "../../../hooks/useScreenWidth";

import SearchInput from "./SearchInput";
import UserChatCard from "./UserChatCard";

import { lastMessageDateHelper } from "../../../helpers/dateHelper";
import { isUserOnline } from "../../../helpers/presenceHelper";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { getChatDisplayLabel } from "../../../helpers/chatLabelHelper";
import { getChatId } from "../../../store/Slices/chats/chatSlice";

import { opacityEffect } from "../../../shared/animations/animations";
import NoActiveData from "../../../shared/components/NoActiveData/NoActiveData";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";

import { motion } from 'framer-motion';
import "./style.scss";

function ArchivesList() {

    const location = useLocation();

    const { Individual, isChatsInitialized } = useSelector((state) => state.chat);
    const chatState = useSelector(state => state.chat);
    const chatList = useSelector((state) => state.chatList.chatList);
    const { token } = useSelector((state) => state.auth);
    const UserId = getUserIdFromToken(token);

    const isSmallScreen = useScreenWidth(900);
    const [searchUser, setSearchUser] = useState("");

    const [enhancedChatList, setEnhancedChatList] = useState([]);

    useEffect(() => {
        const updatedChatList = Object.entries(chatList)
            .map(([receiverId, user]) => {
                const chatData = Individual.find((chat) => {
                    if (!Array.isArray(chat?.participants)) {
                        return false;
                    }
                    return (
                        chat.participants.includes(receiverId) &&
                        chat.participants.includes(UserId)
                    );
                });

                const chatId = getChatId(chatState, UserId, receiverId);

                if (!chatData || !chatData.messages || chatData.messages.length === 0) {
                    return null;
                }

                const lastMessage = chatData?.messages[chatData?.messages.length - 1].content
                const lastMessageForDeleted = chatData?.messages[chatData?.messages.length - 1].content
                const isDeleted = lastMessageForDeleted?.deletedFor && Object.prototype.hasOwnProperty.call(lastMessageForDeleted.deletedFor, UserId);

                const lastMessageType = chatData?.messages[chatData?.messages.length - 1].type;

                const lastMessageDate =
                    chatData.messages.length > 0
                        ? lastMessageDateHelper(
                            Object.values(chatData.messages[chatData.messages.length - 1].status.sent)[0]
                        )
                        : "";

                const lastMessageDateForSort =
                    chatData.messages.length > 0
                        ? new Date(
                            Object.values(chatData.messages[chatData.messages.length - 1].status.sent)[0]
                        ).getTime()
                        : "";

                const isArchive = chatData.archivedFor && Object.prototype.hasOwnProperty.call(chatData.archivedFor, UserId);

                const isActiveChat = location.pathname.includes(chatId);

                const unReadMessage = !isActiveChat && chatData.messages.filter((message) => {
                    return (
                        !Object.keys(message.status.sent).includes(UserId) &&
                        !message.status.read?.[UserId]
                    );
                }).length;

                return {
                    receiverId,
                    image: user.profilePhoto,
                    status: isUserOnline(user.lastConnectionDate),
                    name: getChatDisplayLabel(user.displayName, receiverId, UserId),
                    lastMessage,
                    lastMessageDate,
                    lastMessageType,
                    lastMessageDateForSort,
                    isArchive,
                    isDeleted,
                    unReadMessage
                };
            })
            .filter((chat) => chat !== null)
            .sort((a, b) => b.lastMessageDateForSort - a.lastMessageDateForSort);

        setEnhancedChatList(updatedChatList);
    }, [chatList, Individual, UserId, chatState, location.pathname]);

    const archivedChats = enhancedChatList.filter((chat) => chat.isArchive);
    const filteredChats = archivedChats.filter(chat =>
        chat.name.toLowerCase().includes(searchUser.toLowerCase())
    );

    return (
        <div className="archive-list-box">
            {isSmallScreen && <h2 className="mobil-menu-title">بایگانی‌ها</h2>}
            <SearchInput value={searchUser} onChange={setSearchUser} placeholder={"در گفت‌وگوهای بایگانی‌شده جستجو کنید"} />
            <div className="list-flex">
                <motion.div
                    className="user-list"
                    variants={opacityEffect(0.8)}
                    initial="initial"
                    animate="animate"
                >
                    {filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                            <motion.div
                                key={chat.receiverId}
                                variants={opacityEffect(0.8)}
                                style={{ marginBottom: "10px" }}
                            >
                                <UserChatCard
                                    receiverId={chat.receiverId}
                                    image={chat.image}
                                    status={chat.status}
                                    name={chat.name}
                                    lastMessage={chat.lastMessage}
                                    lastMessageType={chat.lastMessageType}
                                    lastMessageDate={chat.lastMessageDate}
                                    isArchive={chat.isArchive}
                                    unReadMessage={chat.unReadMessage}
                                    isDeleted={chat.isDeleted}
                                />
                            </motion.div>
                        ))
                    ) : (
                        isChatsInitialized
                            ? <NoActiveData text={searchUser ? "کاربر مطابقی پیدا نشد" : "گفت‌وگوی بایگانی‌شده‌ای ندارید."} />
                            : <PreLoader />
                    )}
                </motion.div>
            </div>
        </div>
    )
}

export default ArchivesList
