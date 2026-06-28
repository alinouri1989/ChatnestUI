// @ts-nocheck
// VideoMessage.jsx
import PropTypes from "prop-types";
import { useModal } from "../../../../contexts/ModalContext";   // مسیر بسته به ساختار پروژه
import { defaultVideoPlaceholder } from "../../../../constants/DefaultProfilePhoto";
import { VideoModalContent } from "./VideoModalContent"
import "../VideoMessage.scss";

export function VideoMessage({ content, thumbnailUrl }) {
  const { showModal, closeModal } = useModal();

  // رفع مسیرهای احتمالی که با %5C ( backslash ) ساخته شده‌اند
  const safeThumb = thumbnailUrl;
  const safeVideo = content;

  const openVideoModal = () => {
    // محتوای مدال را با کامپوننت VideoModalContent می‌سازیم
    // console.log("click");

    showModal(
      <VideoModalContent videoUrl={safeVideo} onClose={closeModal} />
    );
  };

  return (
    <>
      <img
        src={safeThumb || defaultVideoPlaceholder}
        alt="پیش‌نمایش ویدیو"
        className="video-thumbnail"
        onClick={() => {
          // console.log('✅ IMAGE CLICKED');
          openVideoModal();
        }}
        style={{
          cursor: "pointer",
          maxWidth: "300px",
          borderRadius: "8px",
          pointerEvents: "auto",
          display: "block",
        }}
      />
    </>
  );
};

VideoMessage.propTypes = {
  content: PropTypes.string.isRequired,
  thumbnailUrl: PropTypes.string,
};
