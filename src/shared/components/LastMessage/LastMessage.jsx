import { LuImage } from 'react-icons/lu';
import { BiSolidMicrophone } from 'react-icons/bi';
import { LuFileVideo } from "react-icons/lu";
import { NestFileIcon } from "../BrandIcons/BrandIcons.jsx";
import PropTypes from 'prop-types';

const LastMessage = ({ lastMessageType, content }) => {
    const renderContent = () => {
        switch (lastMessageType) {
            case 0:
                return <span>{content}</span>;
            case 1:
                return (
                    <div className="last-message-image">
                        <LuImage />
                        <span>عکس</span>
                    </div>
                );
            case 2:
                return (
                    <div className="last-message-video">
                        <LuFileVideo />
                        <span>ویدیو</span>
                    </div>
                );
            case 3:
                return (
                    <div className="last-message-audio">
                        <BiSolidMicrophone />
                        <span>صدا</span>
                    </div>
                );
            case 4:
                return (
                    <div className="last-message-file">
                        <NestFileIcon />
                        <span>فایل</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return <>{renderContent()}</>;
};

LastMessage.propTypes = {
    lastMessageType: PropTypes.number.isRequired,
    content: PropTypes.string,
};

LastMessage.defaultProps = {
    content: '',
};

export default LastMessage;
