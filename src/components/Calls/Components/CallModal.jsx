
import PropTypes from "prop-types";
import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useSignalR } from "../../../contexts/SignalRContext";

import ChatNestLogo from "../../../assets/logos/ChatNestLogoWithText.svg";
import CallSound from "../../../assets/sound/ChatNestCallSound.mp3";
import BusySound from "../../../assets/sound/ChatNestCallBusySound.mp3";

import { MdScreenShare } from "react-icons/md";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

import { HiMiniSpeakerWave } from "react-icons/hi2";
import { HiMiniSpeakerXMark } from "react-icons/hi2";
import { TbMicrophoneFilled } from "react-icons/tb";
import { TbMicrophoneOff } from "react-icons/tb";
import { PiPhoneSlashFill } from "react-icons/pi";

import { formatTime } from "../../../helpers/formatCallTime";
import "./CallModal.scss";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";
import { ErrorAlert } from "../../../helpers/customAlert";

function CallModal({ closeModal, isCameraCall }) {
  const {
    callConnection,
    localStream,
    remoteStream,
    switchCameraFacingMode,
    videoFacingMode,
  } = useSignalR();

  const {
    callerProfile,
    callId,
    isCallStarted,
    isRingingOutgoing,
    callStartedDate,
    isCallStarting,
  } = useSelector((state) => state.call);

  const [isMicrophoneOn, setMicrophoneMode] = useState(true);
  const [isSpeakerOn, setSpeakerMode] = useState(true);
  const [callStatus, setCallStatus] = useState("در حال تماس...");

  const callAudioRef = useRef(null);
  const busyAudioRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [temporaryStream, setTemporaryStream] = useState(null);

  // Acquire a temporary local video stream while the call is starting
  useEffect(() => {
    let isCancelled = false;
    let previewStream = null;

    const getTemporaryStream = async () => {
      try {
        if (!isCameraCall || localStream) {
          setTemporaryStream((prev) => {
            if (prev) {
              prev.getTracks().forEach((track) => track.stop());
            }
            return null;
          });
          return;
        }

        previewStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: videoFacingMode },
          },
          audio: false,
        });

        if (isCancelled) {
          previewStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setTemporaryStream((prev) => {
          if (prev) {
            prev.getTracks().forEach((track) => track.stop());
          }
          return previewStream;
        });
      } catch (err) {
        console.error("Failed to acquire temporary camera stream:", err);
      }
    };

    getTemporaryStream();

    return () => {
      isCancelled = true;
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraCall, localStream, videoFacingMode]);

  // Attach/detach streams to video elements (use stable local variables for cleanup)
  useEffect(() => {
    const localEl = localVideoRef.current;
    const remoteEl = remoteVideoRef.current;

    if (localEl) {
      localEl.srcObject = localStream || temporaryStream;
    }
    if (remoteEl) {
      remoteEl.srcObject = remoteStream;
    }

    return () => {
      if (localEl) localEl.srcObject = null;
      if (remoteEl) remoteEl.srcObject = null;
    };
  }, [localStream, temporaryStream, remoteStream]);

  // Sync microphone enabled state with the local stream
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMicrophoneOn;
      });
    }
  }, [localStream, isMicrophoneOn]);

  // Register SignalR ValidationError once, with cleanup
  useEffect(() => {
    if (!callConnection) return;

    const onValidationError = (data) => {
      ErrorAlert(data.message);
    };

    callConnection.on("ValidationError", onValidationError);
    return () => {
      callConnection.off("ValidationError", onValidationError);
    };
  }, [callConnection]);

  // Handle ringing audio, busy tone, and timeout while the call is starting
  useEffect(() => {
    if (!isCallStarting) return;

    const callAudio = new Audio(CallSound);
    callAudio.loop = true;
    callAudio.play();
    callAudioRef.current = callAudio;

    const timeout = setTimeout(() => {
      if (!isCallStarted) {
        setCallStatus("مشغول");

        if (callAudioRef.current) {
          callAudioRef.current.pause();
          callAudioRef.current.currentTime = 0;
        }

        const busyAudio = new Audio(BusySound);
        busyAudio.play();
        busyAudioRef.current = busyAudio;

        setTimeout(() => {
          if (busyAudioRef.current) {
            busyAudioRef.current.pause();
            busyAudioRef.current.currentTime = 0;
          }
          callConnection?.invoke("EndCall", callId, 4, callStartedDate);
          closeModal();
        }, 4000);
      }
    }, 25000);

    return () => {
      clearTimeout(timeout);

      if (callAudioRef.current) {
        callAudioRef.current.pause();
        callAudioRef.current.currentTime = 0;
      }

      if (busyAudioRef.current) {
        busyAudioRef.current.pause();
        busyAudioRef.current.currentTime = 0;
      }
    };
  }, [isCallStarting, isCallStarted, callId, callConnection, callStartedDate, closeModal]);

  // If the call ended and it's not ringing, close the modal
  useEffect(() => {
    if (!isCallStarted && !isRingingOutgoing) {
      closeModal();
    }
  }, [isCallStarted, isRingingOutgoing, closeModal]);

  // Update call timer while connected, otherwise restore "در حال تماس..." and close when appropriate
  useEffect(() => {
    let timerInterval;
    if (isCallStarted) {
      if (callAudioRef.current) {
        callAudioRef.current.pause();
        callAudioRef.current.currentTime = 0;
      }

      setCallStatus("متصل شد");
      let elapsedTime = 0;
      timerInterval = setInterval(() => {
        elapsedTime += 1;
        setCallStatus(formatTime(elapsedTime));
      }, 1000);
    } else {
      if (timerInterval) clearInterval(timerInterval);
      setCallStatus("در حال تماس...");
      if (isCallStarted === false && isCallStarting === false) {
        closeModal();
      }
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isCallStarted, isCallStarting, closeModal]);

  const handleMicrophoneMode = () => {
    setMicrophoneMode((prev) => {
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = !prev;
        });
      }
      return !prev;
    });
  };

  const handleSpeakerMode = () => {
    if (remoteVideoRef.current) {
      // Mute video element based on current state, then toggle state
      remoteVideoRef.current.muted = isSpeakerOn;
    }
    setSpeakerMode(!isSpeakerOn);

    if (isSpeakerOn) {
      if (callAudioRef.current) {
        callAudioRef.current.volume = 0;
      }
      if (busyAudioRef.current) {
        busyAudioRef.current.volume = 0;
      }
    } else {
      if (callAudioRef.current) {
        callAudioRef.current.volume = 1;
      }
      if (busyAudioRef.current) {
        busyAudioRef.current.volume = 1;
      }
    }
  };

  const handleCloseCall = () => {
    if (isCallStarted) {
      callConnection.invoke("EndCall", callId, 1, callStartedDate);
    }
    if (isCallStarting) {
      if (callStatus === "مشغول") {
        callConnection.invoke("EndCall", callId, 4, callStartedDate);
      } else {
        callConnection.invoke("EndCall", callId, 3, callStartedDate);
      }
    }
    closeModal();
  };

  const handleSwitchCamera = async () => {
    if (!isCameraCall) return;
    await switchCameraFacingMode();
  };

  return (
    <div className={`call-modal ${isCallStarted ? "video-call-Mode" : ""}`}>
      <div className="logo-and-e2e-box">
        <img src={ChatNestLogo} alt="ChatNest Logo" />
        <div className="e2e-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5zm0 6c1.4 0 2.8 1.1 2.8 2.5V11c.6 0 1.2.6 1.2 1.3v3.5c0 .6-.6 1.2-1.3 1.2H9.2c-.6 0-1.2-.6-1.2-1.3v-3.5c0-.6.6-1.2 1.2-1.2V9.5C9.2 8.1 10.6 7 12 7m0 1.2c-.8 0-1.5.5-1.5 1.3V11h3V9.5c0-.8-.7-1.3-1.5-1.3"
            />
          </svg>
          <p>سرتاسر رمزگذاری‌شده</p>
        </div>
      </div>

      {(!isCallStarted || (isCallStarted && !isCameraCall)) && (
        <div className={`user-and-call-time-box ${isCameraCall ? "cameraCall" : ""}`}>
          <img
            src={callerProfile?.profilePhoto ?? defaultProfilePhoto}
            onError={(e) => (e.currentTarget.src = defaultProfilePhoto)}
            alt="Profile Image"
          />
          <p>{callerProfile?.displayName}</p>
          <span>{callStatus}</span>
        </div>
      )}
      <>
        <div className={`camera-bar ${!isCameraCall ? "only-voice-call" : ""}`}>
          {isCallStarted && (
            <div className="other-camera-box">
              <video ref={remoteVideoRef} playsInline autoPlay></video>
              <div className="user-info">
                <img src={callerProfile?.profilePhoto ?? defaultProfilePhoto} alt="" />
                <p>{callerProfile?.displayName}</p>
              </div>
            </div>
          )}

          <div className={`device-camera-box ${isCallStarted ? "remote-connected" : ""}`}>
            {isCameraCall && (
              <video
                playsInline
                ref={localVideoRef}
                autoPlay
                muted
                style={{
                  transform: videoFacingMode === "user" ? "scaleX(-1)" : "none",
                }}
              ></video>
            )}
          </div>
        </div>

        {isCallStarted && isCameraCall && <p className="video-call-time-status">{callStatus}</p>}
      </>

      <div className="call-option-buttons">
        <button
          className={isCameraCall ? "camera-switch-button" : "disabled"}
          onClick={isCameraCall ? handleSwitchCamera : undefined}
          disabled={!isCameraCall}
          title={isCameraCall ? "Switch camera" : undefined}
        >
          {isCameraCall ? (videoFacingMode === "user" ? "Front" : "Back") : <MdScreenShare />}
        </button>

        <button className="disabled">
          <PersonAddAlt1Icon />
        </button>

        <button onClick={handleSpeakerMode}>
          {isSpeakerOn ? <HiMiniSpeakerWave /> : <HiMiniSpeakerXMark />}
        </button>

        <button onClick={handleMicrophoneMode}>
          {isMicrophoneOn ? <TbMicrophoneFilled /> : <TbMicrophoneOff />}
        </button>

        <button onClick={handleCloseCall}>
          <PiPhoneSlashFill />
        </button>
      </div>
    </div>
  );
}

CallModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
  isCameraCall: PropTypes.bool.isRequired,
};

export default CallModal;
