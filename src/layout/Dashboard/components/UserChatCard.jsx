import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import { useSignalR } from "../../../contexts/SignalRContext";

import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import LastMessage from "../../../shared/components/LastMessage/LastMessage";
import { getChatId } from "../../../store/Slices/chats/chatSlice";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import { toggleActiveContent } from "../../../store/Slices/activeContent/activeContentSlice";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";

function UserChatCard({
  isDeleted,
  receiverId,
  image,
  status,
  name,
  userIdentifier,
  lastMessageDate,
  lastMessageType,
  lastMessage,
  unReadMessage,
  isArchive,
}) {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { chatConnection } = useSignalR();
  const { user } = useSelector(state => state.auth);

  const [anchorEl, setAnchorEl] = useState(null);
  const [copiedIdentifier, setCopiedIdentifier] = useState(null);
  const open = Boolean(anchorEl);

  const isDarkMode = user.userSettings.theme === "Dark";

  const { token } = useSelector(state => state.auth);
  const currentUserId = getUserIdFromToken(token);
  const chatState = useSelector(state => state.chat);
  const chatId = getChatId(chatState, currentUserId, receiverId);
  const isSavedMessagesChat = receiverId === currentUserId;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAddArchive = async () => {
    try {
      await chatConnection.invoke("ArchiveChat", chatId);
      SuccessAlert("به بایگانی اضافه شد");
      if (location.pathname.includes(chatId)) {
        navigate("/chats");
      }
    } catch {
      ErrorAlert("افزودن به بایگانی انجام نشد");
    }
    handleClose();
  };

  const handleRemoveFromArchive = async () => {
    try {
      await chatConnection.invoke("UnarchiveChat", chatId);
      SuccessAlert("از بایگانی خارج شد");
      if (location.pathname.includes(chatId)) {
        navigate("/archives");
      }
    } catch {
      ErrorAlert("خروج از بایگانی انجام نشد");
    }
    handleClose();
  };

  const handleClearChat = async () => {
    try {
      await chatConnection.invoke("ClearChat", "Individual", chatId);
      SuccessAlert("گفت‌وگو حذف شد");

      const currentPath = location.pathname;

      if (currentPath.includes(chatId)) {
        if (currentPath.includes("chats")) {
          navigate("/chats");
        } else if (currentPath.includes("archives")) {
          navigate("/archives");
        }
      }
    } catch {
      ErrorAlert("حذف گفت‌وگو انجام نشد");
    }
    handleClose();
  };

  const handleGoChat = () => {
    isArchive ? navigate(`/archives/${chatId}`) : navigate(`/chats/${chatId}`);
    dispatch(toggleActiveContent());
  };

  const handleCopyUserIdentifier = async (event) => {
    event.stopPropagation();
    if (!userIdentifier) return;

    try {
      await navigator.clipboard.writeText(userIdentifier);
      SuccessAlert("شناسه کاربر کپی شد");
      setCopiedIdentifier(userIdentifier);
      setTimeout(() => {
        setCopiedIdentifier((prev) => (prev === userIdentifier ? null : prev));
      }, 1400);
    } catch {
      ErrorAlert("کپی شناسه کاربر انجام نشد");
    }
  };

  const isActiveChat = location.pathname.includes(chatId);

  return (
    <div
      className={`user-dashboard-card-box ${isActiveChat ? "active-chat" : ""} ${isSavedMessagesChat ? "saved-messages-card" : ""}`}
      onClick={() => handleGoChat()}
    >
      <div className="card-info-box">
        <div className="image-box">
          {isSavedMessagesChat ? (
            <div className="saved-messages-avatar" aria-label="Saved Messages">
              <BookmarkRoundedIcon />
            </div>
          ) : (
            <>
              <img
                src={image ?? defaultProfilePhoto}
                onError={(e) => (e.currentTarget.src = defaultProfilePhoto)}
                alt={`${name} profile`}
              />
              <p className={`status ${status ? "online" : "offline"}`}></p>
            </>
          )}
        </div>

        <div className="user-name-and-sub-title">
          <div className="name-row">
            <p className="chat-name">{name}</p>
            {userIdentifier && (
              <div className="identifier-chip-wrapper">
                <button
                  type="button"
                  className="identifier-chip"
                  onClick={handleCopyUserIdentifier}
                  title={`کپی @${userIdentifier}`}
                  aria-label={`کپی شناسه ${userIdentifier}`}
                >
                  @{userIdentifier}
                </button>
                {copiedIdentifier === userIdentifier && (
                  <span className="copied-inline-tooltip">Copied</span>
                )}
              </div>
            )}
          </div>
          <LastMessage lastMessageType={lastMessageType} content={lastMessage} />
        </div>
      </div>

      <div className="date-and-options-box">
        <div className="status-informations-box">
          <span>{lastMessageDate}</span>
          {unReadMessage > 0 && <p>{isDeleted ? "" : unReadMessage}</p>}
        </div>

        <div className="option">
          <IconButton
            aria-label="more"
            id="long-button"
            aria-controls={open ? "long-menu" : undefined}
            aria-expanded={open ? "true" : undefined}
            aria-haspopup="true"
            onClick={(event) => {
              event.stopPropagation();
              handleClick(event);
            }}
            sx={{
              color: isDarkMode ? "#616161" : "#828A96",
            }}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id="long-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={(event) => {
              event.stopPropagation();
              handleClose();
            }}
            MenuListProps={{
              "aria-labelledby": "long-button",
            }}
            slotProps={{
              paper: {
                style: {
                  maxHeight: "auto",
                  width: "16ch",
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
              onClick={(event) => {
                event.stopPropagation();
                handleClearChat();
              }}
              sx={{ color: "#EB6262" }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="medium" sx={{ color: "#EB6262" }} />
              </ListItemIcon>
              <ListItemText
                primary="حذف"
                primaryTypographyProps={{
                  fontFamily: "Montserrat",
                  fontWeight: "700",
                  fontSize: "15px"
                }}
              />
            </MenuItem>
            {isArchive ? (
              <MenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveFromArchive();
                }}
                sx={{ color: "#585CE1" }}
              >
                <ListItemIcon >
                  <UnarchiveIcon fontSize="medium" sx={{ color: "#585CE1" }} />
                </ListItemIcon>
                <ListItemText
                  primary="خارج کن"
                  primaryTypographyProps={{
                    fontFamily: "Montserrat",
                    fontWeight: "700",
                    fontSize: "15px"
                  }}
                />
              </MenuItem>
            ) : (
              <MenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  handleAddArchive();
                }}
                sx={{ color: "#585CE1" }}
              >
                <ListItemIcon>
                  <ArchiveIcon fontSize="medium" sx={{ color: "#585CE1" }} />
                </ListItemIcon>
                <ListItemText
                  primary="بایگانی کن"
                  primaryTypographyProps={{
                    fontFamily: "Montserrat",
                    fontWeight: "700",
                    fontSize: "15px"
                  }}
                />
              </MenuItem>
            )}
          </Menu>
        </div>
      </div>
    </div>
  );
}

// PropTypes validation
UserChatCard.propTypes = {
  isDeleted: PropTypes.bool.isRequired,
  receiverId: PropTypes.string.isRequired,
  image: PropTypes.string,
  status: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  userIdentifier: PropTypes.string,
  lastMessageDate: PropTypes.string,
  lastMessageType: PropTypes.string,
  lastMessage: PropTypes.string,
  unReadMessage: PropTypes.number,
  isArchive: PropTypes.bool.isRequired,
};

export default UserChatCard;
