import { useModal } from '../../../../contexts/ModalContext';
import { useSignalR } from '../../../../contexts/SignalRContext';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { ErrorAlert } from "../../../../helpers/customAlert.js";

import { PiPhoneFill } from "react-icons/pi";
import { PiPhoneSlashFill } from "react-icons/pi";
import { HiMiniVideoCamera } from "react-icons/hi2";
import IncomingCallSound from "../../../../assets/sound/ChatNestCallSound.mp3";
import CallModal from '../CallModal';
import { setIsRingingIncoming } from '../../../../store/Slices/calls/callSlice';
import "./style.scss";
import { defaultProfilePhoto } from '../../../../constants/DefaultProfilePhoto.js';
import PreLoader from '../../../../shared/components/PreLoader/PreLoader.jsx';

function IncomingCall({ callType, callerProfile, callId }) {

    const dispatch = useDispatch();
    const { callConnection, handleAcceptCall, localStream } = useSignalR();
    const { isCallStarted, isCallAcceptWaiting } = useSelector(state => state.call);

    const { showModal, closeModal } = useModal();
    const localVideoRef = useRef(null);

    useEffect(() => {
        const audio = new Audio(IncomingCallSound);
        audio.loop = true;
        audio.play();

        return () => {
            audio.pause();
            audio.currentTime = 0;
        };
    }, []);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const handleDeclineCall = async () => {
        try {
            await callConnection.invoke("EndCall", callId, 2, null);
            dispatch(setIsRingingIncoming(false));
        } catch {
            ErrorAlert("Bir hata meydana geldi");
        }
    };

    useEffect(() => {
        if (isCallStarted) {
            dispatch(setIsRingingIncoming(false));
            showModal(<CallModal
                callId={callId}
                closeModal={closeModal}
                isCameraCall={callType === 1 ? true : false}
            />);
        }
    }, [isCallStarted, dispatch, showModal, closeModal, callId, callType]);

    return (
        <div className='incoming-call-box'>
            <div className='user-and-options'>
                <img src={callerProfile.profilePhoto}
                    onError={(e) => e.currentTarget.src = defaultProfilePhoto}
                    alt="Profile Image"
                />
                <div className='user-info-and-call-status'>
                    <p>{callerProfile.displayName}</p>
                    <span>در حال تماس با شما...</span>
                </div>
                <div className='call-option-buttons'>
                    <button onClick={() => handleAcceptCall()}>
                        {callType === 0 ? <PiPhoneFill /> : <HiMiniVideoCamera />}
                    </button>
                    <button onClick={handleDeclineCall}>
                        <PiPhoneSlashFill />
                    </button>
                </div>
            </div>

            {callType === 1 && (
                <video className='local-video' playsInline ref={localVideoRef} autoPlay muted></video>
            )}
            {isCallAcceptWaiting && <PreLoader />}
        </div>
    );
}

// PropTypes validation
IncomingCall.propTypes = {
    callType: PropTypes.number.isRequired,
    callerProfile: PropTypes.shape({
        profilePhoto: PropTypes.string,
        displayName: PropTypes.string,
    }).isRequired,
    callId: PropTypes.string.isRequired,
};

export default IncomingCall;