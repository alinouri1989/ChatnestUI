import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import PropTypes from "prop-types";

import { getJwtFromCookie } from "../store/helpers/getJwtFromCookie.js";
import {
  removeGroupList,
  setGroupList,
  updateGroupInformations,
  updateUserInfoToGroupList,
} from "../store/Slices/Group/groupListSlice.js";
import {
  addMessageToGroup,
  addMessageToIndividual,
  addNewGroupChat,
  addNewIndividualChat,
  initializeChats,
  addArchive,
  removeArchive,
  removeIndividualChat,
  removeGroupChat,
} from "../store/Slices/chats/chatSlice.js";
import { removePendingUpload } from "../store/Slices/chats/pendingUploadsSlice.js";
import {
  deleteCallHistory,
  handleEndCall,
  handleIncomingCall,
  handleOutgoingCall,
  resetCallState,
  setCallRecipientList,
  setCallStartedDate,
  setInitialCalls,
  setIsCallAcceptWaiting,
  setIsCallStarted,
  setIsCallStarting,
  setIsRingingIncoming,
  updateCallRecipientList,
} from "../store/Slices/calls/callSlice.js";
import {
  addNewUserToChatList,
  setInitialChatList,
  updateUserInfoToChatList,
} from "../store/Slices/chats/chatListSlice.js";
import {
  createAndSendOffer,
  handleRemoteSDP,
  sendSdp,
} from "../services/webRtcService.js";

import { servers } from "../constants/StunTurnServers.js";
import { getUserIdFromToken } from "../helpers/getUserIdFromToken.js";
import { decryptMessage } from "../helpers/messageCryptoHelper.js";
import { SafeJsonHubProtocol } from "../helpers/safeJsonHubProtocol.js";

import store from "../store/index.js";
import { ErrorAlert } from "../helpers/customAlert.js";
import PreLoader from "../shared/components/PreLoader/PreLoader.jsx";

const SignalRContext = createContext();

export const useSignalR = () => {
  const context = useContext(SignalRContext);

  if (!context) {
    throw new Error("useSignalR must be used within a SignalRProvider");
  }

  const {
    initializePeerConnection,
    chatConnection,
    notificationConnection,
    setLocalStream,
    handleAcceptCall,
    switchCameraFacingMode,
    videoFacingMode,
    setRemoteStream,
    peerConnection,
    localStream,
    remoteStream,
    connectionStatus,
    callConnection,
    error,
    loading,
  } = context;
  return {
    initializePeerConnection,
    chatConnection,
    notificationConnection,
    setLocalStream,
    handleAcceptCall,
    switchCameraFacingMode,
    videoFacingMode,
    setRemoteStream,
    peerConnection,
    localStream,
    remoteStream,
    callConnection,
    connectionStatus,
    error,
    loading,
  };
};

