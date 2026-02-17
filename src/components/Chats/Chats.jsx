import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState(null);
  const [recipientId, setRecipientId] = useState(null);

  const { Individual, isChatsInitialized } = useSelector((state) => state.chat);
  const { chatList } = useSelector((state) => state.chatList);
  const { token } = useSelector((state) => state.auth);

  const UserId = getUserIdFromToken(token);
  const location = useLocation();

  useEffect(() => {
    if (isChatsInitialized && id) {
      const chatExists = Individual.some((chat) => chat.id === id);
      if (!chatExists) {
        navigate("/anasayfa", { replace: true });
      }
    }
  }, [isChatsInitialized, Individual, id, navigate]);

  useEffect(() => {
    if (id && Individual.length > 0 && chatList) {

      const chat = Individual.find((chat) => chat.id === id);

      if (chat) {
        const recipientId = chat.participants.find((participant) => participant !== UserId);

        if (recipientId) {
          const recipient = chatList[recipientId];
          setRecipientProfile(recipient || null);
          setRecipientId(recipientId);
        }
      }
    }
  }, [id, Individual, chatList, UserId]);

  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(!isSidebarOpen);
    }
  }, [location])

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
              recipientProfile={recipientProfile}
              recipientId={recipientId}
            />
            <UserMessageBar ChatId={id} />
            <MessageInputBar chatId={id} />
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
