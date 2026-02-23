import PropTypes from "prop-types";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { BiSolidMicrophone } from "react-icons/bi";
import { LuFile, LuFileVideo, LuImage, LuX } from "react-icons/lu";

import {
  removePendingUpload,
  updatePendingUpload,
} from "../../../store/Slices/chats/pendingUploadsSlice";
import { abortPendingUpload } from "../../upload/pendingUploadAbortRegistry";
import "./style.scss";

const CIRCLE_RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const formatFileSize = (fileSize = 0) => {
  if (!fileSize) return "";
  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
};

function PendingUploadBubble({ item }) {
  const dispatch = useDispatch();
  const progress = Math.max(0, Math.min(100, Math.round(item.progress ?? 0)));
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
  const isSent = item.phase === "sent";
  const isCancelled = item.phase === "cancelled";
  const canCancel = item.phase === "preparing";

  useEffect(() => {
    return () => {
      if (item?.previewUrl && typeof item.previewUrl === "string" && item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [item?.previewUrl]);

  const handleCancel = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const aborted = abortPendingUpload(item.id);
    if (!aborted) {
      // If upload is already in a non-abortable stage, keep current state.
      return;
    }

    dispatch(
      updatePendingUpload({
        id: item.id,
        changes: {
          phase: "cancelled",
          statusText: "لغو شد",
        },
      })
    );

    setTimeout(() => {
      dispatch(removePendingUpload(item.id));
    }, 450);
  };

  const getTypeIcon = () => {
    switch (item.contentType) {
      case 1:
        return <LuImage />;
      case 2:
        return <LuFileVideo />;
      case 3:
        return <BiSolidMicrophone />;
      default:
        return <LuFile />;
    }
  };

  return (
    <div className="pending-upload-bubble-box">
      <div className="pending-upload-bubble">
        {(item.contentType === 1 || item.contentType === 2) && item.previewUrl ? (
          <div className="pending-upload-preview" aria-hidden="true">
            {item.contentType === 1 ? (
              <img src={item.previewUrl} alt="" />
            ) : (
              <video src={item.previewUrl} muted preload="metadata" />
            )}
            {item.contentType === 2 && <span className="video-badge">Video</span>}
          </div>
        ) : null}

        <div className="pending-upload-progress-circle">
          <svg viewBox="0 0 44 44">
            <circle className="track" cx="22" cy="22" r={CIRCLE_RADIUS} />
            <circle
              className="indicator"
              cx="22"
              cy="22"
              r={CIRCLE_RADIUS}
              style={{
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset: dashOffset,
              }}
            />
          </svg>
          <div className={`center ${isSent ? "sent" : ""}`}>
            {isSent ? getTypeIcon() : <span>{progress}</span>}
          </div>
          {canCancel && (
            <button
              type="button"
              className="cancel-upload-button"
              onClick={handleCancel}
              aria-label="Cancel upload"
              title="Cancel"
            >
              <LuX />
            </button>
          )}
        </div>

        <div className="pending-upload-meta">
          <p className="file-name" title={item.fileName}>
            {item.fileName || "فایل"}
          </p>
          <div className="file-subtitle">
            <span>{item.statusText || "در حال ارسال..."}</span>
            {item.fileSize ? <span>{formatFileSize(item.fileSize)}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

PendingUploadBubble.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    fileName: PropTypes.string,
    fileSize: PropTypes.number,
    progress: PropTypes.number,
    phase: PropTypes.string,
    statusText: PropTypes.string,
    contentType: PropTypes.number,
    previewUrl: PropTypes.string,
  }).isRequired,
};

export default PendingUploadBubble;
