import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import useScreenWidth from "../../../hooks/useScreenWidth";
import { jwtDecode } from "jwt-decode";
import { useModal } from "../../../contexts/ModalContext";

import { IoMdSettings } from "react-icons/io";
import { IoMdArrowRoundBack } from "react-icons/io";
import { IoIosArrowDroprightCircle } from "react-icons/io";

import NewAndSettingsGroupModal from "./NewAndSettingsGroup/NewAndSettingsGroupModal";
import { formatDateToTR } from "../../../helpers/dateHelper";
import { isUserOnline } from "../../../helpers/presenceHelper";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";
import { ErrorAlert } from "../../../helpers/customAlert";

function GroupDetailsBar({ isSidebarOpen, toggleSidebar, groupProfile, groupId }) {
  const { showModal, closeModal } = useModal();
  const isSmallScreen = useScreenWidth(900);

  const { token } = useSelector((state) => state.auth);
  const { Group } = useSelector((state) => state.chat);
  const decodedToken = token ? jwtDecode(token) : null;
  const userId = decodedToken?.sub;
  const [copiedIdentifier, setCopiedIdentifier] = useState(null);

  const selectedGroup = Group.find((group) => group.id === groupId);
  const editGroupId =
    selectedGroup?.participants && selectedGroup.participants.length > 0
      ? selectedGroup.participants[0]
      : null;

  const isAdmin =
    userId &&
    groupProfile?.participants?.[userId] &&
    groupProfile.participants[userId].role === 0;

  useEffect(() => {
    if (!copiedIdentifier) return;
    const timeoutId = setTimeout(() => setCopiedIdentifier(null), 1400);
    return () => clearTimeout(timeoutId);
  }, [copiedIdentifier]);

  const handleGroupSettings = () => {
    showModal(
      <NewAndSettingsGroupModal
        closeModal={closeModal}
        isGroupSettings={true}
        groupProfile={groupProfile}
        groupId={editGroupId}
        userId={userId}
      />
    );
  };

  const handleCopyIdentifier = async (event, identifier) => {
    event.stopPropagation();
    if (!identifier) return;

    try {
      await navigator.clipboard.writeText(identifier);
      setCopiedIdentifier(identifier);
    } catch {
      ErrorAlert("کپی شناسه کاربر انجام نشد");
    }
  };

  return (
    <div className={`group-details-sidebar ${isSidebarOpen ? "open" : ""}`}>
      {isSidebarOpen && (
        <>
          <div className="option-buttons">
            {isSmallScreen ? (
              <button className="back-to-menu-btn" onClick={toggleSidebar}>
                <IoMdArrowRoundBack />
              </button>
            ) : (
              <IoIosArrowDroprightCircle
                className="sidebar-toggle-buttons"
                onClick={toggleSidebar}
              />
            )}

            {isAdmin && (
              <button onClick={handleGroupSettings} className="group-setting-btn">
                <IoMdSettings />
              </button>
            )}
          </div>

          <div className="sidebar-content-box">
            {groupProfile ? (
              <>
                <div className="group-info-box">
                  <img src={groupProfile.photoUrl} alt={`${groupProfile.name} profile`} />
                  <p>{groupProfile.name}</p>
                </div>

                <div className="date-box">
                  <p>{formatDateToTR(groupProfile.createdDate)} ایجاد شد</p>
                </div>

                <div className="description">
                  <strong>توضیحات گروه</strong>
                  <div className="line"></div>
                  <p>{groupProfile.description || "توضیحی وجود ندارد."}</p>
                </div>

                <div className="group-members-box">
                  <h2>
                    اعضای گروه -{" "}
                    {
                      Object.values(groupProfile.participants).filter(
                        (member) => member.role !== 2
                      ).length
                    }
                  </h2>

                  <div className="members-list">
                    {Object.entries(groupProfile.participants)
                      .sort(([, memberA], [, memberB]) => memberA.role - memberB.role)
                      .map(([id, member]) => {
                        if (member.role === 2) return null;

                        const isOnline = isUserOnline(member.lastConnectionDate);

                        return (
                          <div key={id} className="member-box">
                            <div className="image-box">
                              <img
                                src={member.profilePhoto ?? defaultProfilePhoto}
                                onError={(e) => (e.currentTarget.src = defaultProfilePhoto)}
                                alt={member.displayName}
                              />
                              <p
                                className={`user-status ${
                                  isOnline ? "online" : "offline"
                                }`}
                              ></p>
                            </div>

                            <div className="user-info">
                              <p className="user-display-name">{member.displayName}</p>
                              <div className="member-meta-row">
                                <span className={member.role === 0 ? "admin" : ""}>
                                  {member.role === 0 ? "مدیر" : "عضو"}
                                </span>
                                {member.userIdentifier && (
                                  <div className="identifier-chip-wrapper">
                                    <button
                                      type="button"
                                      className="identifier-chip"
                                      onClick={(event) =>
                                        handleCopyIdentifier(event, member.userIdentifier)
                                      }
                                      title={`کپی @${member.userIdentifier}`}
                                      aria-label={`کپی شناسه ${member.userIdentifier}`}
                                    >
                                      @{member.userIdentifier}
                                    </button>
                                    {copiedIdentifier === member.userIdentifier && (
                                      <span className="copied-inline-tooltip">Copied</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            ) : (
              <p>اطلاعات گروه در حال بارگذاری است...</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

GroupDetailsBar.propTypes = {
  isSidebarOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  groupProfile: PropTypes.shape({
    photoUrl: PropTypes.string,
    name: PropTypes.string,
    createdDate: PropTypes.string,
    description: PropTypes.string,
    participants: PropTypes.object,
  }),
  groupId: PropTypes.string.isRequired,
};

export default GroupDetailsBar;
