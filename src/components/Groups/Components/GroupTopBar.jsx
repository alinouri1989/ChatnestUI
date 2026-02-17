import PropTypes from 'prop-types';
import { IoIosArrowDropleftCircle } from "react-icons/io";
import useScreenWidth from '../../../hooks/useScreenWidth';
import BackToMenuButton from '../../../shared/components/BackToMenuButton/BackToMenuButton';

function GroupTopBar({ isSidebarOpen, toggleSidebar, groupProfile }) {

    const participantCount = groupProfile?.participants
        ? Object.values(groupProfile.participants).filter(member => member.role !== 2).length
        : 0;

    const isSmallScreen = useScreenWidth(900);

    return (
        <div onClick={toggleSidebar} className={`group-top-bar ${isSidebarOpen ? 'close' : ''}`}>
            <div className="group-info">
                {isSmallScreen &&
                    <BackToMenuButton path={"gruplar"} />
                }
                <div className="image-box">
                    <img src={groupProfile?.photoUrl} alt="Group" />
                </div>
                <div className="name-and-status-box">
                    <p className="group-name">{groupProfile?.name}</p>
                    <span>{participantCount} کاربر وجود دارد</span>
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
    groupProfile: PropTypes.shape({
        photoUrl: PropTypes.string,
        name: PropTypes.string,
        participants: PropTypes.object,
    }),
};

export default GroupTopBar;