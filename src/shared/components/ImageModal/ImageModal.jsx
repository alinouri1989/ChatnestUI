import { useState } from "react";
import { useSignalR } from "../../../contexts/SignalRContext";
import { useLocation } from "react-router-dom";
import PropTypes from 'prop-types';

import { FaImages } from "react-icons/fa6";
import CloseModalButton from "../../../contexts/components/CloseModalButton";
import PreLoader from "../PreLoader/PreLoader";

import { ErrorAlert } from "../../../helpers/customAlert";
import "./style.scss";

function ImageModal({ image, closeModal, chatId }) {

    const { chatConnection } = useSignalR();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);

    const handleSendImage = async () => {
        let chatType = '';
        if (location.pathname.includes('chats') || location.pathname.includes('archives')) {
            chatType = 'Individual';
        } else if (location.pathname.includes('groups')) {
            chatType = 'Group';
        }

        try {
            setIsLoading(true);

            const reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onloadend = async () => {
                const base64Image = reader.result;
                const base64String = base64Image.split(',')[1];

                await chatConnection.invoke("SendMessage", chatType, chatId, {
                    ContentType: 1,
                    content: base64String,
                });

                setIsLoading(false);
                closeModal();
            };
        } catch {
            ErrorAlert("خطایی رخ داده است");
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
            <img src={URL.createObjectURL(image)} alt="پیش‌نمایش تصویر آپلود شده" />
            <button onClick={handleSendImage} className="send-image-btn">ارسال</button>

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