// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { MdForwardToInbox } from "react-icons/md";

import { useSignalR } from "../../../contexts/SignalRContext";
import CloseModalButton from "../../../contexts/components/CloseModalButton";
import { defaultGroupPhoto, defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import { forwardAttachment, forwardAttachmentToUser } from "../../../services/messageActions";

import "./style.scss";

function ForwardMessageModal({ sourceMessageId, currentChatId, closeModal }) {
  const { notificationConnection } = useSignalR();
  const { Individual, Group } = useSelector((state) => state.chat);
  const { chatList } = useSelector((state) => state.chatList);
  const { groupList } = useSelector((state) => state.groupList);
  const { token, user } = useSelector((state) => state.auth);
  const currentUserId = getUserIdFromToken(token);

  const [query, setQuery] = useState("");
  const [forwardingTo, setForwardingTo] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const normalizedQuery = query.trim().replace(/^@+/, "").toLowerCase();

  const targets = useMemo(() => {
    const individualTargets = Individual
      .filter((chat) => String(chat.id) !== String(currentChatId))
      .map((chat) => {
        const recipientId =
          chat.participants?.find((participantId) => participantId !== currentUserId) ??
          currentUserId;
        const recipient =
          chatList?.[recipientId] ??
          (recipientId === currentUserId
            ? {
                displayName: user?.displayName || "خودم",
                profilePhoto: user?.profilePhoto || defaultProfilePhoto,
                userIdentifier: user?.userIdentifier || "",
              }
            : null);

        if (!recipient) return null;

        return {
          chatId: chat.id,
          chatType: "Individual",
          recipientId,
          title: recipient.displayName || "گفتگوی شخصی",
          subtitle: recipient.userIdentifier ? `@${recipient.userIdentifier}` : "گفتگوی شخصی",
          avatar: recipient.profilePhoto || defaultProfilePhoto,
        };
      })
      .filter(Boolean);

    const groupTargets = Group
      .filter((chat) => String(chat.id) !== String(currentChatId))
      .map((chat) => {
        const group = groupList?.[chat.id];
        if (!group) return null;

        const isReadOnlyChannel =
          Number(group.kind ?? 0) === 1 &&
          Number(group.participants?.[currentUserId]?.role) !== 0;

        if (isReadOnlyChannel) return null;

        return {
          chatId: chat.id,
          chatType: "Group",
          title: group.name || "گروه",
          subtitle: Number(group.kind ?? 0) === 1 ? "کانال" : "گروه",
          avatar: group.photoUrl || defaultGroupPhoto,
        };
      })
      .filter(Boolean);

    return [...individualTargets, ...groupTargets];
  }, [Group, Individual, chatList, currentChatId, currentUserId, groupList, user]);

  const filteredTargets = useMemo(() => {
    if (!normalizedQuery) return targets;

    return targets.filter((target) =>
      `${target.title} ${target.subtitle}`.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, targets]);

  const existingRecipientIds = useMemo(
    () =>
      new Set(
        targets
          .filter((target) => target.chatType === "Individual" && target.recipientId)
          .map((target) => String(target.recipientId))
      ),
    [targets]
  );

  const filteredSearchResults = useMemo(
    () =>
      searchResults.filter(
        (result) =>
          String(result.userId) !== String(currentUserId) &&
          !existingRecipientIds.has(String(result.userId))
      ),
    [currentUserId, existingRecipientIds, searchResults]
  );

  useEffect(() => {
    if (!notificationConnection || normalizedQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    setIsSearching(true);

    const handleReceiveSearchUsers = (response) => {
      if (!isActive || response?.query !== normalizedQuery) return;

      const formattedUsers = Object.entries(response.data || {}).map(([id, searchedUser]) => ({
        userId: id,
        ...searchedUser,
      }));

      setSearchResults(formattedUsers);
      setIsSearching(false);
    };

    notificationConnection.on("ReceiveSearchUsers", handleReceiveSearchUsers);
    notificationConnection
      .invoke("SearchUsers", normalizedQuery)
      .catch(() => {
        if (isActive) {
          setSearchResults([]);
          setIsSearching(false);
        }
      });

    return () => {
      isActive = false;
      notificationConnection.off("ReceiveSearchUsers", handleReceiveSearchUsers);
    };
  }, [normalizedQuery, notificationConnection]);

  const handleForward = async (target) => {
    try {
      setForwardingTo(target.chatId);
      const isConnectionReady = true;
      if (!isConnectionReady) {
        ErrorAlert("اتصال به چت در دسترس نیست. دوباره تلاش کنید.");
        return;
      }

      await forwardAttachment({
        sourceMessageId,
        targetChatId: target.chatId,
        targetChatType: target.chatType,
      });

      SuccessAlert("فایل ارسال شد");
      closeModal();
    } catch (error) {
      console.error("Forward attachment failed:", error);
      ErrorAlert("ارسال فایل انجام نشد");
    } finally {
      setForwardingTo(null);
    }
  };

  const handleForwardToUser = async (searchedUser) => {
    try {
      setForwardingTo(`user-${searchedUser.userId}`);
      const isConnectionReady = true;
      if (!isConnectionReady) {
        ErrorAlert("اتصال به چت در دسترس نیست. دوباره تلاش کنید.");
        return;
      }

      await forwardAttachmentToUser({
        sourceMessageId,
        recipientId: searchedUser.userId,
      });

      SuccessAlert("فایل ارسال شد");
      closeModal();
    } catch (error) {
      console.error("Forward attachment to user failed:", error);
      ErrorAlert("ارسال فایل انجام نشد");
    } finally {
      setForwardingTo(null);
    }
  };

  return (
    <div className="forward-message-modal">
      <CloseModalButton closeModal={closeModal} />

      <div className="forward-title-box">
        <MdForwardToInbox />
        <div>
          <p>ارسال فایل</p>
          <span>یک گفتگو را برای ارسال نسخه قابل استفاده فایل انتخاب کنید.</span>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="جستجو در گفتگوها..."
      />

      <div className="forward-target-list">
        {filteredTargets.length === 0 && normalizedQuery.length < 2 ? (
          <p className="empty-state">گفتگوی مناسبی برای ارسال پیدا نشد.</p>
        ) : (
          <>
            {filteredTargets.map((target) => (
              <button
                key={`${target.chatType}-${target.chatId}`}
                type="button"
                className="forward-target"
                onClick={() => handleForward(target)}
                disabled={Boolean(forwardingTo)}
              >
                <img
                  src={target.avatar}
                  onError={(event) => {
                    event.currentTarget.src =
                      target.chatType === "Group" ? defaultGroupPhoto : defaultProfilePhoto;
                  }}
                  alt=""
                />
                <span>
                  <strong>{target.title}</strong>
                  <small>{target.subtitle}</small>
                </span>
                {forwardingTo === target.chatId && <em>در حال ارسال...</em>}
              </button>
            ))}

            {normalizedQuery.length >= 2 && (
              <>
                <div className="forward-section-label">
                  {isSearching ? "در حال جستجو..." : "نتایج جستجو"}
                </div>

                {!isSearching && filteredSearchResults.length === 0 && (
                  <p className="empty-state small">کاربر جدیدی پیدا نشد.</p>
                )}

                {filteredSearchResults.map((searchedUser) => (
                  <button
                    key={`user-${searchedUser.userId}`}
                    type="button"
                    className="forward-target"
                    onClick={() => handleForwardToUser(searchedUser)}
                    disabled={Boolean(forwardingTo)}
                  >
                    <img
                      src={searchedUser.profilePhoto || defaultProfilePhoto}
                      onError={(event) => {
                        event.currentTarget.src = defaultProfilePhoto;
                      }}
                      alt=""
                    />
                    <span>
                      <strong>{searchedUser.displayName || "کاربر"}</strong>
                      <small>
                        {searchedUser.userIdentifier
                          ? `@${searchedUser.userIdentifier}`
                          : searchedUser.email || "کاربر جدید"}
                      </small>
                    </span>
                    {forwardingTo === `user-${searchedUser.userId}` && <em>در حال ارسال...</em>}
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

ForwardMessageModal.propTypes = {
  sourceMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  currentChatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  closeModal: PropTypes.func.isRequired,
};

export default ForwardMessageModal;
