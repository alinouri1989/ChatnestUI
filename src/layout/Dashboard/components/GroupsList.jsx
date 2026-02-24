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
  const { groupList, isGroupListInitialized } = useSelector((state) => state.groupList);

  const [searchGroup, setSearchGroup] = useState("");

  const { showModal, closeModal } = useModal();
  const isSmallScreen = useScreenWidth(900);
  const location = window.location;

  const handleNewGroup = () => {
    showModal(<NewGroupModal closeModal={closeModal} />);
  };

  const normalizedGroupList = groupList ?? {};
  const safeGroupChats = Array.isArray(Group) ? Group.filter(Boolean) : [];
  const groupChatsById = Object.fromEntries(
    safeGroupChats
      .filter((groupChat) => groupChat?.id)
      .map((groupChat) => [groupChat.id, groupChat])
  );

  const resolveChatGroupByGroupListKey = (groupListKey) => {
    if (groupChatsById[groupListKey]) {
      return groupChatsById[groupListKey];
    }

    return safeGroupChats.find(
      (groupChat) =>
        Array.isArray(groupChat?.participants) &&
        groupChat.participants.includes(groupListKey)
    );
  };

  const profileBackedGroupCards = Object.entries(normalizedGroupList).map(
    ([groupListKey, groupProfile]) => {
      const chatGroup = resolveChatGroupByGroupListKey(groupListKey);
      const resolvedGroupChatId = chatGroup?.id ?? groupProfile?.groupId ?? groupListKey;

      return {
        cardKey: resolvedGroupChatId,
        groupListKey,
        groupProfile,
        chatGroup,
        resolvedGroupChatId,
        hasGroupProfile: true,
      };
    }
  );

  const profileBackedChatIds = new Set(
    profileBackedGroupCards.map((item) => item.resolvedGroupChatId)
  );

  const fallbackGroupCards = safeGroupChats
    .filter((groupChat) => !profileBackedChatIds.has(groupChat.id))
    .map((groupChat) => ({
      cardKey: groupChat.id,
      groupListKey: null,
      groupProfile: {
        id: groupChat.id,
        name: "",
        photoUrl: null,
        participants: {},
      },
      chatGroup: groupChat,
      resolvedGroupChatId: groupChat.id,
      hasGroupProfile: false,
    }));

  const filteredGroupList = [...profileBackedGroupCards, ...fallbackGroupCards].filter(
    ({ groupProfile }) =>
      (groupProfile?.name ?? "").toLowerCase().includes(searchGroup.toLowerCase())
  );

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
              .map(
                ({
                  cardKey,
                  groupListKey,
                  groupProfile: group,
                  chatGroup,
                  resolvedGroupChatId,
                  hasGroupProfile,
                }) => {

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
                  location.pathname.includes(resolvedGroupChatId);

                const unReadMessage =
                  !currentGroupIdInPath &&
                  chatGroup?.messages.filter((message) => {
                    return (
                      !Object.keys(message.status.sent).includes(userId) &&
                      !message.status.read?.[userId]
                    );
                  }).length;

                return {
                  cardKey,
                  groupListKey,
                  groupName: group?.name ?? "گروه بدون نام",
                  groupPhotoUrl: group?.photoUrl,
                  resolvedGroupChatId,
                  lastMessage,
                  lastMessageType,
                  lastMessageDateForSort,
                  unReadMessage,
                  canLeaveGroup: hasGroupProfile,
                };
              }
              )
              .sort(
                (a, b) => b.lastMessageDateForSort - a.lastMessageDateForSort
              )
              .map(
                ({
                  cardKey,
                  groupListKey,
                  groupName,
                  groupPhotoUrl,
                  resolvedGroupChatId,
                  lastMessage,
                  lastMessageType,
                  lastMessageDateForSort,
                  unReadMessage,
                  canLeaveGroup,
                }) => (
                  <motion.div
                    key={cardKey}
                    variants={opacityEffect(0.8)}
                    style={{ marginBottom: "10px" }}
                  >
                    <GroupChatCard
                      key={cardKey}
                      groupId={resolvedGroupChatId}
                      groupName={groupName}
                      groupPhotoUrl={groupPhotoUrl}
                      lastMessage={lastMessage}
                      lastMessageType={lastMessageType}
                      lastMessageDate={lastMessageDateHelper(
                        lastMessageDateForSort
                      )}
                      unReadMessage={unReadMessage}
                      groupListId={groupListKey ?? resolvedGroupChatId}
                      canLeaveGroup={canLeaveGroup}
                    />
                  </motion.div>
                )
              )
          ) : isGroupListInitialized || isChatsInitialized ? (
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
