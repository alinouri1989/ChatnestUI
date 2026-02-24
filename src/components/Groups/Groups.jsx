import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

import WelcomeScreen from "../WelcomeScreen/WelcomeScreen";
import MessageInputBar from "../../shared/components/MessageInputBar/MessageInputBar";
import GroupMessageBar from "./Components/GroupMessageBar";
import GroupDetailsBar from "./Components/GroupDetailsBar";
import GroupTopBar from "./Components/GroupTopBar";

import "../layout.scss";

function GroupChats() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [groupProfile, setGroupProfile] = useState(null);
  const { Group, isChatsInitialized } = useSelector((state) => state.chat);
  const { groupList } = useSelector((state) => state.groupList);

  useEffect(() => {
    if (isChatsInitialized && id) {
      const normalizedRouteId = String(id).toLowerCase();
      const groupChatExists = Group.some(
        (group) => String(group?.id).toLowerCase() === normalizedRouteId
      );
      const groupProfileExists = Boolean(groupList?.[id]);

      if (!groupChatExists && !groupProfileExists) {
        navigate("/home", { replace: true });
      }
    }
  }, [isChatsInitialized, Group, groupList, id, navigate]);

  useEffect(() => {
    if (!id) {
      setGroupProfile(null);
      return;
    }

    const matchedGroup = Group.find((group) => String(group.id) === String(id));
    if (!matchedGroup) {
      setGroupProfile(null);
      return;
    }

    const matchedGroupListEntry = groupList?.[id];
    if (matchedGroupListEntry) {
      setGroupProfile({
        ...matchedGroupListEntry,
        groupId: matchedGroup.id,
        lastMessage:
          matchedGroup.messages?.[matchedGroup.messages.length - 1]?.content || "",
      });
      return;
    }

    // Fallback while group profile event has not arrived yet
    setGroupProfile({
      id,
      groupId: matchedGroup.id,
      name: "Group without name",
      description: "",
      photoUrl: null,
      participants: {},
      createdDate: matchedGroup.createdDate,
      lastMessage:
        matchedGroup.messages?.[matchedGroup.messages.length - 1]?.content || "",
    });
  }, [id, Group, groupList]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!isChatsInitialized && id) {
    return null;
  }

  return (
    <div className="chat-section">
      <div className="group-general-box">
        {!id && <WelcomeScreen text={"گفت‌وگوهای گروهی شما سرتاسر رمزگذاری شده‌اند"} />}
        {id && (
          <>
            <GroupTopBar
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              groupProfile={groupProfile}
            />
            <GroupMessageBar groupId={id} />
            <MessageInputBar chatId={id} />
          </>
        )}
      </div>
      {id && (
        <GroupDetailsBar
          groupId={id}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          groupProfile={groupProfile}
        />
      )}
    </div>
  );
}

export default GroupChats;
