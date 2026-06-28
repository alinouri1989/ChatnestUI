// @ts-nocheck
/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useModal } from '../../../contexts/ModalContext';
import PropTypes from 'prop-types';

import {
    NestCloseIcon,
    NestDoubleCheckIcon,
    NestDownloadIcon,
    NestFileIcon,
    NestPendingIcon,
    NestSingleCheckIcon
} from "../BrandIcons/BrandIcons";

import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import ForwardToInboxRoundedIcon from '@mui/icons-material/ForwardToInboxRounded';
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

import { ErrorAlert, SuccessAlert } from '../../../helpers/customAlert';
import { downloadFile } from '../../../helpers/downloadFile';
import { decryptMessage } from '../../../helpers/messageCryptoHelper';
import { AudioMessage } from './components/AudioMessage';
import { VideoMessage } from './components/VideoMessage';

import MessageInfo from '../MessageInfo/MessageInfo';
import ForwardMessageModal from '../ForwardMessageModal/ForwardMessageModal';
import useScreenWidth from '../../../hooks/useScreenWidth';
import { deleteMessage } from '../../../services/messageActions';

import './style.scss';
import { defaultProfilePhoto, defaultImagePlaceholder } from '../../../constants/DefaultProfilePhoto';
const normalizeUrl = (url) =>
    (url && typeof url === 'string') ? url.replace(/%2F/g, "_") : null;
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
    senderProfile,
    thumbnailUrl,
    replyToMessageId,
    replyToSenderId,
    replyToType,
    replyToContent,
    replyToFileName,
    onReplyMessage,
}) {

    const [showFullFileName, setShowFullFileName] = useState(false);

    const { Group } = useSelector((state) => state.chat);
    const { chatList } = useSelector((state) => state.chatList);
    const { groupList } = useSelector((state) => state.groupList);
    const { user } = useSelector(state => state.auth);

    const [isShowImage, setIsShowImage] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const { showModal, closeModal } = useModal();
    const isSmallScreen = useScreenWidth(400);
    if (!content || isDeleted) {
        return null;
    }

    const resolveReplyPreviewAuthor = () => {
        if (!replyToSenderId) return "Reply";
        if (String(replyToSenderId) === String(userId)) return "شما";

        if (isGroupMessageBubble && groupIdFromLocation) {
            return groupList?.[groupIdFromLocation]?.participants?.[replyToSenderId]?.displayName || "Reply";
        }

        return chatList?.[replyToSenderId]?.displayName || "Reply";
    };

    const resolveReplyPreviewText = () => {
        if (replyToType === 0) {
            if (!replyToContent) return "";
            const decryptedReplyContent = decryptMessage(replyToContent, String(chatId));
            return decryptedReplyContent || replyToContent;
        }
        if (replyToType === 1) return "Photo";
        if (replyToType === 2) return "Video";
        if (replyToType === 3) return "Voice message";
        if (replyToType === 4) return replyToFileName || "File";
        return replyToContent || "Message";
    };

    const scrollToRepliedMessage = (event) => {
        event.stopPropagation();
        if (!replyToMessageId) return;
        const target = document.getElementById(`msg-${replyToMessageId}`);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.classList.add("reply-target-highlight");
            setTimeout(() => {
                target.classList.remove("reply-target-highlight");
            }, 1200);
        }
    };

    const isDarkMode = user?.userSettings?.theme === "Dark";

    const open = Boolean(anchorEl);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleDelete = async (deletionType) => {
        let chatType;
        if (isGroupMessageBubble) {
            chatType = "Group";
        }
        else {
            chatType = "Individual";
        }
        try {
            await deleteMessage({
                chatType,
                chatId,
                messageId,
                scope: deletionType === 1 ? "everyone" : "me",
            });
            SuccessAlert("پیام حذف شد");
        } catch (error) {
            console.error("Delete message failed:", error);
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

    const handleReply = () => {
        onReplyMessage?.({
            id: String(messageId),
            senderId: senderProfile?.userId || (isSender ? String(userId) : ""),
            senderName: senderProfile?.displayName || (isSender ? "You" : "Reply"),
            type: messageType,
            content,
            fileName,
        });
        handleClose();
    };

    const handleForward = () => {
        showModal(
            <ForwardMessageModal
                sourceMessageId={messageId}
                currentChatId={chatId}
                closeModal={closeModal}
            />
        );
        handleClose();
    };

    const getDownloadFileName = () => {
        if (fileName) return fileName;
        if (messageType === 1) return `image-${messageId}.jpg`;
        if (messageType === 2) return `video-${messageId}.mp4`;
        if (messageType === 3) return `voice-message-${messageId}.wav`;
        return `attachment-${messageId}`;
    };

    const handleDownloadAttachment = async (event) => {
        event?.stopPropagation();

        if (isDownloading) return;

        const shouldCloseMenuAfterDownload = Boolean(anchorEl);
        setIsDownloading(true);
        try {
            await downloadFile(getDownloadFileName(), normalizeUrl(content) || content);
        } catch {
            ErrorAlert("\u062e\u0637\u0627 \u062f\u0631 \u062f\u0627\u0646\u0644\u0648\u062f \u0641\u0627\u06cc\u0644");
        } finally {
            setIsDownloading(false);
            if (shouldCloseMenuAfterDownload) {
                handleClose();
            }
        }
    };

    const DownloadMenuItem = () => (
        <MenuItem
            onClick={handleDownloadAttachment}
            disabled={isDownloading}
            sx={{ color: "#585CE1" }}
        >
            <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                {isDownloading ? (
                    <CircularProgress size={18} thickness={5} color="inherit" />
                ) : (
                    <NestDownloadIcon />
                )}
            </ListItemIcon>
            <ListItemText
                primary={isDownloading ? "\u062f\u0631 \u062d\u0627\u0644 \u062f\u0627\u0646\u0644\u0648\u062f..." : "\u062f\u0627\u0646\u0644\u0648\u062f"}
                primaryTypographyProps={{
                    fontFamily: "IRANSansX",
                    fontWeight: "700",
                    fontSize: "14px",
                }}
            />
        </MenuItem>
    );

    let statusIcon;
    let statusColor;

    const groupIdFromLocation = window.location.pathname.includes("groups")
        ? window.location.pathname.split('/')[2]
        : null;

    if (!isGroupMessageBubble) {
        if (status.read && Object.keys(status.read).length > 0) {
            statusIcon = <NestDoubleCheckIcon />;
            statusColor = "#585CE1";
        } else if (status.delivered && Object.keys(status.delivered).length > 0) {
            statusIcon = <NestDoubleCheckIcon />;
            statusColor = "#828A96";
        } else if (status.sent && status.sent[userId]) {
            statusIcon = <NestSingleCheckIcon />;
            statusColor = "#828A96";
        } else {
            statusIcon = <NestPendingIcon />;
            statusColor = "#828A96";
        }
    } else {
        const chatGroup = Group.find(group => group.id === groupIdFromLocation);
        if (chatGroup) {
            const groupInfo = groupList[groupIdFromLocation];
            const groupParticipants = groupInfo?.participants || {};

            const totalParticipants = Object.keys(groupParticipants).length;
            const readCount = Object.keys(status.read || {}).filter(userId =>
                Object.keys(groupParticipants).includes(userId)
            ).length;

            const deliverCount = Object.keys(status.delivered || {}).filter(userId =>
                Object.keys(groupParticipants).includes(userId)
            ).length;

            if (readCount === totalParticipants - 1) {
                statusIcon = <NestDoubleCheckIcon />;
                statusColor = "#585CE1";
            } else if (deliverCount === totalParticipants - 1) {
                statusIcon = <NestDoubleCheckIcon />;
                statusColor = "#828A96";
            } else if (status.sent && status.sent[userId]) {
                statusIcon = <NestSingleCheckIcon />;
                statusColor = "#828A96";
            } else {
                statusIcon = <NestPendingIcon />;
                statusColor = "#828A96";
            }
        } else {
            statusIcon = <NestPendingIcon />;
            statusColor = "#828A96";
        }
    }

    const TextMessage = ({ content }) => <p className='text-content' onClick={handleCopy}
    >{content}</p>;

    const ImageMessage = ({ thumbnailUrl }) => (
        <div onClick={() => setIsShowImage(true)}>
            <img
                src={normalizeUrl(thumbnailUrl) || defaultImagePlaceholder}
                style={{ maxWidth: "100%", borderRadius: "8px" }}
                alt="پیام تصویر" />
        </div>
    );

    // const VideoMessage = ({ content, thumbnailUrl }) => (
    //     <div className="video-wrapper">
    //         <video
    //             src={content}
    //             controls
    //             poster={thumbnailUrl || undefined}
    //             style={{ maxWidth: "100%", borderRadius: "8px" }}
    //         >
    //             مرورگر شما از عنصر ویدیو پشتیبانی نمی‌کند.
    //         </video>
    //     </div>
    // );


    const FileMessage = () => {
        const toggleName = () => setShowFullFileName(!showFullFileName);

        const shortName = fileName && fileName.length > 20
            ? fileName.slice(0, 17) + "..."
            : fileName;

        return (
            <div className="file-message-container">
                <div className='file-info-box' onClick={toggleName} style={{ cursor: "pointer" }}>
                    <NestFileIcon />
                    <div className='file-info'>
                        <span className={showFullFileName ? "full-name" : "short-name"}>
                            {showFullFileName ? fileName : shortName}
                        </span>
                        <p>
                            {fileSize < 1024 * 1024
                                ? `${(fileSize / 1024).toFixed(2)} KB`
                                : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`}
                        </p>
                    </div>
                </div>

                {!showFullFileName && (
                    <button
                        className={`download-file-button ${isDownloading ? "downloading" : ""}`}
                        onClick={handleDownloadAttachment}
                        disabled={isDownloading}
                        aria-busy={isDownloading}
                        type="button"
                    >
                        {isDownloading ? (
                            <CircularProgress size={16} thickness={5} color="inherit" />
                        ) : (
                            <NestDownloadIcon />
                        )}
                    </button>
                )}
            </div>
        );
    };


    const UserInfo = ({ displayName, userColor, messageType }) => (
        <div className='user-info' style={{ color: userColor }}>
            {messageType === 3 && isGroupMessageBubble && <img src={senderProfile?.profilePhoto != "" ? senderProfile?.profilePhoto : defaultProfilePhoto} alt="پروفایل فرستنده" />}
            <p className={`sender-profile-name ${messageType === 0 ? 'text' : messageType === 1 ? 'image' : 'other'}`}>
                {displayName}
            </p>
        </div>
    );

    const renderMessageContent = (messageType, content, thumbnailUrl) => {
        switch (messageType) {
            case 0:
                return <TextMessage content={content} />;
            case 1:
                return <ImageMessage content={content} thumbnailUrl={thumbnailUrl} />;
            case 2:
                return <VideoMessage content={content} thumbnailUrl={thumbnailUrl} />;
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
    const notSender = !isSender;
    const handleDownloadImage = async (event) => {
        await handleDownloadAttachment(event);
    };
    return (
        <div className="message-bubble-box" id={`msg-${messageId}`}>
            <div className={`message-box ${isSender ? 'sender' : 'receiver'}`} >
                {isGroupMessageBubble && !isSender && (!isSmallScreen || messageType !== 3) && (
                    <div className='image-box'>
                        <img src={senderProfile?.profilePhoto != "" ? senderProfile?.profilePhoto : defaultProfilePhoto}
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

                    {replyToMessageId && (
                        <button
                            type="button"
                            className={`reply-preview-box ${isSender ? "sender" : "receiver"}`}
                            onClick={scrollToRepliedMessage}
                        >
                            <span className="reply-preview-accent" aria-hidden="true"></span>
                            <span className="reply-preview-body">
                                <span className="reply-preview-meta">
                                    <span className="reply-preview-icon" aria-hidden="true">
                                        <ReplyRoundedIcon fontSize="inherit" />
                                    </span>
                                    <span className="reply-preview-author">
                                        {resolveReplyPreviewAuthor()}
                                    </span>
                                    <span className="reply-preview-label">پاسخ به</span>
                                </span>
                                <span className="reply-preview-text">{resolveReplyPreviewText()}</span>
                            </span>
                        </button>
                    )}

                    {renderMessageContent(messageType, content, thumbnailUrl)}
                </div>

                <div className='message-hour-and-option-box'>
                    <div className='message-hour'>
                        {timestamp}
                    </div>
                    {notSender && (<div className='option'>
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
                                onClick={handleReply}
                                sx={{ color: "#585CE1" }}
                            >
                                <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                                    <InfoIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary="پاسخ"
                                    primaryTypographyProps={{
                                        fontFamily: "IRANSansX",
                                        fontWeight: "700",
                                        fontSize: "14px",
                                    }}
                                />
                            </MenuItem>

                            {messageType !== 0 &&
                                <MenuItem
                                    onClick={handleForward}
                                    sx={{ color: "#585CE1" }}
                                >
                                    <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                                        <ForwardToInboxRoundedIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="ارسال"
                                        primaryTypographyProps={{
                                            fontFamily: "IRANSansX",
                                            fontWeight: "700",
                                            fontSize: "14px",
                                        }}
                                    />
                                </MenuItem>
                            }

                            {messageType !== 0 && <DownloadMenuItem />}

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
                                            fontFamily: "IRANSansX",
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
                                            fontFamily: "IRANSansX",
                                            fontWeight: "700",
                                            fontSize: "14px",
                                        }}
                                    />
                                </MenuItem>
                            }
                        </Menu>
                    </div>
                    )}

                    {isSender && (<div className='option'>
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
                                onClick={handleReply}
                                sx={{ color: "#585CE1" }}
                            >
                                <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                                    <InfoIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary="پاسخ"
                                    primaryTypographyProps={{
                                        fontFamily: "IRANSansX",
                                        fontWeight: "700",
                                        fontSize: "14px",
                                    }}
                                />
                            </MenuItem>

                            {messageType !== 0 &&
                                <MenuItem
                                    onClick={handleForward}
                                    sx={{ color: "#585CE1" }}
                                >
                                    <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                                        <ForwardToInboxRoundedIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="ارسال"
                                        primaryTypographyProps={{
                                            fontFamily: "IRANSansX",
                                            fontWeight: "700",
                                            fontSize: "14px",
                                        }}
                                    />
                                </MenuItem>
                            }

                            {messageType !== 0 && <DownloadMenuItem />}

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
                                        fontFamily: "IRANSansX",
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
                                        fontFamily: "IRANSansX",
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
                                            fontFamily: "IRANSansX",
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
                                            fontFamily: "IRANSansX",
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
                    <img src={normalizeUrl(content) || content} alt="تصویر انتخاب شده" />
                    <button onClick={() => setIsShowImage(false)} type="button">
                        <NestCloseIcon />
                    </button>

                    <button
                        className={`left-5 ${isDownloading ? "downloading" : ""}`}
                        onClick={handleDownloadImage}
                        disabled={isDownloading}
                        aria-busy={isDownloading}
                        type="button"
                    >
                        {isDownloading ? (
                            <CircularProgress size={18} thickness={5} color="inherit" />
                        ) : (
                            <NestDownloadIcon />
                        )}
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
        userId: PropTypes.string,
        displayName: PropTypes.string,
        profilePhoto: PropTypes.string,
    }),
    replyToMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    replyToSenderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    replyToType: PropTypes.number,
    replyToContent: PropTypes.string,
    replyToFileName: PropTypes.string,
    onReplyMessage: PropTypes.func,
};

MessageBubble.defaultProps = {
    isDeleted: false,
    userColor: '#000000',
    content: '',
    fileName: '',
    fileSize: 0,
    isGroupMessageBubble: false,
    senderProfile: {
        userId: "",
        displayName: '',
        profilePhoto: defaultProfilePhoto,
    },
    replyToMessageId: null,
    replyToSenderId: null,
    replyToType: null,
    replyToContent: "",
    replyToFileName: "",
    onReplyMessage: null,
};

export default MessageBubble;
