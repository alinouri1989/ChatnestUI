import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useModal } from '../../../contexts/ModalContext';
import { useSignalR } from '../../../contexts/SignalRContext';
import useScreenWidth from '../../../hooks/useScreenWidth';

import { PiPhoneFill } from "react-icons/pi";
import { HiMiniVideoCamera } from "react-icons/hi2";
import { IoIosArrowDropleftCircle } from "react-icons/io";

import CallModal from '../../Calls/Components/CallModal';
import { formatDateForLastConnectionDate } from '../../../helpers/dateHelper';
import { isUserOnline } from '../../../helpers/presenceHelper';
import BackToMenuButton from '../../../shared/components/BackToMenuButton/BackToMenuButton';
import { startCall } from '../../../helpers/startCall';
import { getUserIdFromToken } from '../../../helpers/getUserIdFromToken';
import { defaultProfilePhoto } from '../../../constants/DefaultProfilePhoto';
import { getChatDisplayLabel } from '../../../helpers/chatLabelHelper';

function UserTopBar({ isSidebarOpen, toggleSidebar, recipientProfile, recipientId }) {
    const dispatch = useDispatch();
    const location = useLocation();
    const { callConnection } = useSignalR();
    const { isRingingIncoming } = useSelector((state) => state.call);
    const { token } = useSelector((state) => state.auth);
    const { showModal, closeModal } = useModal();
    const isSmallScreen = useScreenWidth(900);
    const currentUserId = getUserIdFromToken(token);

    // Early return after all hooks are called
    if (!recipientProfile) {
        return null;
    }

    const status = isUserOnline(recipientProfile.lastConnectionDate) ? 'online' : 'offline';
    const lastConnectionDate = recipientProfile.lastConnectionDate;
    const displayLabel = getChatDisplayLabel(
        recipientProfile.displayName,
        recipientId,
        currentUserId
    );

    const handleVoiceCall = () => {
        startCall(callConnection, recipientId, false, dispatch, () =>
            showModal(<CallModal closeModal={closeModal} isCameraCall={false} />)
        );
    };

    const handleVideoCall = () => {
        startCall(callConnection, recipientId, true, dispatch, () =>
            showModal(<CallModal closeModal={closeModal} isCameraCall={true} />)
        );
    };

    return (
        <div className={`user-top-bar ${isSidebarOpen ? 'close' : ''}`}>
            <div className="user-info">
                {isSmallScreen && (
                    <BackToMenuButton
                        path={location.pathname.includes("archives") ? "archives" : "chats"}
                    />
                )}
                <div onClick={toggleSidebar} className="image-box">
                    <img 
                        src={recipientProfile.profilePhoto ?? defaultProfilePhoto}
                        onError={(e) => e.currentTarget.src = defaultProfilePhoto}
                        alt="Profile"
                    />
                    <p className={`status ${status}`}></p>
                </div>
                <div onClick={toggleSidebar} className="name-and-status-box">
                    <p className="user-name">{displayLabel}</p>

                    {status === "online" ?
                        <span>{"\u0622\u0646\u0644\u0627\u06cc\u0646"}</span>
                        :
                        <span>{formatDateForLastConnectionDate(lastConnectionDate)}</span>
                    }
                </div>
            </div>

            <div className="top-bar-buttons">
                <div className='call-options'>
                    <button
                        disabled={isRingingIncoming}
                        style={{ opacity: isRingingIncoming ? "0.6" : "1" }}
                        onClick={() => handleVoiceCall()}><PiPhoneFill />
                    </button>

                    <button
                        disabled={isRingingIncoming}
                        style={{ opacity: isRingingIncoming ? "0.6" : "1" }}
                        onClick={() => handleVideoCall()}><HiMiniVideoCamera />
                    </button>
                </div>
                {!isSmallScreen &&
                    <IoIosArrowDropleftCircle
                        className="sidebar-toggle-buttons"
                        onClick={toggleSidebar}
                    />
                }
            </div>
        </div>
    )
}

// PropTypes validation
UserTopBar.propTypes = {
    isSidebarOpen: PropTypes.bool.isRequired,
    toggleSidebar: PropTypes.func.isRequired,
    recipientProfile: PropTypes.shape({
        lastConnectionDate: PropTypes.string,
        profilePhoto: PropTypes.string,
        displayName: PropTypes.string,
    }),
    recipientId: PropTypes.string.isRequired,
};

export default UserTopBar
