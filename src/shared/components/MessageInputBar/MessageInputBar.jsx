import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
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
import { SiGooglegemini } from "react-icons/si";

import ImageModal from "../ImageModal/ImageModal";
import SoundRecordModal from "../SoundRecordModal/SoundRecordModal";
import { AIModal } from "../AIModal/AIModal";

import { encryptMessage } from "../../../helpers/messageCryptoHelper";
import { convertFileToBase64WithAsArrayBuffer } from "../../../store/helpers/convertFileToBase64";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";

import PreLoader from "../PreLoader/PreLoader";
import "./style.scss";

function MessageInputBar({ chatId }) {
  const location = useLocation();
  const { showModal, closeModal } = useModal();
  const { chatConnection } = useSignalR();
  const { user } = useSelector((state) => state.auth);

  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isShowFileMenu, setShowFileMenu] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const emojiPickerRef = useRef(null);
  const AIButtonRef = useRef(null);
  const fileImageInputRef = useRef(null);
  const fileVideoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileMenuRef = useRef(null);
  const addFileButtonRef = useRef(null);
  const uploadProgressTimeoutRef = useRef(null);

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

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

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
    showModal(<SoundRecordModal closeModal={closeModal} chatId={chatId} />);
  };

  const handleSendVideoFile = async (e) => {
    const file = e.target.files?.[0];
    const chatType = getActiveChatType();

    if (file) {
      startUploadProgress(file.name);
      setIsLoading(true);
      try {
        const base64String = await convertFileToBase64WithAsArrayBuffer(file, (percent) => {
          updateUploadProgress(percent, "Preparing file...");
        });
        updateUploadProgress(95, "Sending...");
        await chatConnection.invoke("SendMessage", chatType, chatId, {
          ContentType: 2,
          content: base64String,
        });
        finishUploadProgress();
        SuccessAlert("ویدیو ارسال شد");
      } catch {
        resetUploadProgress();
        ErrorAlert("ویدیو ارسال نشد");
      }
      setIsLoading(false);
      e.target.value = "";
    } else {
      ErrorAlert("هیچ فایلی انتخاب نشده");
    }
  };

  const handleSendImageFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      showModal(<ImageModal closeModal={closeModal} image={file} chatId={chatId} />);
    }

    e.target.value = "";
  };

  const handleSendFile = async (e) => {
    const file = e.target.files?.[0];
    const chatType = getActiveChatType();

    if (!file) {
      ErrorAlert("هیچ فایلی انتخاب نشده");
      return;
    }

    try {
      startUploadProgress(file.name);
      setIsLoading(true);
      const base64String = await convertFileToBase64WithAsArrayBuffer(file, (percent) => {
        updateUploadProgress(percent, "Preparing file...");
      });
      updateUploadProgress(95, "Sending...");

      await chatConnection.invoke("SendMessage", chatType, chatId, {
        ContentType: 4,
        FileName: file.name,
        content: base64String,
      });

      finishUploadProgress();
      setIsLoading(false);
    } catch (error) {
      resetUploadProgress();
      setIsLoading(false);
      if (error?.message === "empty_file") {
        ErrorAlert("فایل با محتوای خالی قابل ارسال نیست");
      } else {
        ErrorAlert("فایل ارسال نشد");
      }
    }
  };

  const handleSendTextMessage = useCallback(async () => {
    if (isAIModalOpen) {
      return;
    }
    setMessage("");
    if (!message && !selectedFile) {
      return;
    }

    let contentType;
    if (message) {
      contentType = 0;
    } else if (selectedFile) {
      contentType = 1;
    }

    const sendMessageDto = {
      ContentType: contentType,
      Content: message || null,
    };

    const chatType = getActiveChatType();

    try {
      const encryptedMessage = encryptMessage(message, chatId);
      await chatConnection.invoke("SendMessage", chatType, chatId, {
        ...sendMessageDto,
        content: encryptedMessage,
      });

      setSelectedFile(null);
    } catch (err) {
      console.error("پیام ارسال نشد:", err);
      ErrorAlert("پیام ارسال نشد");
    }
  }, [isAIModalOpen, message, selectedFile, getActiveChatType, chatId, chatConnection]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isAIModalOpen) return;

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendTextMessage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAIModalOpen, handleSendTextMessage]);

  return (
    <div className="message-input-bar">
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
            ref={fileImageInputRef}
            style={{ display: "none" }}
            onChange={handleSendImageFile}
          />

          <input
            type="file"
            accept="video/*"
            ref={fileVideoInputRef}
            style={{ display: "none" }}
            onChange={handleSendVideoFile}
          />
          <input
            type="file"
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.zip,.rar,.7z,.txt,.mp3,.wav,.ogg"
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
        />

        <div className="ai-emoji-send-buttons">
          <AIModal
            chatConnection={chatConnection}
            chatId={chatId}
            isOpen={isAIModalOpen}
            onClose={() => setIsAIModalOpen(false)}
            buttonRef={AIButtonRef}
          />

          <button
            ref={AIButtonRef}
            onClick={() => setIsAIModalOpen(!isAIModalOpen)}
            className="ai-button"
            type="button"
          >
            <SiGooglegemini />
          </button>

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
            className="send-message-button"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 27 27" fill="none">
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
      {uploadProgress && (
        <div className="upload-progress-box">
          <div className="upload-progress-header">
            <span className="upload-progress-file" title={uploadProgress.fileName}>
              {uploadProgress.fileName}
            </span>
            <span className="upload-progress-percent">{uploadProgress.percent}%</span>
          </div>
          <div
            className="upload-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress.percent}
            aria-label="File upload progress"
          >
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
          <div className="upload-progress-status">{uploadProgress.status}</div>
        </div>
      )}
      {isLoading && !uploadProgress && <PreLoader />}
    </div>
  );
}

MessageInputBar.propTypes = {
  chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default MessageInputBar;
