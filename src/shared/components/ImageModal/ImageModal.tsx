// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";

import { FaImages } from "react-icons/fa6";
import CloseModalButton from "../../../contexts/components/CloseModalButton";
import PreLoader from "../PreLoader/PreLoader";

import { ErrorAlert } from "../../../helpers/customAlert";
import { sendFileMessageInChunks } from "../../upload/sendFileMessageInChunks";
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

function ImageModal({ image, images, closeModal, chatId, replyMessage, onReplySent }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedImages = useMemo(
    () => (images?.length ? images : image ? [image] : []),
    [image, images]
  );

  const imagePreviews = useMemo(
    () =>
      selectedImages.map((selectedImage) => ({
        file: selectedImage,
        url: URL.createObjectURL(selectedImage),
      })),
    [selectedImages]
  );

  const activePreview = imagePreviews[activeIndex] ?? imagePreviews[0];

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const resolveChatType = () => {
    if (location.pathname.includes("chats") || location.pathname.includes("archives")) {
      return "Individual";
    }

    if (location.pathname.includes("groups")) {
      return "Group";
    }

    return "";
  };

  const handleUploadError = (pendingId, error) => {
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
      return;
    }

    dispatch(removePendingUpload(pendingId));
    throw error;
  };

  const uploadImage = async (selectedImage, chatType) => {
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const abortController = new AbortController();
    const previewUrl = URL.createObjectURL(selectedImage);

    dispatch(
      addPendingUpload({
        id: pendingId,
        chatId,
        chatType,
        contentType: 1,
        fileName: selectedImage?.name || "image",
        fileSize: selectedImage?.size || 0,
        previewUrl,
        progress: 0,
        phase: "preparing",
        statusText: "در حال آماده سازی...",
        createdAt: new Date().toISOString(),
      })
    );
    registerPendingUploadAbortController(pendingId, abortController);

    try {
      dispatch(
        updatePendingUpload({
          id: pendingId,
          changes: {
            progress: 1,
            phase: "sending",
            statusText: "در حال بارگزاری...",
          },
        })
      );

      await sendFileMessageInChunks({
        chatType,
        chatId,
        contentType: 1,
        file: selectedImage,
        fileName: selectedImage.name,
        clientMessageId: pendingId,
        replyToMessageId: replyMessage?.id ?? null,
        signal: abortController.signal,
        onProgress: ({ percent }) => {
          dispatch(
            updatePendingUpload({
              id: pendingId,
              changes: {
                progress: percent,
                phase: "sending",
                statusText: "در حال بارگزاری...",
              },
            })
          );
        },
      });

      dispatch(markPendingUploadSent(pendingId));
      setTimeout(() => {
        dispatch(removePendingUpload(pendingId));
        URL.revokeObjectURL(previewUrl);
      }, 900);
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      handleUploadError(pendingId, error);
    } finally {
      unregisterPendingUploadAbortController(pendingId);
    }
  };

  const handleSendImage = async () => {
    if (selectedImages.length === 0) {
      return;
    }

    try {
      setIsLoading(true);

      const chatType = resolveChatType();
      for (const selectedImage of selectedImages) {
        await uploadImage(selectedImage, chatType);
      }

      onReplySent?.();
      closeModal();
    } catch (error) {
      if (error?.name !== "AbortError") {
        ErrorAlert("خطایی رخ داده است");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="image-modal-box">
      <CloseModalButton closeModal={closeModal} />
      <div className="title-box">
        <FaImages />
        <p>{selectedImages.length > 1 ? `${selectedImages.length} تصویر انتخاب شده` : "تصویر انتخاب شده"}</p>
      </div>

      {activePreview && (
        <img src={activePreview.url} alt="پیش‌ نمایش تصویر آپلود شده" />
      )}

      {imagePreviews.length > 1 && (
        <div className="image-preview-list">
          {imagePreviews.map((preview, index) => (
            <button
              key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
              type="button"
              className={index === activeIndex ? "active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`Image ${index + 1}`}
            >
              <img src={preview.url} alt="" />
            </button>
          ))}
        </div>
      )}

      <button onClick={handleSendImage} className="send-image-btn" disabled={isLoading}>
        ارسال
      </button>

      {isLoading && <PreLoader />}
    </div>
  );
}

ImageModal.propTypes = {
  image: PropTypes.instanceOf(File),
  images: PropTypes.arrayOf(PropTypes.instanceOf(File)),
  closeModal: PropTypes.func.isRequired,
  chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  replyMessage: PropTypes.shape({
    id: PropTypes.string,
  }),
  onReplySent: PropTypes.func,
};

ImageModal.defaultProps = {
  image: null,
  images: [],
  replyMessage: null,
  onReplySent: null,
};

export default ImageModal;
