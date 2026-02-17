import { useState } from "react";
import { useSelector } from "react-redux";
import { useModal } from "../../../contexts/ModalContext";
import useScreenWidth from "../../../hooks/useScreenWidth";

import SearchInput from "./SearchInput";
import GroupChatCard from "./GroupChatCard";

import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { lastMessageDateHelper } from "../../../helpers/dateHelper";

import { opacityEffect } from "../../../shared/animations/animations";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";
import NoActiveData from "../../../shared/components/NoActiveData/NoActiveData";
import NewGroupModal from "../../../components/Groups/Components/NewAndSettingsGroup/NewAndSettingsGroupModal";

import { TbMessagePlus } from "react-icons/tb";
import { motion } from "framer-motion";
import "./style.scss";

function GroupsList() {
  const { token } = useSelector((state) => state.auth);
  const userId = getUserIdFromToken(token);

  const { Group, isChatsInitialized } = useSelector((state) => state.chat);
  const { groupList } = useSelector((state) => state.groupList);

  const [searchGroup, setSearchGroup] = useState("");

  const { showModal, closeModal } = useModal();
  const isSmallScreen = useScreenWidth(900);
  const location = window.location;

  const handleNewGroup = () => {
    showModal(<NewGroupModal closeModal={closeModal} />);
  };

  const filteredGroupList = groupList
    ? Object.entries(groupList).filter((group) =>
        group.name.toLowerCase().includes(searchGroup.toLowerCase())
      )
    : [];

  return (
    <div className="group-list-box">
      {isSmallScreen && <h2 className="mobil-menu-title">گروه‌ها</h2>}
      <SearchInput
        placeholder={"در گروه‌ها جستجو کنید"}
        value={searchGroup}
        onChange={setSearchGroup}
      />

      <button onClick={handleNewGroup} className="create-buttons">
        {isSmallScreen ? <TbMessagePlus /> : "ایجاد گروه جدید"}
      </button>

      <div className="list-flex">
        <motion.div
          className="user-list"
          variants={opacityEffect(0.8)} // انیمیشن Opacity را برای کانتینر اعمال کردیم
          initial="initial"
          animate="animate"
        >
          {filteredGroupList.length > 0 ? (
            filteredGroupList
              .map(([groupId, group]) => {
                const chatGroup = Group.find((groupChat) =>
                  groupChat.participants.includes(groupId)
                );

                let lastMessage = "";
                let lastMessageType = "";
                let lastMessageDateForSort = 0;
                if (chatGroup && chatGroup?.messages?.length > 0) {
                  const lastMessageIndex = chatGroup.messages.length - 1;
                  lastMessage = chatGroup.messages[lastMessageIndex].content;
                  lastMessageType = chatGroup.messages[lastMessageIndex].type;

                  lastMessageDateForSort = new Date(
                    Object.values(
                      chatGroup.messages[lastMessageIndex].status.sent
                    )[0]
                  ).getTime();
                }

                const currentGroupIdInPath =
                  location.pathname.includes(groupId);

                const unReadMessage =
                  !currentGroupIdInPath &&
                  chatGroup?.messages.filter((message) => {
                    return (
                      !Object.keys(message.status.sent).includes(userId) &&
                      !message.status.read?.[userId]
                    );
                  }).length;

                return {
                  groupId,
                  groupName: group.name,
                  groupPhotoUrl: group.photoUrl,
                  lastMessage,
                  lastMessageType,
                  lastMessageDateForSort,
                  unReadMessage,
                  chatGroup,
                };
              })
              .sort(
                (a, b) => b.lastMessageDateForSort - a.lastMessageDateForSort
              )
              .map(
                ({
                  groupId,
                  groupName,
                  groupPhotoUrl,
                  lastMessage,
                  lastMessageType,
                  lastMessageDateForSort,
                  unReadMessage,
                  chatGroup,
                }) => (
                  <motion.div
                    key={groupId}
                    variants={opacityEffect(0.8)}
                    style={{ marginBottom: "10px" }}
                  >
                    <GroupChatCard
                      key={groupId}
                      groupId={chatGroup?.id}
                      groupName={groupName}
                      groupPhotoUrl={groupPhotoUrl}
                      lastMessage={lastMessage}
                      lastMessageType={lastMessageType}
                      lastMessageDate={lastMessageDateHelper(
                        lastMessageDateForSort
                      )}
                      unReadMessage={unReadMessage}
                      groupListId={groupId}
                    />
                  </motion.div>
                )
              )
          ) : isChatsInitialized ? (
            <NoActiveData
              text={
                searchGroup
                  ? "گروه مطابقی پیدا نشد"
                  : "گروه فعالی وجود ندارد."
              }
            />
          ) : (
            <PreLoader />
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default GroupsList;
