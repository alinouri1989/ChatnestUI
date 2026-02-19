import { useEffect, useState } from 'react';
import { useSignalR } from '../../../contexts/SignalRContext';
import { useSelector } from 'react-redux';
import { useModal } from '../../../contexts/ModalContext';
import PropTypes from 'prop-types';

import { FaFileAlt } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { MdClose } from 'react-icons/md';
import { LuCheck } from "react-icons/lu";
import { LuCheckCheck } from "react-icons/lu";
import { FaEarthAfrica } from "react-icons/fa6";

import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

import { ErrorAlert, SuccessAlert } from '../../../helpers/customAlert';
import { downloadFile } from '../../../helpers/downloadFile';
import { AudioMessage } from './components/AudioMessage';

import MessageInfo from '../MessageInfo/MessageInfo';
import useScreenWidth from '../../../hooks/useScreenWidth';

import './style.scss';
import { defaultProfilePhoto } from '../../../constants/DefaultProfilePhoto';

function MessageBubble({
    isDeleted,
    chatId,
    userId,
    messageId,
    userColor,
    content,
    fileName,
    fileSize,
    timestamp,
    isSender,
    status,
    messageType,
    isGroupMessageBubble,
    senderProfile
}) {


    const { chatConnection } = useSignalR();

    const { Group } = useSelector((state) => state.chat);
    const { groupList } = useSelector((state) => state.groupList);
    const { user } = useSelector(state => state.auth);

    const [isShowImage, setIsShowImage] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const { showModal, closeModal } = useModal();
    const isSmallScreen = useScreenWidth(400);
    if (!content || isDeleted) {
        return null;
    }

    const isDarkMode = user?.userSettings?.theme === "Dark";

    const open = Boolean(anchorEl);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleDelete = (deletionType) => {
        let chatType;
        if (isGroupMessageBubble) {
            chatType = "Group";
        }
        else {
            chatType = "Individual";
        }
        try {
            chatConnection.invoke("DeleteMessage", chatType, chatId, messageId, deletionType);
            SuccessAlert("پیام حذف شد");
        } catch {
            ErrorAlert("خطایی رخ داده است");
        }
        handleClose();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        SuccessAlert("پیام کپی شد");
        handleClose();
    };

    const handleMessageInfo = () => {
        showModal(<MessageInfo chatId={chatId} messageId={messageId} closeModal={closeModal} />);
        handleClose();
    };

    let statusIcon;
    let statusColor;

    const groupIdFromLocation = window.location.pathname.includes("groups")
        ? window.location.pathname.split('/')[2]
        : null;

    if (!isGroupMessageBubble) {
        if (status.read && Object.keys(status.read).length > 0) {
            statusIcon = <LuCheckCheck />;
            statusColor = "#585CE1";
        } else if (status.delivered && Object.keys(status.delivered).length > 0) {
            statusIcon = <LuCheckCheck />;
            statusColor = "#828A96";
        } else if (status.sent && status.sent[userId]) {
            statusIcon = <LuCheck />;
            statusColor = "#828A96";
        } else {
            statusIcon = <FaEarthAfrica />;
            statusColor = "#828A96";
        }
    } else {
        const chatGroup = Group.find(group => group.id === groupIdFromLocation);
        if (chatGroup) {
            const participantKeys = chatGroup.participants;
            const groupInfo = groupList[participantKeys];
            const groupParticipants = groupInfo?.participants || {};

            const totalParticipants = Object.keys(groupParticipants).length;
            const readCount = Object.keys(status.read || {}).filter(userId =>
                Object.keys(groupParticipants).includes(userId)
            ).length;

            const deliverCount = Object.keys(status.delivered || {}).filter(userId =>
                Object.keys(groupParticipants).includes(userId)
            ).length;

            if (readCount === totalParticipants - 1) {
                statusIcon = <LuCheckCheck />;
                statusColor = "#585CE1";
            } else if (deliverCount === totalParticipants - 1) {
                statusIcon = <LuCheckCheck />;
                statusColor = "#828A96";
            } else if (status.sent && status.sent[userId]) {
                statusIcon = <LuCheck />;
                statusColor = "#828A96";
            } else {
                statusIcon = <FaEarthAfrica />;
                statusColor = "#828A96";
            }
        } else {
            statusIcon = <FaEarthAfrica />;
            statusColor = "#828A96";
        }
    }

    const TextMessage = ({ content }) => <p className='text-content'>{content}</p>;

    const ImageMessage = ({ content }) => (
        <div onClick={() => setIsShowImage(true)}>
            <img src={content} alt="پیام تصویری" />
        </div>
    );

    const VideoMessage = ({ content }) => (
        <div>
            <video
                src={content}
                controls
                style={{ maxWidth: "100%", borderRadius: "8px" }}
            >
                مرورگر شما از عنصر ویدیو پشتیبانی نمی‌کند.
            </video>
        </div>
    );

    const FileMessage = () => {
        return (
            <div className="file-message-container">
                <div className='file-info-box'>
                    <FaFileAlt />
                    <div className='file-info'>
                        <span>{fileName || "فایل"}</span>
                        <p>
                            {fileSize < 1024 * 1024
                                ? `${(fileSize / 1024).toFixed(2)} KB`
                                : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`}
                        </p>
                    </div>
                </div>
                <button
                    className='download-file-button'
                    onClick={() => downloadFile(fileName, content)}
                    type="button"
                >
                    <FiDownload />
                </button>
            </div>
        );
    };

    const UserInfo = ({ displayName, userColor, messageType }) => (
        <div className='user-info' style={{ color: userColor }}>
            {messageType === 3 && isGroupMessageBubble && <img src={senderProfile?.profilePhoto ?? defaultProfilePhoto} alt="پروفایل فرستنده" />}
            <p className={`sender-profile-name ${messageType === 0 ? 'text' : messageType === 1 ? 'image' : 'other'}`}>
                {displayName}
            </p>
        </div>
    );

    const renderMessageContent = (messageType, content) => {
        switch (messageType) {
            case 0:
                return <TextMessage content={content} />;
            case 1:
                return <ImageMessage content={content} />;
            case 2:
                return <VideoMessage content={content} />;
            case 3:
                return <AudioMessage content={content} />;
            case 4:
                return <FileMessage />;
            default:
                return <p>نوع پیام پشتیبانی نشده</p>;
        }
    };

    const getMessageContentClass = (messageType, isGroupMessageBubble, isSender) => {
        switch (messageType) {
            case 0:
                return 'text';
            case 2:
                if (isGroupMessageBubble && isSender) return 'group-sender';
                if (isGroupMessageBubble) return 'group';
                return 'video';
            case 3:
                if (isGroupMessageBubble && isSender) return 'group-sender';
                if (isGroupMessageBubble) return 'group';
                return 'audio';
            case 4:
                if (isGroupMessageBubble && isSender) return 'group-sender';
                if (isGroupMessageBubble) return 'group';
                return 'file';
            default:
                return 'image';
        }
    };

    return (
        <div className="message-bubble-box">
            <div className={`message-box ${isSender ? 'sender' : 'receiver'}`} >
                {isGroupMessageBubble && !isSender && (!isSmallScreen || messageType !== 3) && (
                    <div className='image-box'>
                        <img src={senderProfile?.profilePhoto ?? defaultProfilePhoto}
                            onError={(e) => e.currentTarget.src = defaultProfilePhoto}
                            alt="پروفایل فرستنده" />
                    </div>
                )}
                <div
                    className={`message-content ${getMessageContentClass(
                        messageType,
                        isGroupMessageBubble,
                        isSender
                    )}`}
                >
                    {!isSender && (
                        <UserInfo
                            displayName={senderProfile?.displayName}
                            userColor={userColor}
                            messageType={messageType}
                        />
                    )}

                    {renderMessageContent(messageType, content)}
                </div>

                <div className='message-hour-and-option-box'>
                    <div className='message-hour'>
                        {timestamp}
                    </div>
                    {isSender && (
                        <div className='option'>
                            <IconButton
                                aria-label="more"
                                id="long-button"
                                aria-controls={open ? "long-menu" : undefined}
                                aria-expanded={open ? "true" : undefined}
                                aria-haspopup="true"
                                onClick={handleClick}
                                sx={{
                                    color: isDarkMode ? "#616161" : "#707070",
                                }}
                            >
                                <MoreHorizIcon />
                            </IconButton>

                            <Menu
                                id="long-menu"
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleClose}
                                MenuListProps={{
                                    "aria-labelledby": "long-button",
                                }}
                                slotProps={{
                                    paper: {
                                        style: {
                                            width: "18ch",
                                            borderRadius: "8px",
                                            border: `4px solid ${isDarkMode ? "#222430" : "#CFD5F2"}`,
                                            fontWeight: "bold",
                                            backgroundColor: isDarkMode ? "#18191A" : "#FFFFFF",
                                            color: isDarkMode ? "#E4E6EB" : "#000000",
                                            boxShadow: "none",
                                        },
                                    },
                                }}
                            >
                                <MenuItem
                                    onClick={() => handleDelete(0)}
                                    sx={{ color: "#EB6262" }}
                                >
                                    <ListItemIcon sx={{ color: "inherit" }}>
                                        <DeleteOutlineRoundedIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="از من حذف کن"
                                        primaryTypographyProps={{
                                            fontFamily: "Montserrat",
                                            fontWeight: "700",
                                            fontSize: "14px",
                                        }}
                                    />
                                </MenuItem>

                                <MenuItem
                                    onClick={() => handleDelete(1)}
                                    sx={{ color: "#EB6262" }}
                                >
                                    <ListItemIcon sx={{ color: "inherit" }}>
                                        <DeleteIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="از همه حذف کن"
                                        primaryTypographyProps={{
                                            fontFamily: "Montserrat",
                                            fontWeight: "700",
                                            fontSize: "14px",
                                        }}
                                    />
                                </MenuItem>

                                {messageType === 0 &&
                                    <MenuItem
                                        onClick={handleCopy}
                                        sx={{ color: "#585CE1" }}
                                    >
                                        <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                                            <ContentCopyIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="کپی"
                                            primaryTypographyProps={{
                                                fontFamily: "Montserrat",
                                                fontWeight: "700",
                                                fontSize: "14px",
                                            }}
                                        />
                                    </MenuItem>
                                }

                                {isGroupMessageBubble &&
                                    <MenuItem
                                        onClick={handleMessageInfo}
                                        sx={{ color: "#585CE1" }}
                                    >
                                        <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                                            <InfoIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="اطلاعات"
                                            primaryTypographyProps={{
                                                fontFamily: "Montserrat",
                                                fontWeight: "700",
                                                fontSize: "14px",
                                            }}
                                        />
                                    </MenuItem>
                                }
                            </Menu>
                        </div>
                    )}
                </div>
            </div>
            {
                isSender && (
                    <div className='status-box' style={{ color: statusColor }}>
                        {statusIcon}
                    </div>
                )
            }
            {
                isShowImage &&
                <div className="full-size-image-box">
                    <img src={content} alt="تصویر انتخاب شده" />
                    <button onClick={() => setIsShowImage(false)} type="button">
                        <MdClose />
                    </button>
                </div>
            }
        </div>
    );
}

MessageBubble.propTypes = {
    isDeleted: PropTypes.bool,
    chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    messageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    userColor: PropTypes.string,
    content: PropTypes.string,
    fileName: PropTypes.string,
    fileSize: PropTypes.number,
    timestamp: PropTypes.string.isRequired,
    isSender: PropTypes.bool.isRequired,
    status: PropTypes.shape({
        sent: PropTypes.object,
        delivered: PropTypes.object,
        read: PropTypes.object,
    }).isRequired,
    messageType: PropTypes.number.isRequired,
    isGroupMessageBubble: PropTypes.bool,
    senderProfile: PropTypes.shape({
        displayName: PropTypes.string,
        profilePhoto: PropTypes.string,
    }),
};

MessageBubble.defaultProps = {
    isDeleted: false,
    userColor: '#000000',
    content: '',
    fileName: '',
    fileSize: 0,
    isGroupMessageBubble: false,
    senderProfile: {
        displayName: '',
        profilePhoto: defaultProfilePhoto,
    },
};

export default MessageBubble;