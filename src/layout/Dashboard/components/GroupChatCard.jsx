import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from 'prop-types';

import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import GroupRemoveIcon from "@mui/icons-material/GroupRemove";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import LastMessage from "../../../shared/components/LastMessage/LastMessage.jsx";

import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert.js";
import { useLeaveGroupMutation } from "../../../store/Slices/Group/GroupApi.js";
import "./style.scss";
import { defaultGroupPhoto, defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto.js";


function GroupChatCard({ groupId, groupListId, groupName, groupPhotoUrl, lastMessage, lastMessageType, lastMessageDate, unReadMessage, canLeaveGroup = true }) {

    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector(state => state.auth);

    const [leaveGroup] = useLeaveGroupMutation();
    const isDarkMode = user?.userSettings?.theme === "Dark";

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLeaveGroup = async () => {
        if (!canLeaveGroup) {
            ErrorAlert("اطلاعات گروه هنوز کامل بارگذاری نشده است. بعدا دوباره تلاش کنید.");
            handleClose();
            return;
        }

        try {
            await leaveGroup(groupListId).unwrap();
            SuccessAlert("از گروه خارج شدید");
            handleClose();
        } catch {
            ErrorAlert("خطایی رخ داده است.");
        }
    };

    const handleGoGroupChat = () => {
        navigate(`/groups/${groupId}`);
    };

    const isActiveChat = location.pathname.includes(groupId);

    return (
        <div key={groupId} onClick={handleGoGroupChat} className={`group-dashboard-card-box ${isActiveChat ? "active-chat" : ""}`}>
            <div className="card-info-box">
                <div className="image-box">
                    <img
                        src={groupPhotoUrl ?? defaultGroupPhoto}
                        alt={`${groupName} profile`}
                        onError={(e) => e.currentTarget.src = defaultProfilePhoto}
                    />
                </div>

                <div className="grup-name-and-sub-title">
                    <p>{groupName}</p>
                    <LastMessage lastMessageType={lastMessageType} content={lastMessage} />
                </div>
            </div>

            <div className="date-and-options-box">
                <div className="status-informations-box">
                    <span>{lastMessage && lastMessageDate}</span>
                    {unReadMessage > 0 && <p>{unReadMessage}</p>}
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
                                    maxHeight: 48 * 2,
                                    width: "16ch",
                                    padding: "0px",
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
                                handleLeaveGroup();
                            }}
                            disabled={!canLeaveGroup}
                            sx={{ color: "#EB6262", boxShadow: "none" }}
                        >
                            <ListItemIcon>
                                <GroupRemoveIcon fontSize="medium" sx={{ color: "#EB6262" }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="خروج از گروه"
                                primaryTypographyProps={{
                                    fontFamily: "IRANSansX",
                                    fontWeight: "700",
                                    fontSize: "14px",
                                }}
                            />
                        </MenuItem>
                    </Menu>
                </div>
            </div>
        </div>
    );
}

// PropTypes validation
GroupChatCard.propTypes = {
    groupId: PropTypes.string.isRequired,
    groupListId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,
    groupPhotoUrl: PropTypes.string,
    lastMessage: PropTypes.string,
    lastMessageType: PropTypes.string,
    lastMessageDate: PropTypes.string,
    unReadMessage: PropTypes.number,
    canLeaveGroup: PropTypes.bool,
};

export default GroupChatCard;

