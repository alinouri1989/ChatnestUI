import { useState } from "react";
import { useSignalR } from "../../../contexts/SignalRContext";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";

import { FaImages } from "react-icons/fa6";
import CloseModalButton from "../../../contexts/components/CloseModalButton";
import PreLoader from "../PreLoader/PreLoader";

import { ErrorAlert } from "../../../helpers/customAlert";
import { convertFileToBase64 } from "../../../store/helpers/convertFileToBase64";
import {
  addPendingUpload,
  markPendingUploadSent,
  removePendingUpload,
  updatePendingUpload,
} from "../../../store/Slices/chats/pendingUploadsSlice";
import {
  registerPendingUploadAbortController,
  unregisterPendingUploadAbortController,
} from "../../upload/pendingUploadAbortRegistry";
import "./style.scss";

function ImageModal({ image, closeModal, chatId }) {
  const { chatConnection } = useSignalR();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendImage = async () => {
    let chatType = "";
    if (location.pathname.includes("chats") || location.pathname.includes("archives")) {
      chatType = "Individual";
    } else if (location.pathname.includes("groups")) {
      chatType = "Group";
    }

    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const abortController = new AbortController();

    dispatch(
      addPendingUpload({
        id: pendingId,
        chatId,
        chatType,
        contentType: 1,
        fileName: image?.name || "image",
        fileSize: image?.size || 0,
        previewUrl: URL.createObjectURL(image),
        progress: 0,
        phase: "preparing",
        statusText: "در حال آماده سازی...",
        createdAt: new Date().toISOString(),
      })
    );
    registerPendingUploadAbortController(pendingId, abortController);

    try {
      setIsLoading(true);

      const base64String = await convertFileToBase64(image, (percent) => {
        dispatch(
          updatePendingUpload({
            id: pendingId,
            changes: {
              progress: percent,
              phase: "preparing",
              statusText: "در حال آماده سازی...",
            },
          })
        );
      }, { signal: abortController.signal });

      dispatch(
        updatePendingUpload({
          id: pendingId,
          changes: {
            progress: 95,
            phase: "sending",
            statusText: "در حال ارسال...",
          },
        })
      );

      await chatConnection.invoke("SendMessage", chatType, chatId, {
        ContentType: 1,
        ClientMessageId: pendingId,
        content: base64String,
        FileName: image.name,
      });
      dispatch(markPendingUploadSent(pendingId));
      setTimeout(() => {
        dispatch(removePendingUpload(pendingId));
      }, 900);

      closeModal();
    } catch (error) {
      if (error?.name === "AbortError") {
        dispatch(
          updatePendingUpload({
            id: pendingId,
            changes: { phase: "cancelled", statusText: "لغو شد" },
          })
        );
        setTimeout(() => {
          dispatch(removePendingUpload(pendingId));
        }, 450);
      } else {
        dispatch(removePendingUpload(pendingId));
        ErrorAlert("خطایی رخ داده است");
      }
    } finally {
      unregisterPendingUploadAbortController(pendingId);
      setIsLoading(false);
    }
  };

  return (
    <div className="image-modal-box">
      <CloseModalButton closeModal={closeModal} />
      <div className="title-box">
        <FaImages />
        <p>تصویر انتخاب شده</p>
      </div>
      <img src={URL.createObjectURL(image)} alt="پیش‌ نمایش تصویر آپلود شده" />
      <button onClick={handleSendImage} className="send-image-btn">
        ارسال
      </button>

      {isLoading && <PreLoader />}
    </div>
  );
}

ImageModal.propTypes = {
  image: PropTypes.instanceOf(File).isRequired,
  closeModal: PropTypes.func.isRequired,
  chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default ImageModal;

