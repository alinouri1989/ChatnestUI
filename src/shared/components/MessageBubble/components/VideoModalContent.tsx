// @ts-nocheck
import PropTypes from "prop-types";
import { NestCloseIcon } from "../../BrandIcons/BrandIcons";
import "../VideoMessage.scss";

export function VideoModalContent({ videoUrl, onClose }) {
    const stopPropagation = (e) => e.stopPropagation();

    return (
        <div className="video-modal-inner" onClick={stopPropagation}>
            <video
                src={videoUrl}
                controls
                autoPlay
                style={{
                    maxWidth: "90vw",
                    maxHeight: "80vh",
                    borderRadius: "8px",
                }}
            >
                مرورگر شما از عنصر ویدیو پشتیبانی نمی‌کند.
            </video>

            <button
                className="close-modal-btn"
                onClick={onClose}
                type="button"
                aria-label="بستن مودال"
            >
                <NestCloseIcon />
            </button>
        </div>
    );
};

VideoModalContent.propTypes = {
    videoUrl: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};

