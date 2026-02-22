import { useState } from "react";
import { useSignalR } from "../../../contexts/SignalRContext";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";

import { FaImages } from "react-icons/fa6";
import CloseModalButton from "../../../contexts/components/CloseModalButton";
import PreLoader from "../PreLoader/PreLoader";

import { ErrorAlert } from "../../../helpers/customAlert";
import "./style.scss";

function ImageModal({ image, closeModal, chatId }) {
  const { chatConnection } = useSignalR();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const readImageAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("invalid_file"));
          return;
        }

        const base64String = reader.result.split(",")[1];
        if (!base64String) {
          reject(new Error("empty_file"));
          return;
        }

        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSendImage = async () => {
    let chatType = "";
    if (location.pathname.includes("chats") || location.pathname.includes("archives")) {
      chatType = "Individual";
    } else if (location.pathname.includes("groups")) {
      chatType = "Group";
    }

    try {
      setIsLoading(true);

      const base64String = await readImageAsBase64(image);

      await chatConnection.invoke("SendMessage", chatType, chatId, {
        ContentType: 1,
        content: base64String,
        FileName: image.name,
      });

      closeModal();
    } catch {
      ErrorAlert("خطایی رخ داده است");
    } finally {
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