// @ts-nocheck
import PropTypes from 'prop-types';
import { IoIosArrowDropleftCircle } from "react-icons/io";
import useScreenWidth from '../../../hooks/useScreenWidth';
import BackToMenuButton from '../../../shared/components/BackToMenuButton/BackToMenuButton';
import { defaultGroupPhoto } from "../../../constants/DefaultProfilePhoto";
import { resolveGroupPhoto } from "../../../helpers/groupPhotoResolver";
import { useSignalR } from "../../../contexts/SignalRContext";

function GroupTopBar({ isSidebarOpen, toggleSidebar, groupId, groupProfile }) {
    const { typingUsersByChat } = useSignalR();

    const participantCount = groupProfile?.participants
        ? Object.values(groupProfile.participants).filter(member => member.role !== 2).length
        : 0;
    const typingUserIds = typingUsersByChat?.[groupId] ?? [];
    const typingNames = typingUserIds
        .map((userId) => groupProfile?.participants?.[userId]?.displayName)
        .filter(Boolean);
    const typingSubtitle =
        typingNames.length === 1
            ? `${typingNames[0]} در حال نوشتن...`
            : typingNames.length > 1
                ? `${typingNames.length} people are typing...`
                : typingUserIds.length > 0
                    ? "در حال نوشتن..."
                    : null;

    const isSmallScreen = useScreenWidth(900);
    const resolvedGroupPhoto = resolveGroupPhoto({
        photoUrl: groupProfile?.photoUrl,
        groupId: groupProfile?.groupId ?? groupProfile?.id,
        groupName: groupProfile?.name,
    });

    return (
        <div onClick={toggleSidebar} className={`group-top-bar ${isSidebarOpen ? 'close' : ''}`}>
            <div className="group-info">
                {isSmallScreen &&
                    <BackToMenuButton path={"groups"} />
                }
                <div className="image-box">
                    <img
                        src={resolvedGroupPhoto}
                        alt="Group"
                        onError={(e) => {
                            e.currentTarget.src = defaultGroupPhoto;
                        }}
                    />
                </div>
                <div className="name-and-status-box">
                    <p className="group-name">{groupProfile?.name}</p>
                    <span>
                        {typingSubtitle ??
                            `${participantCount} \u06a9\u0627\u0631\u0628\u0631 \u0648\u062c\u0648\u062f \u062f\u0627\u0631\u062f`}
                    </span>
                </div>
            </div>

            {!isSmallScreen && (
                <div className="top-bar-buttons">
                    <IoIosArrowDropleftCircle
                        className="sidebar-toggle-buttons"
                        onClick={(event) => {
                            event.stopPropagation();
                            toggleSidebar();
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// PropTypes validation
GroupTopBar.propTypes = {
    isSidebarOpen: PropTypes.bool.isRequired,
    toggleSidebar: PropTypes.func.isRequired,
    groupId: PropTypes.string.isRequired,
    groupProfile: PropTypes.shape({
        id: PropTypes.string,
        groupId: PropTypes.string,
        photoUrl: PropTypes.string,
        name: PropTypes.string,
        participants: PropTypes.object,
    }),
};

export default GroupTopBar;
