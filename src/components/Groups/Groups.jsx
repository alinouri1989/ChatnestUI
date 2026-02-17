import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

import WelcomeScreen from "../WelcomeScreen/WelcomeScreen";
import MessageInputBar from "../../shared/components/MessageInputBar/MessageInputBar";
import GroupMessageBar from "./Components/GroupMessageBar";
import GroupDetailsBar from "./Components/GroupDetailsBar";
import GroupTopBar from "./Components/GroupTopBar";

import { ErrorAlert } from "../../helpers/customAlert";
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
      const groupExists = Group.some((group) => group.id === id);
      if (!groupExists) {
        navigate("/anasayfa", { replace: true });
      }
    }
  }, [isChatsInitialized, Group, id, navigate]);


  useEffect(() => {
    if (id && Group?.length > 0 && groupList) {
      const matchedGroup = Group.find((group) => String(group.id) === String(id));

      if (matchedGroup) {
        const participantId = matchedGroup.participants?.[0];

        if (participantId) {
          const matchedGroupListEntry = groupList[participantId];

          if (matchedGroupListEntry) {
            setGroupProfile({
              ...matchedGroupListEntry,
              groupId: matchedGroup.id,
              lastMessage: matchedGroup.messages?.[matchedGroup.messages.length - 1]?.content || "",
            });
          } else {
            ErrorAlert("خطایی رخ داده است.");
            setGroupProfile(null);
          }
        } else {
          ErrorAlert("خطایی رخ داده است.");
          setGroupProfile(null);
        }
      } else {
        ErrorAlert("خطایی رخ داده است.");
        setGroupProfile(null);
      }
    } else {
      setGroupProfile(null);
    }
  }, [id, Group, groupList]);


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!isChatsInitialized && id) {
    return null;
  }

  return (
    <div className="chat-section">
      <div className='group-general-box'>
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
