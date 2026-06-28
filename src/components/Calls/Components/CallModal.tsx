// @ts-nocheck
import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Room, RoomEvent, Track } from "livekit-client";

import { useSignalR } from "../../../contexts/SignalRContext";
import ChatNestLogo from "../../../assets/logos/ChatNestLogoWithText.svg";
import ChatNestLogo_Dark from "../../../assets/logos/ChatNestLogoWithText_dark.svg";
import useThemeImage from "../../../hooks/useThemeImage";
import CallSound from "../../../assets/sound/ChatNestCallSound.mp3";
import BusySound from "../../../assets/sound/ChatNestCallBusySound.mp3";

import { MdScreenShare } from "react-icons/md";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import { HiMiniSpeakerWave, HiMiniSpeakerXMark } from "react-icons/hi2";
import { TbMicrophoneFilled, TbMicrophoneOff } from "react-icons/tb";
import { PiPhoneSlashFill } from "react-icons/pi";

import { formatTime } from "../../../helpers/formatCallTime";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";
import { ErrorAlert } from "../../../helpers/customAlert";
import "./CallModal.scss";

function CallModal({ closeModal, isCameraCall }) {
  const { callConnection } = useSignalR();
  const {
    callerProfile,
    callId,
    isCallStarted,
    isRingingOutgoing,
    callStartedDate,
    isCallStarting,
  } = useSelector((state) => state.call);
  const currentUser = useSelector((state) => state.auth.user);
  const logoSrc = useThemeImage(ChatNestLogo, ChatNestLogo_Dark);

  const [isMicrophoneOn, setMicrophoneMode] = useState(true);
  const [isSpeakerOn, setSpeakerMode] = useState(true);
  const [callStatus, setCallStatus] = useState("در حال تماس...");
  const [videoFacingMode, setVideoFacingMode] = useState("user");
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const roomRef = useRef(null);
  const callAudioRef = useRef(null);
  const busyAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const detachTrack = useCallback((track, element) => {
    if (!track || !element) return;
    try {
      track.detach(element);
    } catch {
      /* LiveKit may already have detached this element. */
    }
  }, []);

  const attachLocalCamera = useCallback(() => {
    const room = roomRef.current;
    const element = localVideoRef.current;
    const publication = room?.localParticipant?.getTrackPublication(Track.Source.Camera);
    const track = publication?.track;

    if (track && element) {
      track.attach(element);
    }
  }, []);

  useEffect(() => {
    if (!isCallStarted || !callConnection || !callId) return;

    let isCancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const attachRemoteTrack = (track) => {
      if (track.kind === "video" && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
        setHasRemoteVideo(true);
      }

      if (track.kind === "audio" && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
        remoteAudioRef.current.muted = !isSpeakerOn;
      }
    };

    const detachRemoteTrack = (track) => {
      if (track.kind === "video") {
        detachTrack(track, remoteVideoRef.current);
        setHasRemoteVideo(false);
      }

      if (track.kind === "audio") {
        detachTrack(track, remoteAudioRef.current);
      }
    };

    room.on(RoomEvent.TrackSubscribed, attachRemoteTrack);
    room.on(RoomEvent.TrackUnsubscribed, detachRemoteTrack);
    room.on(RoomEvent.LocalTrackPublished, attachLocalCamera);
    room.on(RoomEvent.Disconnected, () => {
      setHasRemoteVideo(false);
    });

    const connectToLiveKit = async () => {
      try {
        const join = await callConnection.invoke(
          "CreateLiveKitJoinToken",
          callId,
          currentUser?.displayName ?? ""
        );

        if (isCancelled) return;

        await room.connect(join.serverUrl, join.token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        if (isCameraCall) {
          await room.localParticipant.setCameraEnabled(true, {
            facingMode: videoFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          });
          attachLocalCamera();
        }
      } catch (error) {
        console.error("LiveKit call connection failed:", error);
        ErrorAlert("اتصال تماس برقرار نشد.");
      }
    };

    connectToLiveKit();

    return () => {
      isCancelled = true;
      room.off(RoomEvent.TrackSubscribed, attachRemoteTrack);
      room.off(RoomEvent.TrackUnsubscribed, detachRemoteTrack);
      room.off(RoomEvent.LocalTrackPublished, attachLocalCamera);
      detachTrack(
        room.localParticipant?.getTrackPublication(Track.Source.Camera)?.track,
        localVideoRef.current
      );
      room.disconnect();
      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
  }, [
    attachLocalCamera,
    callConnection,
    callId,
    currentUser?.displayName,
    detachTrack,
    isCallStarted,
    isCameraCall,
    isSpeakerOn,
    videoFacingMode,
  ]);

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

  useEffect(() => {
    if (!isCallStarted && !isRingingOutgoing) {
      closeModal();
    }
  }, [isCallStarted, isRingingOutgoing, closeModal]);

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

  const handleMicrophoneMode = async () => {
    const nextValue = !isMicrophoneOn;
    setMicrophoneMode(nextValue);
    await roomRef.current?.localParticipant.setMicrophoneEnabled(nextValue);
  };

  const handleSpeakerMode = () => {
    const nextValue = !isSpeakerOn;
    setSpeakerMode(nextValue);

    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !nextValue;
    }

    if (callAudioRef.current) {
      callAudioRef.current.volume = nextValue ? 1 : 0;
    }

    if (busyAudioRef.current) {
      busyAudioRef.current.volume = nextValue ? 1 : 0;
    }
  };

  const handleCloseCall = () => {
    roomRef.current?.disconnect();

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

    const nextMode = videoFacingMode === "user" ? "environment" : "user";
    setVideoFacingMode(nextMode);

    const publication = roomRef.current?.localParticipant?.getTrackPublication(
      Track.Source.Camera
    );
    const videoTrack = publication?.track;

    if (videoTrack && typeof videoTrack.restartTrack === "function") {
      await videoTrack.restartTrack({ facingMode: nextMode });
      attachLocalCamera();
      return;
    }

    await roomRef.current?.localParticipant.setCameraEnabled(false);
    await roomRef.current?.localParticipant.setCameraEnabled(true, {
      facingMode: nextMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    });
    attachLocalCamera();
  };

  return (
    <div className={`call-modal ${isCallStarted ? "video-call-Mode" : ""}`}>
      <div className="logo-and-e2e-box">
        <img src={logoSrc} alt="ChatNest Logo" />
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
            alt="Profile"
          />
          <p>{callerProfile?.displayName}</p>
          <span>{callStatus}</span>
        </div>
      )}

      <div className={`camera-bar ${!isCameraCall ? "only-voice-call" : ""}`}>
        {isCallStarted && (
          <div className="other-camera-box">
            <video
              ref={remoteVideoRef}
              playsInline
              autoPlay
              className={hasRemoteVideo ? "" : "hidden-video"}
            />
            <audio ref={remoteAudioRef} autoPlay />
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
            />
          )}
        </div>
      </div>

      {isCallStarted && isCameraCall && <p className="video-call-time-status">{callStatus}</p>}

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
