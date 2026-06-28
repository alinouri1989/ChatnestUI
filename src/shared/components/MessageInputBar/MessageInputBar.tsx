// @ts-nocheck
import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSignalR } from "../../../contexts/SignalRContext";
import { useModal } from "../../../contexts/ModalContext";
import { useLocation } from "react-router-dom";

import EmojiPicker from "emoji-picker-react";
import { HiPlus } from "react-icons/hi";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { LuFileUp } from "react-icons/lu";
import { LuImage } from "react-icons/lu";
import { BiSolidMicrophone } from "react-icons/bi";
import { LuFileVideo } from "react-icons/lu";
import { IoClose } from "react-icons/io5";

import ImageModal from "../ImageModal/ImageModal";
import SoundRecordModal from "../SoundRecordModal/SoundRecordModal";

import { encryptMessage } from "../../../helpers/messageCryptoHelper";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import {
  addPendingUpload,
  markPendingUploadSent,
  removePendingUpload,
  updatePendingUpload,
} from "../../../store/Slices/chats/pendingUploadsSlice";
import {
  registerPendingUploadAbortController,
  unregisterPendingUploadAbortController,
} from "../../../shared/upload/pendingUploadAbortRegistry";
import { sendFileMessageInChunks } from "../../../shared/upload/sendFileMessageInChunks";
import { sendTextMessage } from "../../../services/messageActions";

import "./style.scss";

const MAX_GENERIC_FILE_BYTES = 300 * 1024 * 1024;
const TYPING_IDLE_TIMEOUT_MS = 1500;
const TYPING_REFRESH_INTERVAL_MS = 2000;
const REPLY_TYPE = {
  Text: 0,
  Image: 1,
  Video: 2,
  Audio: 3,
  File: 4,
};

