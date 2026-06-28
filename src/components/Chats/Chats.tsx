// @ts-nocheck
import { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

import WelcomeScreen from "../WelcomeScreen/WelcomeScreen";
import UserTopBar from "./Components/UserTopBar";
import UserDetailsBar from "./Components/UserDetailsBar";
import UserMessageBar from "./Components/UserMessageBar";
import MessageInputBar from "../../shared/components/MessageInputBar/MessageInputBar";

import { getUserIdFromToken } from "../../helpers/getUserIdFromToken";
import "../layout.scss";

function Chats() {

  const { id } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState(null);
  const [recipientId, setRecipientId] = useState(null);
  const [replyMessage, setReplyMessage] = useState(null);

  const { Individual, isChatsInitialized } = useSelector((state) => state.chat);
  const { chatList } = useSelector((state) => state.chatList);
  const { token, user } = useSelector((state) => state.auth);

  const UserId = getUserIdFromToken(token);
  const location = useLocation();

  useEffect(() => {
    if (id && Individual.length > 0 && chatList) {

      const chat = Individual.find((chat) => chat.id === id);

      if (chat) {
        const otherParticipantId = chat.participants.find((participant) => participant !== UserId);
        const resolvedRecipientId = otherParticipantId ?? UserId;
        const recipient = chatList[resolvedRecipientId];

        setRecipientId(resolvedRecipientId);
        setRecipientProfile(
          recipient || (
            resolvedRecipientId === UserId && user
              ? {
                displayName: user.displayName ?? "",
                email: user.email ?? "",
                biography: user.biography ?? "",
                profilePhoto: user.profilePhoto ?? null,
                lastConnectionDate: user.lastConnectionDate ?? null,
                isOnline: true,
                userIdentifier: user.userIdentifier ?? "",
              }
              : null
          )
        );
      }
    }
  }, [id, Individual, chatList, UserId, user]);

  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(!isSidebarOpen);
    }
  }, [location])

  useEffect(() => {
    setReplyMessage(null);
  }, [id]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!isChatsInitialized && id) {
    return null;
  }

  return (
    <div className="chat-section">
      <div className="chat-general-box">
        {!id && (
          <WelcomeScreen text={"گفت‌وگوهای شخصی شما سرتاسر رمزگذاری شده‌اند"} />
        )}
        {id && (
          <>
            <UserTopBar
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              chatId={id}
              recipientProfile={recipientProfile}
              recipientId={recipientId}
            />
            <UserMessageBar ChatId={id} onReplyMessage={setReplyMessage} />
            <MessageInputBar
              chatId={id}
              replyMessage={replyMessage}
              onClearReply={() => setReplyMessage(null)}
            />
          </>
        )}
      </div>
      {id && (
        <UserDetailsBar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          recipientProfile={recipientProfile}
          recipientId={recipientId}
        />
      )}
    </div>
  );
}

export default Chats;