export const SignalRProvider = ({ children }) => {
  const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [notificationConnection, setNotificationConnection] = useState(null);
  const [chatConnection, setChatConnection] = useState(null);
  const [callConnection, setCallConnection] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const { callId, callType } = useSelector((state) => state.call);
  const { Individual, Group } = useSelector((state) => state.chat);
  const { token, user } = useSelector((state) => state.auth);
  const userId = getUserIdFromToken(token);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoFacingMode, setVideoFacingMode] = useState("user");

  const callIdRef = useRef(callId);
  const peerConnection = useRef(null);
  const callConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const peerConnectionInitPromiseRef = useRef(null);

  const pendingRequestsRef = useRef(new Set());

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    callConnectionRef.current = callConnection;
  }, [callConnection]);

  const getVideoConstraints = (facingMode = videoFacingMode) => ({
    facingMode: { ideal: facingMode },
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
  });

  const getMediaConstraints = (selectedCallType) => ({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
    },
    video: selectedCallType === 1 ? getVideoConstraints() : false,
  });

  const stopStreamTracks = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
  };

  const clearCallMedia = () => {
    pendingIceCandidatesRef.current = [];
    stopStreamTracks(localStreamRef.current);
    stopStreamTracks(remoteStreamRef.current);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const closePeerConnection = () => {
    if (!peerConnection.current) return;

    try {
      peerConnection.current.onicecandidate = null;
      peerConnection.current.ontrack = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.close();
    } catch {
      /* empty */
    } finally {
      peerConnection.current = null;
    }
  };

  const flushPendingIceCandidates = async (pc = peerConnection.current) => {
    if (!pc?.remoteDescription) {
      return;
    }

    const queuedCandidates = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* empty */
      }
    }
  };

  const attachPeerConnectionHandlers = (pc) => {
    pc.onicecandidate = (event) => {
      const currentCallConnection = callConnectionRef.current;
      if (
        !event.candidate ||
        !currentCallConnection ||
        currentCallConnection.state !== "Connected"
      ) {
        return;
      }

      currentCallConnection.invoke(
        "SendIceCandidate",
        callIdRef.current,
        event.candidate
      );
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      dispatch(setIsCallStarted(true));
      dispatch(setIsCallStarting(false));

      const currentDate = new Date().toISOString();
      dispatch(setCallStartedDate(currentDate));
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;

      if (state === "failed" || state === "closed") {
        dispatch(resetCallState());
        closePeerConnection();
        clearCallMedia();
      }
    };
  };

  const initializePeerConnection = async (callType) => {
    if (peerConnection.current) {
      return peerConnection.current;
    }

    if (peerConnectionInitPromiseRef.current) {
      return peerConnectionInitPromiseRef.current;
    }

    peerConnectionInitPromiseRef.current = (async () => {
      try {
        const pc = new RTCPeerConnection(servers);
        attachPeerConnectionHandlers(pc);

        const stream = await navigator.mediaDevices.getUserMedia(
          getMediaConstraints(callType)
        );
        stopStreamTracks(localStreamRef.current);
        setLocalStream(stream);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        peerConnection.current = pc;
        return pc;
      } catch {
        closePeerConnection();
        return null;
      } finally {
        peerConnectionInitPromiseRef.current = null;
      }
    })();

    return peerConnectionInitPromiseRef.current;
  };

  const switchCameraFacingMode = async (nextMode) => {
    const targetMode =
      nextMode ?? (videoFacingMode === "user" ? "environment" : "user");

    setVideoFacingMode(targetMode);

    const currentPc = peerConnection.current;
    const currentStream = localStreamRef.current;
    const currentVideoTrack = currentStream?.getVideoTracks?.()[0];

    if (!currentPc || !currentStream || !currentVideoTrack) {
      return targetMode;
    }

    try {
      const replacementStream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(targetMode),
        audio: false,
      });
      const replacementTrack = replacementStream.getVideoTracks()[0];

      if (!replacementTrack) {
        stopStreamTracks(replacementStream);
        return targetMode;
      }

      const videoSender = currentPc
        .getSenders()
        .find((sender) => sender.track?.kind === "video");

      if (videoSender) {
        await videoSender.replaceTrack(replacementTrack);
      } else {
        currentPc.addTrack(replacementTrack, currentStream);
      }

      const updatedStream = new MediaStream([
        ...currentStream.getAudioTracks(),
        replacementTrack,
      ]);

      currentVideoTrack.stop();
      setLocalStream(updatedStream);
      return targetMode;
    } catch {
      setVideoFacingMode(videoFacingMode);
      return videoFacingMode;
    }
  };

  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  useEffect(() => {
    const token = getJwtFromCookie();

    const chatConnection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}hub/Chat?access_token=${token}`) // Use query parameter
      .withHubProtocol(new SafeJsonHubProtocol("chat"))
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    const notificationConnection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}hub/Notification?access_token=${token}`) // Use query parameter
      .withHubProtocol(new SafeJsonHubProtocol("notification"))
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    const callConnection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}hub/Call?access_token=${token}`) // Use query parameter
      .withHubProtocol(new SafeJsonHubProtocol("call"))
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    setConnectionStatus("connecting");

    Promise.all([
      chatConnection.start(),
      notificationConnection.start(),
      callConnection.start(),
    ])
      .then(() => {
        setConnectionStatus("connected");
        setLoading(false);

        //! ===========  CHAT CONNECTION ===========

        chatConnection.off("ReceiveInitialChats");
        chatConnection.on("ReceiveInitialChats", (data) => {
          console.log("ReceiveInitialChats received:", data);

          try {
            // Ensure we always have a valid structure
            const safeData = data || { Individual: {}, Group: {} };
            console.log("Dispatching initializeChats with:", safeData);

            store.dispatch(initializeChats(safeData));
          } catch (error) {
            console.error("Error in ReceiveInitialChats handler:", error);

            // Fallback: dispatch with empty structure
            store.dispatch(initializeChats({ Individual: {}, Group: {} }));
          }
        });

        chatConnection.off("ReceiveInitialRecipientChatProfiles");
        chatConnection.on("ReceiveInitialRecipientChatProfiles", (data) => {
          dispatch(setInitialChatList(data));
        });

        chatConnection.off("ReceiveInitialGroupProfiles");
        chatConnection.on("ReceiveInitialGroupProfiles", (data) => {
          dispatch(setGroupList(data));
        });

        chatConnection.off("ReceiveGetMessages");
        chatConnection.on("ReceiveGetMessages", (data) => {
          if (data.Individual) {
            Object.entries(data.Individual).forEach(([chatId, messages]) => {
              Object.entries(messages).forEach(([messageId, messageData]) => {
                if (messageData?.senderId && messageData.senderId !== userId) {
                  dispatch(addNewUserToChatList({ [messageData.senderId]: {} }));

                  const currentIndividualChats =
                    store.getState().chat?.Individual || [];
                  const currentChat = currentIndividualChats.find(
                    (chat) => chat.id === chatId
                  );
                  const isArchivedForCurrentUser =
                    currentChat?.archivedFor &&
                    Object.prototype.hasOwnProperty.call(
                      currentChat.archivedFor,
                      userId
                    );

                  if (isArchivedForCurrentUser) {
                    // Make incoming messages immediately visible in the main chat list.
                    dispatch(removeArchive({ Individual: { [chatId]: {} } }));

                    if (chatConnection?.state === "Connected") {
                      chatConnection.invoke("UnarchiveChat", chatId).catch(() => {
                        // Keep UI responsive even if persistence fails; hub event will retry on next state sync.
                      });
                    }
                  }
                }

                let decryptedContent = messageData.content;
                if (
                  messageData.type === 0 &&
                  decryptedContent &&
                  decryptedContent !== "این پیام حذف شده است."
                ) {
                  decryptedContent = decryptMessage(
                    messageData.content,
                    chatId
                  );
                }

                if (messageData.clientMessageId) {
                  store.dispatch(removePendingUpload(messageData.clientMessageId));
                }

                store.dispatch(
                  addMessageToIndividual({
                    chatId,
                    messageId,
                    messageData: { ...messageData, content: decryptedContent },
                    userId,
                  })
                );
              });
            });
          }

          if (data.Group) {
            Object.entries(data.Group).forEach(([chatId, messages]) => {
              Object.entries(messages).forEach(([messageId, messageData]) => {
                let decryptedContent = messageData.content;

                if (
                  messageData.type === 0 &&
                  decryptedContent &&
                  decryptedContent !== "این پیام حذف شده است."
                ) {
                  decryptedContent = decryptMessage(
                    messageData.content,
                    chatId
                  );
                }

                if (messageData.clientMessageId) {
                  store.dispatch(removePendingUpload(messageData.clientMessageId));
                }

                store.dispatch(
                  addMessageToGroup({
                    chatId,
                    messageId,
                    messageData: { ...messageData, content: decryptedContent },
                    userId,
                  })
                );
              });
            });
          }
        });

        chatConnection.off("ReceiveRecipientProfiles");
        chatConnection.on("ReceiveRecipientProfiles", (data) => {
          dispatch(addNewUserToChatList(data));
        });

        chatConnection.off("ReceiveCreateChat");
        chatConnection.on("ReceiveCreateChat", (data) => {
          if (data.Individual) {
            const individualData = data.Individual;
            const chatId = Object.keys(individualData)[0];

            if (chatId) {
              const chatData = individualData[chatId];
              dispatch(addNewIndividualChat({ chatId, chatData }));

              const participants = Array.isArray(chatData?.participants)
                ? chatData.participants
                : Array.isArray(chatData?.chatParticipants)
                  ? chatData.chatParticipants
                      .map((participant) =>
                        typeof participant === "string"
                          ? participant
                          : participant?.userId
                      )
                      .filter(Boolean)
                  : [];

              const receiverId = participants.find(
                (participantId) => participantId !== userId
              );

              if (receiverId) {
                dispatch(addNewUserToChatList({ [receiverId]: {} }));
              }
            }
          } else if (data.Group) {
            const groupData = data.Group;
            const groupId = Object.keys(groupData)[0];

            if (groupId) {
              const groupChatData = groupData[groupId];

              if (
                groupChatData.messages &&
                Object.keys(groupChatData.messages).length > 0
              ) {
                groupChatData.messages = Object.entries(groupChatData.messages)
                  .map(([messageId, msg]) => {
                    let decryptedContent = msg.content;
                    if (
                      msg.type === 0 &&
                      decryptedContent &&
                      decryptedContent !== "این پیام حذف شده است."
                    ) {
                      decryptedContent = decryptMessage(msg.content, groupId);
                    }
                    return {
                      id: messageId,
                      ...msg,
                      content: decryptedContent,
                      sentDate: new Date(
                        msg.status.sent?.[Object.keys(msg.status.sent)[0]]
                      ),
                    };
                  })
                  .sort((a, b) => a.sentDate - b.sentDate)
                  .map(({ ...msg }) => msg);
              }

              dispatch(
                addNewGroupChat({ chatId: groupId, chatData: groupChatData })
              );
            }
          }
        });

        chatConnection.off("ReceiveArchiveChat");
        chatConnection.on("ReceiveArchiveChat", (data) => {
          dispatch(addArchive(data));
        });

        chatConnection.off("ReceiveUnarchiveChat");
        chatConnection.on("ReceiveUnarchiveChat", (data) => {
          dispatch(removeArchive(data));
        });

        chatConnection.off("ReceiveClearChat");
        chatConnection.on("ReceiveClearChat", (data) => {
          dispatch(removeIndividualChat(data));
        });
        // Add missing chat error handlers
        chatConnection.off("UnexpectedError");
        chatConnection.on("UnexpectedError", (data) => {
          console.error("Chat Hub Error:", data);
          ErrorAlert(data.message);
        });

        chatConnection.off("ValidationError");
        chatConnection.on("ValidationError", (data) => {
          console.error("Chat Validation Error:", data);
          ErrorAlert(data.message);
        });

        chatConnection.off("ConnectionError");
        chatConnection.on("ConnectionError", (data) => {
          console.error("Chat Connection Error:", data);
          ErrorAlert(data.message);
        });

        chatConnection.invoke("Initial");

        //! =========== NOTIFICATION CONNECTION ===========

        notificationConnection.off("ReceiveRecipientProfiles");
        notificationConnection.on("ReceiveRecipientProfiles", (data) => {
          dispatch(updateUserInfoToChatList(data));
          dispatch(updateUserInfoToGroupList(data));
          dispatch(updateCallRecipientList(data));
        });

        notificationConnection.off("ReceiveNewGroupProfiles");
        notificationConnection.on("ReceiveNewGroupProfiles", (data) => {
          dispatch(setGroupList(data));
          const groupId = Object.keys(data)[0];

          if (groupId) {
            if (chatConnection.state === "Connected") {
              chatConnection.invoke("CreateChat", "Group", groupId);
            }
          }
        });

        notificationConnection.off("ReceiveGroupProfiles");
        notificationConnection.on("ReceiveGroupProfiles", (data) => {
          const groupId = Object.keys(data)[0];
          const groupData = data[groupId];

          const userParticipant = groupData.participants[userId];

          if (userParticipant && userParticipant.role === 2) {
            dispatch(removeGroupChat(groupId));
            dispatch(removeGroupList(groupId));
            navigate("/groups");
            return;
          }

          const currentGroupList = store.getState().groupList;
          if (Object.hasOwn(currentGroupList.groupList, groupId)) {
            dispatch(updateGroupInformations(data));
          } else {
            dispatch(updateGroupInformations(data));
            if (chatConnection.state === "Connected") {
              chatConnection.invoke("CreateChat", "Group", groupId);
            }
          }
        });
        // Add missing notification handlers
        notificationConnection.off("NotificationHubInitialized");
        notificationConnection.on("NotificationHubInitialized", (data) => {
          console.log("Notification Hub initialized:", data);
        });

        notificationConnection.off("UnexpectedError");
        notificationConnection.on("UnexpectedError", (data) => {
          console.error("Notification Hub Error:", data);
          ErrorAlert(data.message);
        });

        notificationConnection.off("ReceiveSearchUsers");
        notificationConnection.on("ReceiveSearchUsers", (data) => {
          console.log("Search results:", data);
          // Handle search results
        });

        notificationConnection.off("ValidationError");
        notificationConnection.on("ValidationError", (data) => {
          console.error("Notification Validation Error:", data);
          ErrorAlert(data.message);
        });

        notificationConnection.off("ConnectionError");
        notificationConnection.on("ConnectionError", (data) => {
          console.error("Notification Connection Error:", data);
          ErrorAlert(data.message);
        });

        notificationConnection.invoke("Initial");

        //! ===========  CALL CONNECTION ===========

        callConnection.off("ReceiveInitialCalls");
        callConnection.on("ReceiveInitialCalls", async (data) => {
          dispatch(setInitialCalls(data));
        });

        callConnection.off("ReceiveInitialCallRecipientProfiles");
        callConnection.on(
          "ReceiveInitialCallRecipientProfiles",
          async (data) => {
            dispatch(setCallRecipientList(data));
          }
        );

        callConnection.off("ReceiveIncomingCall");
        callConnection.on("ReceiveIncomingCall", async (data) => {
          const callType = data.callType;
          handleIncomingCall(data, dispatch, userId);
          await initializePeerConnection(callType);
        });

        callConnection.off("ReceiveOutgoingCall");
        callConnection.on("ReceiveOutgoingCall", async (data) => {
          handleOutgoingCall(data, dispatch, userId);
        });

        callConnection.off("ReceiveEndCall");
        callConnection.on("ReceiveEndCall", (data) => {
          handleEndCall(data.call, dispatch);
          const otherDataKey = Object.keys(data).find((key) => key !== "call");
          if (otherDataKey) {
            const otherDataObject = data[otherDataKey];
            if (otherDataObject) {
              const formattedData = {
                [otherDataKey]: {
                  id: otherDataKey,
                  ...otherDataObject,
                },
              };
              dispatch(updateCallRecipientList(formattedData));
            }
          }
          closePeerConnection();
          clearCallMedia();
        });

        callConnection.off("ReceiveDeleteCall");
        callConnection.on("ReceiveDeleteCall", (data) => {
          dispatch(deleteCallHistory(data));
        });

        callConnection.off("ReceiveIceCandidate");
        callConnection.on("ReceiveIceCandidate", async (data) => {
          const currentPc = peerConnection.current;

          if (!currentPc || !currentPc.remoteDescription) {
            pendingIceCandidatesRef.current.push(data);
            return;
          }

          try {
            await currentPc.addIceCandidate(new RTCIceCandidate(data));
          } catch {
            pendingIceCandidatesRef.current.push(data);
          }
        });

        callConnection.off("ReceiveSdp");
        callConnection.on("ReceiveSdp", async (data) => {
          try {
            if (data.sdp.type === "offer") {
              if (!peerConnection.current) {
                await initializePeerConnection(data.callType);
              }

              if (!peerConnection.current) {
                return;
              }

              await handleRemoteSDP(data.sdp, peerConnection.current);
              await flushPendingIceCandidates(peerConnection.current);
              const answer = await peerConnection.current.createAnswer();
              await peerConnection.current.setLocalDescription(answer);

              await sendSdp(callIdRef.current, answer, callConnection);
            } else if (data.sdp.type === "answer") {
              await handleRemoteSDP(data.sdp, peerConnection.current);
              await flushPendingIceCandidates(peerConnection.current);
            }
          } catch {
            /* empty */
          }
        });

        callConnection.off("ReceiveAcceptCall");
        callConnection.on("ReceiveAcceptCall", async () => {
          // Keep the incoming-call UI mounted until media is actually connected.
          // The UI is closed after ontrack -> setIsCallStarted(true).
        });

        // Add missing call error handlers
        callConnection.off("UnexpectedError");
        callConnection.on("UnexpectedError", (data) => {
          console.error("Call Hub Error:", data);
          // Don't show every database error to users - log them instead
          if (data.message.includes("LINQ expression")) {
            console.error("Database query error - check server logs");
            // Optionally show a generic error to user
            ErrorAlert("یک خطای داخلی رخ داده است. لطفاً دوباره تلاش کنید.");
          } else {
            ErrorAlert(data.message);
          }
        });

        callConnection.off("ValidationError");
        callConnection.on("ValidationError", (data) => {
          console.error("Call Validation Error:", data);
          ErrorAlert(data.message);
        });

        callConnection.off("ConnectionError");
        callConnection.on("ConnectionError", (data) => {
          console.error("Call Connection Error:", data);
          ErrorAlert(data.message);
        });

        callConnection.invoke("Initial");

        //! ==== CONNECTION ERRORS =====

        chatConnection.on("Error", (data) => {
          ErrorAlert(data.message);
        });

        notificationConnection.on("Error", (data) => {
          ErrorAlert(data.message);
        });

      })
      .catch((err) => {
        setConnectionStatus("failed");
        setError(err);
        setLoading(false);
      });

    setChatConnection(chatConnection);
    setNotificationConnection(notificationConnection);
    setCallConnection(callConnection);

    const handleBeforeUnload = () => {
      if (chatConnection) chatConnection.stop();
      if (notificationConnection) notificationConnection.stop();
      if (callConnection) callConnection.stop();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (chatConnection) chatConnection.stop();
      if (notificationConnection) notificationConnection.stop();
      if (callConnection) callConnection.stop();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (
      userId &&
      chatConnection?.state === "Connected" &&
      (Individual?.length > 0 || Group?.length > 0)
    ) {
      deliverMessages();
    }
  }, [chatConnection, Individual, Group, location.pathname, userId]);

  //! ====== METHODS ======

  const handleAcceptCall = async () => {
    if (!callConnection || callConnection.state !== "Connected" || !callIdRef.current) {
      ErrorAlert("برقراری تماس امکان‌پذیر نیست. دوباره تلاش کنید.");
      return;
    }

    try {
      dispatch(setIsCallAcceptWaiting(true));

      if (!peerConnection.current) {
        await initializePeerConnection(callType);
      }

      if (!peerConnection.current) {
        dispatch(setIsCallAcceptWaiting(false));
        ErrorAlert("دسترسی به میکروفون/دوربین یا اتصال تماس برقرار نشد.");
        return;
      }

      await createAndSendOffer(callIdRef.current, callConnection, peerConnection);
      await callConnection.invoke("AcceptCall", callIdRef.current);
    } catch {
      dispatch(setIsCallAcceptWaiting(false));
      ErrorAlert("پذیرش تماس انجام نشد.");
    }
  };

  const addPendingRequest = (messageId) => {
    pendingRequestsRef.current.add(messageId);
  };

  const removePendingRequest = (messageId) => {
    pendingRequestsRef.current.delete(messageId);
  };

  const deliverMessages = async () => {
    try {
      const chatIdFromLocation =
        window.location.pathname.includes("chats") ||
        window.location.pathname.includes("archives")
          ? window.location.pathname.split("/")[2]
          : null;
      const groupIdFromLocation = window.location.pathname.includes("groups")
        ? window.location.pathname.split("/")[2]
        : null;

      const individualPromises = Individual.flatMap((chat) =>
        chat?.messages
          .filter((message) => {
            const isSent =
              message.status.sent &&
              Object.keys(message.status.sent).includes(userId);
            const isDelivered =
              message.status.delivered &&
              Object.keys(message.status.delivered).includes(userId);

            return (
              !isSent &&
              !isDelivered &&
              !pendingRequestsRef.current.has(message.id)
            );
          })
          .map(async (message) => {
            addPendingRequest(message.id);
            try {
              await chatConnection.invoke(
                "DeliverMessage",
                "Individual",
                chat.id,
                message.id
              );
            } finally {
              removePendingRequest(message.id);
            }
          })
      );

      const individualReadPromises = chatIdFromLocation
        ? Individual.flatMap((chat) => {
            if (chat.id === chatIdFromLocation) {
              return chat.messages
                .filter((message) => {
                  const isDelivered =
                    message.status.delivered &&
                    Object.keys(message.status.delivered).includes(userId);
                  const isRead =
                    message.status.read &&
                    Object.keys(message.status.read).includes(userId);
                  const isSentByUser =
                    message.status.sent &&
                    Object.keys(message.status.sent).includes(userId);

                  return (
                    isDelivered &&
                    !isRead &&
                    !isSentByUser &&
                    !pendingRequestsRef.current.has(message.id)
                  );
                })
                .map(async (message) => {
                  addPendingRequest(message.id);
                  try {
                    await chatConnection.invoke(
                      "ReadMessage",
                      "Individual",
                      chat.id,
                      message.id
                    );
                  } finally {
                    removePendingRequest(message.id);
                  }
                });
            }
            return [];
          })
        : [];

      const groupPromises = Group.flatMap((chat) =>
        chat.messages
          .filter((message) => {
            const isSent =
              message.status.sent &&
              Object.keys(message.status.sent).includes(userId);
            const isDelivered =
              message.status.delivered &&
              Object.keys(message.status.delivered).includes(userId);
            return (
              !(isSent || isDelivered) &&
              !pendingRequestsRef.current.has(message.id)
            );
          })
          .map(async (message) => {
            addPendingRequest(message.id);
            try {
              await chatConnection.invoke(
                "DeliverMessage",
                "Group",
                chat.id,
                message.id
              );
            } finally {
              removePendingRequest(message.id);
            }
          })
      );

      const groupReadPromises = groupIdFromLocation
        ? Group.flatMap((chat) => {
            if (chat.id === groupIdFromLocation) {
              return chat.messages
                .filter((message) => {
                  const isRead =
                    message.status.read &&
                    Object.keys(message.status.read).includes(userId);
                  const isSentByUser =
                    message.status.sent &&
                    Object.keys(message.status.sent).includes(userId);
                  return (
                    !isRead &&
                    !isSentByUser &&
                    !pendingRequestsRef.current.has(message.id)
                  );
                })
                .map(async (message) => {
                  addPendingRequest(message.id);
                  try {
                    await chatConnection.invoke(
                      "ReadMessage",
                      "Group",
                      chat.id,
                      message.id
                    );
                  } finally {
                    removePendingRequest(message.id);
                  }
                });
            }
            return [];
          })
        : [];

      await Promise.all([
        ...individualPromises,
        ...individualReadPromises,
        ...groupPromises,
        ...groupReadPromises,
      ]);
    } catch {
      /* empty */
    }
  };

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "var(--app-height)",
          background:
            user.userSettings.theme === "Dark" ? "#141414" : "#ffffff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <PreLoader />
      </div>
    );
  }

  return (
    <SignalRContext.Provider
      value={{
        chatConnection,
        notificationConnection,
        callConnection,
        connectionStatus,
        error,
        loading,
        setLocalStream,
        setRemoteStream,
        localStream,
        remoteStream,
        peerConnection,
        initializePeerConnection,
        handleAcceptCall,
        switchCameraFacingMode,
        videoFacingMode,
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
};
SignalRProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