function MessageInputBar({ chatId, replyMessage, onClearReply }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { showModal, closeModal } = useModal();
  const { chatConnection } = useSignalR();
  const { user, token } = useSelector((state) => state.auth);
  const { groupList } = useSelector((state) => state.groupList);
  const currentUserId = getUserIdFromToken(token);

  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [, setIsLoading] = useState(false);
  const [, setUploadProgress] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isShowFileMenu, setShowFileMenu] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const emojiPickerRef = useRef(null);
  const fileImageInputRef = useRef(null);
  const fileVideoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileMenuRef = useRef(null);
  const addFileButtonRef = useRef(null);
  const uploadProgressTimeoutRef = useRef(null);
  const dragDepthRef = useRef(0);
  const typingStopTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const lastTypingSignalAtRef = useRef(0);

  const clearUploadProgressTimeout = useCallback(() => {
    if (uploadProgressTimeoutRef.current) {
      clearTimeout(uploadProgressTimeoutRef.current);
      uploadProgressTimeoutRef.current = null;
    }
  }, []);

  const startUploadProgress = useCallback((fileName) => {
    clearUploadProgressTimeout();
    setUploadProgress({
      fileName,
      percent: 0,
      status: "Preparing file...",
    });
  }, [clearUploadProgressTimeout]);

  const updateUploadProgress = useCallback((percent, status) => {
    setUploadProgress((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        percent: Math.max(prev.percent ?? 0, Math.min(100, Math.round(percent))),
        status: status ?? prev.status,
      };
    });
  }, []);

  const finishUploadProgress = useCallback((status = "Upload complete") => {
    setUploadProgress((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        percent: 100,
        status,
      };
    });

    clearUploadProgressTimeout();
    uploadProgressTimeoutRef.current = setTimeout(() => {
      setUploadProgress(null);
      uploadProgressTimeoutRef.current = null;
    }, 1200);
  }, [clearUploadProgressTimeout]);

  const resetUploadProgress = useCallback(() => {
    clearUploadProgressTimeout();
    setUploadProgress(null);
  }, [clearUploadProgressTimeout]);

  const createPendingAttachment = useCallback(
    ({ file, chatType, contentType, previewUrl = null }) => {
      const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      dispatch(
        addPendingUpload({
          id: pendingId,
          chatId,
          chatType,
          contentType,
          fileName: file?.name || "attachment",
          fileSize: file?.size || 0,
          previewUrl,
          progress: 0,
          phase: "preparing",
          statusText: "در حال آماده سازی...",
          createdAt: new Date().toISOString(),
        })
      );

      return pendingId;
    },
    [chatId, dispatch]
  );

  const updatePendingAttachment = useCallback(
    (pendingId, changes) => {
      if (!pendingId) return;
      dispatch(updatePendingUpload({ id: pendingId, changes }));
    },
    [dispatch]
  );

  const completePendingAttachment = useCallback(
    (pendingId) => {
      if (!pendingId) return;

      dispatch(markPendingUploadSent(pendingId));
      setTimeout(() => {
        dispatch(removePendingUpload(pendingId));
      }, 900);
    },
    [dispatch]
  );

  const removePendingAttachment = useCallback(
    (pendingId) => {
      if (!pendingId) return;
      dispatch(removePendingUpload(pendingId));
    },
    [dispatch]
  );

  const cancelPendingAttachment = useCallback(
    (pendingId) => {
      if (!pendingId) return;

      dispatch(
        updatePendingUpload({
          id: pendingId,
          changes: {
            phase: "cancelled",
            statusText: "لغو شد",
          },
        })
      );

      setTimeout(() => {
        dispatch(removePendingUpload(pendingId));
      }, 500);
    },
    [dispatch]
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        fileMenuRef.current &&
        !fileMenuRef.current.contains(event.target) &&
        addFileButtonRef.current &&
        !addFileButtonRef.current.contains(event.target)
      ) {
        setShowFileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearUploadProgressTimeout();
    };
  }, [clearUploadProgressTimeout]);

  const getActiveChatType = useCallback(() => {
    if (location.pathname.includes("chats") || location.pathname.includes("archives")) {
      return "Individual";
    } else if (location.pathname.includes("groups")) {
      return "Group";
    }
    return "";
  }, [location.pathname]);

  const activeChatType = getActiveChatType();
  const activeGroupProfile =
    activeChatType === "Group" ? groupList?.[String(chatId)] : null;
  const activeGroupRole = activeGroupProfile?.participants?.[currentUserId]?.role;
  const isReadOnlyChannel =
    activeChatType === "Group" &&
    Number(activeGroupProfile?.kind ?? 0) === 1 &&
    Number(activeGroupRole) !== 0;

  const sendTypingStatus = useCallback(
    async (isTyping) => {
      if (!chatId || isReadOnlyChannel || chatConnection?.state !== "Connected") {
        return;
      }

      try {
        await chatConnection.invoke("UpdateTypingStatus", chatId, isTyping);
      } catch {
        // Typing is ephemeral; sending the actual message remains the priority path.
      }
    },
    [chatConnection, chatId, isReadOnlyChannel]
  );

  const stopTyping = useCallback(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    if (!isTypingRef.current) {
      return;
    }

    isTypingRef.current = false;
    lastTypingSignalAtRef.current = 0;
    void sendTypingStatus(false);
  }, [sendTypingStatus]);

  const scheduleTypingStop = useCallback(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_IDLE_TIMEOUT_MS);
  }, [stopTyping]);

  const notifyTyping = useCallback(
    (nextMessage) => {
      if (isReadOnlyChannel) {
        return;
      }

      if (!nextMessage.trim()) {
        stopTyping();
        return;
      }

      const now = Date.now();
      const shouldRefreshTyping =
        !isTypingRef.current ||
        now - lastTypingSignalAtRef.current >= TYPING_REFRESH_INTERVAL_MS;

      if (shouldRefreshTyping) {
        isTypingRef.current = true;
        lastTypingSignalAtRef.current = now;
        void sendTypingStatus(true);
      }

      scheduleTypingStop();
    },
    [isReadOnlyChannel, scheduleTypingStop, sendTypingStatus, stopTyping]
  );

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => {
      const nextMessage = prev + emojiData.emoji;
      notifyTyping(nextMessage);
      return nextMessage;
    });
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const handleInputChange = (e) => {
    const nextMessage = e.target.value;
    setMessage(nextMessage);
    notifyTyping(nextMessage);
  };

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [chatId, stopTyping]);

  const resolveReplyPreviewText = useCallback((messageData) => {
    if (!messageData) return "";

    switch (messageData.type) {
      case REPLY_TYPE.Text:
        return messageData.content || "";
      case REPLY_TYPE.Image:
        return "Photo";
      case REPLY_TYPE.Video:
        return "Video";
      case REPLY_TYPE.Audio:
        return "Voice message";
      case REPLY_TYPE.File:
        return messageData.fileName || "File";
      default:
        return messageData.content || messageData.fileName || "Message";
    }
  }, []);

  const resolveReplySenderLabel = useCallback((messageData) => {
    if (!messageData) return "Reply";

    if (String(messageData.senderId || "") === String(currentUserId)) {
      return "You";
    }

    return messageData.senderName || "Reply";
  }, [currentUserId]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = () => {
    fileImageInputRef.current?.click();
  };

  const handleVideoSelect = () => {
    fileVideoInputRef.current?.click();
  };

  const handleSoundRecord = () => {
    if (isReadOnlyChannel) {
      ErrorAlert("فقط مدیران کانال می‌توانند پیام ارسال کنند.");
      return;
    }

    showModal(
      <SoundRecordModal
        closeModal={closeModal}
        chatId={chatId}
        replyMessage={replyMessage}
        onReplySent={onClearReply}
      />
    );
  };

  const sendVideoFile = useCallback(async (file) => {
    const chatType = getActiveChatType();

    if (isReadOnlyChannel) {
      ErrorAlert("فقط مدیران کانال می‌توانند پیام ارسال کنند.");
      return;
    }

    if (file) {
      const abortController = new AbortController();
      const pendingId = createPendingAttachment({
        file,
        chatType,
        contentType: 2,
        previewUrl: URL.createObjectURL(file),
      });
      registerPendingUploadAbortController(pendingId, abortController);
      startUploadProgress(file.name);
      setIsLoading(true);
      try {
        updateUploadProgress(1, "در حال بارگذاری...");
        updatePendingAttachment(pendingId, {
          progress: 1,
          phase: "sending",
          statusText: "در حال بارگذاری...",
        });

        await sendFileMessageInChunks({
          chatType,
          chatId,
          contentType: 2,
          file,
          fileName: file.name,
          clientMessageId: pendingId,
          replyToMessageId: replyMessage?.id ?? null,
          signal: abortController.signal,
          onProgress: ({ percent }) => {
            updateUploadProgress(percent, "در حال بارگذاری...");
            updatePendingAttachment(pendingId, {
              progress: percent,
              phase: "sending",
              statusText: "در حال بارگذاری...",
            });
          },
        });

        finishUploadProgress();
        completePendingAttachment(pendingId);
        onClearReply?.();
        SuccessAlert("ویدیو ارسال شد");
      } catch (error) {
        resetUploadProgress();
        console.log(error);

        if (error?.name === "AbortError") {
          cancelPendingAttachment(pendingId);
        } else {
          removePendingAttachment(pendingId);
          ErrorAlert("ویدیو ارسال نشد");
        }
      } finally {
        unregisterPendingUploadAbortController(pendingId);
      }
      setIsLoading(false);
    } else {
      ErrorAlert("هیچ فایلی انتخاب نشده");
    }
  }, [
    cancelPendingAttachment,
    chatId,
    completePendingAttachment,
    createPendingAttachment,
    finishUploadProgress,
    getActiveChatType,
    isReadOnlyChannel,
    onClearReply,
    removePendingAttachment,
    replyMessage?.id,
    resetUploadProgress,
    startUploadProgress,
    updatePendingAttachment,
    updateUploadProgress,
  ]);

  const sendFilesSequentially = useCallback(async (files, sendFile) => {
    for (const file of files) {
      await sendFile(file);
    }
  }, []);

  const handleSendVideoFile = async (e) => {
    await sendFilesSequentially(Array.from(e.target.files ?? []), sendVideoFile);
    e.target.value = "";
  };

  const openImageComposer = useCallback((files) => {
    if (isReadOnlyChannel) {
      ErrorAlert("فقط مدیران کانال می‌توانند پیام ارسال کنند.");
      return;
    }

    const selectedImages = Array.from(files ?? []).filter(Boolean);

    if (selectedImages.length > 0) {
      setSelectedFile(selectedImages[0]);

      showModal(
        <ImageModal
          closeModal={closeModal}
          images={selectedImages}
          chatId={chatId}
          replyMessage={replyMessage}
          onReplySent={onClearReply}
        />
      );
    }
  }, [chatId, closeModal, isReadOnlyChannel, onClearReply, replyMessage, showModal]);

  const handleSendImageFile = (e) => {
    openImageComposer(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const sendGenericFile = useCallback(async (file) => {
    const chatType = getActiveChatType();

    if (isReadOnlyChannel) {
      ErrorAlert("فقط مدیران کانال می‌توانند پیام ارسال کنند.");
      return;
    }

    if (!file) {
      ErrorAlert("هیچ فایلی انتخاب نشده");
      return;
    }

    if (file.size > MAX_GENERIC_FILE_BYTES) {
      ErrorAlert("حداکثر حجم فایل 300 مگابایت است");
      return;
    }

    const abortController = new AbortController();
    const pendingId = createPendingAttachment({ file, chatType, contentType: 4 });
    registerPendingUploadAbortController(pendingId, abortController);

    try {
      startUploadProgress(file.name);
      setIsLoading(true);
      updateUploadProgress(1, "در حال بارگذاری...");
      updatePendingAttachment(pendingId, {
        progress: 1,
        phase: "sending",
        statusText: "در حال بارگذاری...",
      });

      await sendFileMessageInChunks({
        chatType,
        chatId,
        contentType: 4,
        file,
        fileName: file.name,
        clientMessageId: pendingId,
        replyToMessageId: replyMessage?.id ?? null,
        signal: abortController.signal,
        onProgress: ({ percent }) => {
          updateUploadProgress(percent, "در حال بارگذاری...");
          updatePendingAttachment(pendingId, {
            progress: percent,
            phase: "sending",
            statusText: "در حال بارگذاری...",
          });
        },
      });

      finishUploadProgress();
      completePendingAttachment(pendingId);
      onClearReply?.();
      setIsLoading(false);
    } catch (error) {
      resetUploadProgress();
      setIsLoading(false);
      if (error?.name === "AbortError") {
        cancelPendingAttachment(pendingId);
      } else {
        removePendingAttachment(pendingId);
      }
      if (error?.name === "AbortError") {
        // Silent user cancel
      } else if (error?.message === "empty_file") {
        ErrorAlert("فایل با محتوای خالی قابل ارسال نیست");
      } else {
        ErrorAlert("فایل ارسال نشد");
      }
    } finally {
      unregisterPendingUploadAbortController(pendingId);
    }
  }, [
    cancelPendingAttachment,
    chatId,
    completePendingAttachment,
    createPendingAttachment,
    finishUploadProgress,
    getActiveChatType,
    isReadOnlyChannel,
    onClearReply,
    removePendingAttachment,
    replyMessage?.id,
    resetUploadProgress,
    startUploadProgress,
    updatePendingAttachment,
    updateUploadProgress,
  ]);

  const handleSendFile = async (e) => {
    await sendFilesSequentially(Array.from(e.target.files ?? []), sendGenericFile);
    e.target.value = "";
  };

  const isFileDragEvent = useCallback((event) => {
    const dragTypes = Array.from(event.dataTransfer?.types ?? []);
    return dragTypes.includes("Files");
  }, []);

  const handleDroppedFiles = useCallback(async (files) => {
    const droppedFiles = Array.from(files ?? []).filter(Boolean);
    if (droppedFiles.length === 0) return;

    const imageFiles = droppedFiles.filter((file) => file.type?.startsWith("image/"));
    const videoFiles = droppedFiles.filter((file) => file.type?.startsWith("video/"));
    const genericFiles = droppedFiles.filter(
      (file) => !file.type?.startsWith("image/") && !file.type?.startsWith("video/")
    );

    if (videoFiles.length > 0) {
      await sendFilesSequentially(videoFiles, sendVideoFile);
    }

    if (genericFiles.length > 0) {
      await sendFilesSequentially(genericFiles, sendGenericFile);
    }

    if (imageFiles.length > 0) {
      openImageComposer(imageFiles);
    }
  }, [openImageComposer, sendFilesSequentially, sendGenericFile, sendVideoFile]);

  useEffect(() => {
    const handleDragEnter = (event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragActive(true);
    };

    const handleDragOver = (event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDragActive(true);
    };

    const handleDragLeave = (event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragActive(false);
      }
    };

    const handleDrop = async (event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragActive(false);
      await handleDroppedFiles(Array.from(event.dataTransfer?.files ?? []));
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDroppedFiles, isFileDragEvent]);

  const handleSendTextMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) {
      return;
    }

    let contentType;
    if (trimmedMessage) {
      contentType = 0;
    } else if (selectedFile) {
      contentType = 1;
    }

    const sendMessageDto = {
      ContentType: contentType,
      Content: trimmedMessage || null,
      ReplyToMessageId: replyMessage?.id ?? null,
      ThumbnailUrl: "",
    };

    const chatType = getActiveChatType();

    try {
      const encryptedMessage = encryptMessage(trimmedMessage, chatId);
      await sendTextMessage({
        chatId,
        chatType,
        encryptedContent: encryptedMessage,
        replyToMessageId: sendMessageDto.ReplyToMessageId,
        thumbnailUrl: sendMessageDto.ThumbnailUrl,
      });

      stopTyping();
      setMessage("");
      setSelectedFile(null);
      onClearReply?.();
    } catch (err) {
      console.error("پیام ارسال نشد:", err);
      ErrorAlert("پیام ارسال نشد");
    }
  }, [message, selectedFile, replyMessage?.id, getActiveChatType, chatId, onClearReply, stopTyping]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendTextMessage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSendTextMessage]);

  return (
    <div className="message-input-bar">
      {isDragActive && (
        <div className="file-drop-overlay" aria-hidden="true">
          <div className="file-drop-card">
            <LuFileUp />
            <strong>فایل را رها کنید</strong>
            <span>تصویر، ویدیو یا فایل معمولی همین‌جا ارسال می‌شود.</span>
          </div>
        </div>
      )}

      {replyMessage && (
        <div className="reply-composer-box">
          <div className="reply-composer-content">
            <span className="reply-composer-title">
              {resolveReplySenderLabel(replyMessage)} پاسخ به 
            </span>
            <span className="reply-composer-text">
              {resolveReplyPreviewText(replyMessage)}
            </span>
          </div>
          <button
            type="button"
            className="reply-composer-close"
            onClick={() => onClearReply?.()}
            aria-label="Clear reply"
          >
            <IoClose />
          </button>
        </div>
      )}

      <div className="input-box">
        <div className="add-file-box">
          <button
            ref={addFileButtonRef}
            className="add-file-button"
            onClick={() => setShowFileMenu(!isShowFileMenu)}
            type="button"
          >
            <HiPlus />
          </button>

          {isShowFileMenu && (
            <div className="file-menu" ref={fileMenuRef}>
              <button onClick={handleFileSelect} type="button">
                <LuFileUp />
              </button>
              <button onClick={handleImageSelect} type="button">
                <LuImage />
              </button>
              <button onClick={handleSoundRecord} type="button">
                <BiSolidMicrophone />
              </button>
              <button onClick={handleVideoSelect} type="button">
                <LuFileVideo />
              </button>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileImageInputRef}
            style={{ display: "none" }}
            onChange={handleSendImageFile}
          />

          <input
            type="file"
            accept="video/*"
            multiple
            ref={fileVideoInputRef}
            style={{ display: "none" }}
            onChange={handleSendVideoFile}
          />
          <input
            type="file"
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.zip,.rar,.7z,.txt,.mp3,.wav,.ogg,.apk,.mkv,.npvt"
            multiple
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleSendFile}
          />
        </div>

        <input
          type="text"
          placeholder="پیامی بنویسید"
          value={message}
          onChange={handleInputChange}
          onBlur={stopTyping}
        />

        <div className="ai-emoji-send-buttons">
          <button 
            className="add-emoji-button" 
            onClick={toggleEmojiPicker}
            type="button"
          >
            <MdOutlineEmojiEmotions />
          </button>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="emoji-picker">
              <EmojiPicker
                theme={user?.userSettings?.theme === "Dark" ? "dark" : "light"}
                onEmojiClick={handleEmojiClick}
                emojiStyle="native"
                style={{
                  backgroundColor: user?.userSettings?.theme === "Dark" ? "#141414" : "#ffffff",
                  borderRadius: "23px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              />
            </div>
          )}
          <button 
            onClick={handleSendTextMessage} 
            className="send-message-button rotate-180"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 27 27" fill="none" className="">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.82724 7.50691C3.53474 4.88116 6.23812 2.95291 8.62649 4.08466L22.0635 10.4499C24.6375 11.6683 24.6375 15.3313 22.0635 16.5497L8.62649 22.916C6.23812 24.0478 3.53587 22.1195 3.82724 19.4938L4.36724 14.6248H13.5C13.7984 14.6248 14.0845 14.5063 14.2955 14.2953C14.5065 14.0843 14.625 13.7982 14.625 13.4998C14.625 13.2014 14.5065 12.9153 14.2955 12.7043C14.0845 12.4933 13.7984 12.3748 13.5 12.3748H4.36837L3.82724 7.50691Z"
                fill="white"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

MessageInputBar.propTypes = {
  chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  replyMessage: PropTypes.shape({
    id: PropTypes.string,
    senderId: PropTypes.string,
    senderName: PropTypes.string,
    type: PropTypes.number,
    content: PropTypes.string,
    fileName: PropTypes.string,
  }),
  onClearReply: PropTypes.func,
};

MessageInputBar.defaultProps = {
  replyMessage: null,
  onClearReply: null,
};

export default MessageInputBar;
