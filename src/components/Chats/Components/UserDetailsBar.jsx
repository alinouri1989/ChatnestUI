import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { useModal } from "../../../contexts/ModalContext";
import { useSignalR } from "../../../contexts/SignalRContext";
import useScreenWidth from "../../../hooks/useScreenWidth";

import { PiPhoneFill } from "react-icons/pi";
import { HiMiniVideoCamera } from "react-icons/hi2";
import { IoIosArrowDroprightCircle } from "react-icons/io";
import { IoMdArrowRoundBack } from "react-icons/io";

import CallModal from "../../Calls/Components/CallModal";
import { formatDateForLastConnectionDate } from "../../../helpers/dateHelper";
import { isUserOnline } from "../../../helpers/presenceHelper";
import { startCall } from "../../../helpers/startCall";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";

function UserDetailsBar({
  isSidebarOpen,
  toggleSidebar,
  recipientProfile,
  recipientId,
}) {
  const dispatch = useDispatch();
  const { callConnection } = useSignalR();
  const { isRingingIncoming } = useSelector((state) => state.call);
  const { showModal, closeModal } = useModal();
  const isSmallScreen = useScreenWidth(900);

  if (!recipientProfile) {
    return null;
  }

  const status = isUserOnline(recipientProfile.lastConnectionDate)
    ? "online"
    : "offline";
  const lastConnectionDate = recipientProfile.lastConnectionDate;

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
    <div className={`user-details-sidebar ${isSidebarOpen ? "open" : ""}`}>
      {isSidebarOpen && (
        <>
          {!isSmallScreen ? (
            <IoIosArrowDroprightCircle
              className="sidebar-toggle-buttons"
              onClick={toggleSidebar}
            />
          ) : (
            <button className="back-to-menu-btn" onClick={toggleSidebar}>
              <IoMdArrowRoundBack />
            </button>
          )}
          <div className="sidebar-content-box">
            <div className="user-info-box">
              <img
                src={recipientProfile.profilePhoto ?? defaultProfilePhoto}
                onError={(e) => (e.currentTarget.src = defaultProfilePhoto)}
              />
              <p>{recipientProfile.displayName}</p>
              <span>{recipientProfile.email}</span>
            </div>
            {status == "online" ? (
              <div className="status">
                <p className="circle"></p>
                <p>{"\u0622\u0646\u0644\u0627\u06cc\u0646"}</p>
              </div>
            ) : (
              <div className="status-2">
                <p>{"\u0622\u062e\u0631\u06cc\u0646 \u0628\u0627\u0632\u062f\u06cc\u062f"}</p>
                <span>
                  {formatDateForLastConnectionDate(lastConnectionDate)}
                </span>
              </div>
            )}

            <div className="biography">
              <strong>Ø¨ÛŒÙˆÚ¯Ø±Ø§ÙÛŒ</strong>
              <div className="line"></div>
              <p>{recipientProfile.biography}</p>
            </div>
            <div className="call-buttons">
              <div className="button-box">
                <button
                  disabled={isRingingIncoming}
                  style={{ opacity: isRingingIncoming ? "0.6" : "1" }}
                  onClick={handleVoiceCall}
                >
                  <PiPhoneFill />{" "}
                </button>
                <p>ØªÙ…Ø§Ø³ ØµÙˆØªÛŒ</p>
              </div>
              <div className="button-box">
                <button
                  disabled={isRingingIncoming}
                  style={{ opacity: isRingingIncoming ? "0.6" : "1" }}
                  onClick={handleVideoCall}
                >
                  <HiMiniVideoCamera />
                </button>
                <p>ØªÙ…Ø§Ø³ ØªØµÙˆÛŒØ±ÛŒ</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// PropTypes validation
UserDetailsBar.propTypes = {
  isSidebarOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  recipientProfile: PropTypes.shape({
    lastConnectionDate: PropTypes.string,
    profilePhoto: PropTypes.string,
    displayName: PropTypes.string,
    email: PropTypes.string,
    biography: PropTypes.string,
  }),
  recipientId: PropTypes.string.isRequired,
};
export default UserDetailsBar;
