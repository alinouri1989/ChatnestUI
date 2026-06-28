// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";

import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ImageSearchRoundedIcon from "@mui/icons-material/ImageSearchRounded";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { HiUserAdd } from "react-icons/hi";
import { IoMdSettings } from "react-icons/io";
import { MdClose, MdPersonRemoveAlt1 } from "react-icons/md";
import { TbEdit } from "react-icons/tb";

import { useDispatch, useSelector } from "react-redux";

import star from "../../../../assets/svg/star.svg";
import {
  defaultGroupPhoto,
  defaultProfileAdminPhoto,
  defaultProfilePhoto,
} from "../../../../constants/DefaultProfilePhoto";
import CloseModalButton from "../../../../contexts/components/CloseModalButton";
import { useSignalR } from "../../../../contexts/SignalRContext";
import { ErrorAlert, SuccessAlert } from "../../../../helpers/customAlert";
import { resolveGroupPhoto } from "../../../../helpers/groupPhotoResolver";
import useScreenWidth from "../../../../hooks/useScreenWidth";
import PreLoader from "../../../../shared/components/PreLoader/PreLoader";
import { addNewGroupChat } from "../../../../store/Slices/chats/chatSlice";
import {
  useCreateGroupMutation,
  useEditGroupMutation,
  useLeaveGroupMutation,
} from "../../../../store/Slices/Group/GroupApi";
import AddUser from "../AddUser";
import "./style.scss";

const GROUP_KIND = 0;
const CHANNEL_KIND = 1;

function NewAndSettingsGroupModal({
  closeModal,
  isGroupSettings,
  groupProfile,
  groupId,
  userId,
}) {
  const dispatch = useDispatch();
  const { chatConnection } = useSignalR();
  const { user } = useSelector((state) => state.auth);
  const isDarkMode = user?.userSettings?.theme === "Dark";

  const [createGroup, { isLoading: createLoading }] = useCreateGroupMutation();
  const [editGroup, { isLoading: editLoading }] = useEditGroupMutation();
  const [leaveGroup, { isLoading: leaveLoading }] = useLeaveGroupMutation();

  const isLoading = editLoading || createLoading || leaveLoading;
  const isSmallScreen = useScreenWidth(768);

  const groupImageDefault =
    resolveGroupPhoto({
      photoUrl: groupProfile?.photoUrl,
      groupId: groupId ?? groupProfile?.groupId,
      groupName: groupProfile?.name,
    }) || defaultGroupPhoto;

  const initialData = useCallback(
    () => ({
      name: isGroupSettings ? groupProfile?.name || "" : "",
      description: isGroupSettings ? groupProfile?.description || "" : "",
      kind: isGroupSettings ? Number(groupProfile?.kind ?? 0) : 0,
      photoUrl: isGroupSettings
        ? resolveGroupPhoto({
          photoUrl: groupProfile?.photoUrl,
          groupId: groupId ?? groupProfile?.groupId,
          groupName: groupProfile?.name,
        }) || null
        : null,
      photo: isGroupSettings ? groupProfile?.photo || "" : "",
      participants: isGroupSettings ? groupProfile?.participants || null : null,
    }),
    [groupId, groupProfile, isGroupSettings]
  );

  const [formData, setFormData] = useState(initialData);
  const [isAddUserModal, setAddUserModal] = useState(false);
  const [isShowProfileImage, setIsShowProfileImage] = useState(false);
  const [isSaveDisabled, setSaveDisabled] = useState(true);
  const [isSubmitReady, setIsSubmitReady] = useState(false);
  const [copiedIdentifier, setCopiedIdentifier] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);
  const isChannel = Number(formData.kind) === CHANNEL_KIND;
  const activeKindLabel = isChannel ? "کانال" : "گروه";
  const activeKindDescription = isChannel
    ? "کانال برای انتشار محتوا، اطلاع‌رسانی و مدیریت متمرکز مناسب است."
    : "گروه برای گفت‌وگو، هماهنگی و همکاری بین اعضا طراحی شده است.";

  const visibleParticipants = useMemo(
    () =>
      formData.participants
        ? Object.entries(formData.participants)
          .filter(([, participant]) => participant.role !== 2)
          .map(([participantId, participant]) => ({
            participantId,
            ...participant,
          }))
        : [],
    [formData.participants]
  );

  useEffect(() => {
    const currentInitialData = initialData();
    const isSameData = JSON.stringify(formData) === JSON.stringify(currentInitialData);
    const isNameTooShort = formData.name.length < 2;
    setSaveDisabled(isSameData || isNameTooShort);

    const filteredParticipants =
      formData.participants &&
      Object.values(formData.participants).filter((participant) => participant.role !== 2);
    const hasValidParticipants = filteredParticipants && filteredParticipants.length > 0;
    setIsSubmitReady(!(isNameTooShort || !hasValidParticipants));
  }, [formData, initialData]);

  useEffect(() => {
    if (formData.photo instanceof File) {
      const objectURL = URL.createObjectURL(formData.photo);
      return () => URL.revokeObjectURL(objectURL);
    }
  }, [formData.photo]);

  useEffect(() => {
    if (!copiedIdentifier) return;
    const timeoutId = setTimeout(() => setCopiedIdentifier(null), 1400);
    return () => clearTimeout(timeoutId);
  }, [copiedIdentifier]);

  useEffect(() => {
    const handleReceiveCreateChat = (response) => {
      const groupData = response?.Group;
      if (!groupData) return;

      const createdGroupId = Object.keys(groupData)[0];
      if (!createdGroupId) return;

      dispatch(addNewGroupChat({ chatId: createdGroupId, chatData: groupData[createdGroupId] }));
      closeModal();
    };

    if (chatConnection) {
      chatConnection.on("ReceiveCreateChat", handleReceiveCreateChat);
    }

    return () => {
      if (chatConnection) {
        chatConnection.off("ReceiveCreateChat", handleReceiveCreateChat);
      }
    };
  }, [chatConnection, closeModal, dispatch]);

  const getPhotoURL = (photo) => {
    if (photo instanceof File) {
      return URL.createObjectURL(photo);
    }

    return photo || groupImageDefault;
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCopyIdentifier = async (event, identifier) => {
    event.stopPropagation();
    if (!identifier) return;

    try {
      await navigator.clipboard.writeText(identifier);
      setCopiedIdentifier(identifier);
    } catch {
      ErrorAlert("کپی شناسه کاربر انجام نشد");
    }
  };

  const handleGroupNameChange = (event) => {
    setFormData((prev) => ({ ...prev, name: event.target.value }));
  };

  const handleGroupDescriptionChange = (event) => {
    setFormData((prev) => ({ ...prev, description: event.target.value }));
  };

  const handleGroupImageEdit = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validImageTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validImageTypes.includes(file.type)) {
      ErrorAlert("لطفا یک فایل تصویری انتخاب کنید.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      photoUrl: isGroupSettings ? file : prev.photoUrl,
      photo: isGroupSettings ? null : file,
    }));
  };

  const handleChangeGroupImage = () => {
    handleClose();
    document.getElementById("image-upload-input")?.click();
  };

  const handleShowGroupImage = () => {
    handleClose();
    setIsShowProfileImage(true);
  };

  const handleDeleteGroupImage = () => {
    handleClose();
    setFormData((prev) => ({ ...prev, photo: "", photoUrl: null }));
  };

  const handleRemoveUser = (participantId) => {
    const participant = formData.participants?.[participantId];
    if (!participant) return;

    const updatedParticipants = {
      ...formData.participants,
      [participantId]: {
        ...participant,
        role: 2,
      },
    };

    setFormData((prev) => ({
      ...prev,
      participants: updatedParticipants,
    }));

    SuccessAlert(`${participant.displayName} از ${isChannel ? "کانال" : "گروه"} حذف شد.`, 1500);
  };

  const handleroleChange = (participantId, newRole) => {
    const updatedParticipants = {
      ...formData.participants,
      [participantId]: {
        ...formData.participants[participantId],
        role: Number(newRole),
      },
    };

    setFormData((prev) => ({
      ...prev,
      participants: updatedParticipants,
    }));

    SuccessAlert("نقش تغییر کرد");
  };

  const handleSubmit = async () => {
    try {
      const formDataCopy = { ...formData };

      if (formDataCopy.participants) {
        formDataCopy.participants = Object.fromEntries(
          Object.entries(formDataCopy.participants).filter(
            ([, participant]) => participant.role !== 2
          )
        );
      }

      if (formDataCopy.photo) {
        const reader = new FileReader();
        reader.readAsDataURL(formDataCopy.photo);
        reader.onload = async () => {
          const base64String = reader.result.split(",")[1];
          formDataCopy.photoUrl = null;
          formDataCopy.photo = base64String;
          const response = await createGroup(formDataCopy);

          if (response?.error) {
            return;
          }

          SuccessAlert(`${activeKindLabel} ایجاد شد`);
          closeModal();
        };
      } else {
        const response = await createGroup(formDataCopy);
        if (response?.error) {
          return;
        }
        SuccessAlert(`${activeKindLabel} ایجاد شد`);
        closeModal();
      }
    } catch (error) {
      const errorMessage =
        error?.data?.message || "خطایی رخ داد، لطفا دوباره تلاش کنید.";
      ErrorAlert(errorMessage);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const formDataCopy = { ...formData };

      if (!formDataCopy.photo && !formDataCopy.photoUrl) {
        formDataCopy.photoUrl = null;
      }

      if (
        typeof formDataCopy.photoUrl === "string" &&
        formDataCopy.photoUrl.startsWith("data:image/svg+xml,")
      ) {
        const svgRaw = formDataCopy.photoUrl.replace("data:image/svg+xml,", "");
        const base64Svg = window.btoa(unescape(encodeURIComponent(svgRaw)));
        formDataCopy.photoUrl = base64Svg;
      }

      if (
        typeof formDataCopy.photoUrl === "string" &&
        formDataCopy.photoUrl.trim().startsWith("<svg")
      ) {
        const svg = formDataCopy.photoUrl;
        const base64Svg = window.btoa(unescape(encodeURIComponent(svg)));
        formDataCopy.photoUrl = base64Svg;
      }

      if (formDataCopy.photoUrl instanceof File) {
        const reader = new FileReader();

        reader.onload = async () => {
          const base64String = reader.result.split(",")[1];
          formDataCopy.photoUrl = base64String;

          await editGroup({ groupId, formData: formDataCopy }).unwrap();
          SuccessAlert("تغییرات ذخیره شد");
          closeModal();
        };

        reader.readAsDataURL(formDataCopy.photoUrl);
        return;
      }

      await editGroup({ groupId, formData: formDataCopy }).unwrap();
      SuccessAlert("تغییرات ذخیره شد");
      closeModal();

    } catch (error) {
      ErrorAlert(error?.data?.message || "خطایی رخ داد");
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroup(groupId).unwrap();
      SuccessAlert(isChannel ? "از کانال خارج شدید" : "از گروه خارج شدید");
      closeModal();
    } catch (error) {
      ErrorAlert("خطایی رخ داده است.", error);
    }
  };

  const renderIdentifierChip = (identifier) => {
    if (!identifier) return null;

    return (
      <div className="identifier-chip-row">
        <div className="identifier-chip-wrapper">
          <button
            type="button"
            className="identifier-chip"
            onClick={(event) => handleCopyIdentifier(event, identifier)}
            title={`کپی @${identifier}`}
            aria-label={`کپی شناسه ${identifier}`}
          >
            @{identifier}
          </button>
          {copiedIdentifier === identifier && (
            <span className="copied-inline-tooltip">کپی شد</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="new-group-modal">
      <CloseModalButton closeModal={closeModal} />

      <div className="title-box">
        {isGroupSettings ? (
          <>
            <IoMdSettings className="setting-icon" />
            <div className="title-copy">
              <p>{isChannel ? "تنظیمات کانال" : "تنظیمات گروه"}</p>
              <span>هویت بصری، اعضا و دسترسی‌ها را مدیریت کنید</span>
            </div>
          </>
        ) : (
          <>
            <img src={star} alt="" />
            <div className="title-copy">
              <p>فضای جدید بسازید</p>
              <span>گروه برای تعامل، کانال برای انتشار</span>
            </div>
          </>
        )}
      </div>

      <div className="contents">
        {!isGroupSettings && (
          <div className={`creation-hero ${isChannel ? "channel" : "group"}`}>
            <div className="creation-hero-icon">
              {isChannel ? <CampaignRoundedIcon /> : <GroupsRoundedIcon />}
            </div>
            <div className="creation-hero-copy">
              <h2>{isChannel ? "کانال جدید" : "گروه جدید"}</h2>
              <p>{activeKindDescription}</p>
            </div>
          </div>
        )}

        <div className="creation-shell">
          <div className="identity-panel">
            <div className="choose-group-image">
              <p>{isChannel ? "تصویر کانال" : "تصویر گروه"}</p>
              <div className="group-image-box">
                {isGroupSettings ? (
                  <img
                    src={getPhotoURL(formData.photoUrl)}
                    alt="Group"
                    onError={(event) => {
                      event.currentTarget.src = defaultGroupPhoto;
                    }}
                  />
                ) : (
                  <img
                    src={getPhotoURL(formData.photo)}
                    alt="Group"
                    onError={(event) => {
                      event.currentTarget.src = defaultGroupPhoto;
                    }}
                  />
                )}

                <label className="edit-image-btn">
                  <IconButton
                    className="edit-btn"
                    aria-label="more"
                    id="long-button"
                    aria-controls={open ? "long-menu" : undefined}
                    aria-expanded={open ? "true" : undefined}
                    aria-haspopup="true"
                    onClick={handleClick}
                    sx={{
                      color: isDarkMode ? "#B0B0B0" : "inherit",
                    }}
                  >
                    <TbEdit />
                  </IconButton>

                  <Menu
                    className="menu-box"
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
                          maxHeight: "auto",
                          width: "18ch",
                          borderRadius: "8px",
                          border: `4px solid ${isDarkMode ? "#222430" : "#CFD5F2"}`,
                          fontWeight: "bold",
                          backgroundColor: isDarkMode ? "#18191A" : "#FFFFFF",
                          color: isDarkMode ? "red" : "#000000",
                          boxShadow: "none",
                          marginLeft: "36px",
                          marginTop: "-27px",
                        },
                      },
                    }}
                  >
                    <MenuItem onClick={handleShowGroupImage} sx={{ color: "#585CE1" }}>
                      <ListItemIcon sx={{ color: "inherit" }}>
                        <ImageSearchRoundedIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="مشاهده"
                        primaryTypographyProps={{
                          fontFamily: "IRANSansX",
                          fontWeight: "700",
                          fontSize: "14px",
                        }}
                      />
                    </MenuItem>

                    <MenuItem onClick={handleChangeGroupImage} sx={{ color: "#585CE1" }}>
                      <ListItemIcon fontSize="small" sx={{ color: "inherit" }}>
                        <AddPhotoAlternateRoundedIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="تغییر"
                        primaryTypographyProps={{
                          fontFamily: "IRANSansX",
                          fontWeight: "700",
                          fontSize: "14px",
                        }}
                      />
                    </MenuItem>

                    <MenuItem onClick={handleDeleteGroupImage} sx={{ color: "#EB6262" }}>
                      <ListItemIcon sx={{ color: "inherit" }}>
                        <DeleteOutlineRoundedIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="حذف"
                        primaryTypographyProps={{
                          fontFamily: "IRANSansX",
                          fontWeight: "700",
                          fontSize: "14px",
                        }}
                      />
                    </MenuItem>
                  </Menu>

                  <input
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleGroupImageEdit}
                  />
                </label>

                {isShowProfileImage && (
                  <div className="full-size-group-image-box">
                    <img
                      src={getPhotoURL(formData.photoUrl || formData.photo)}
                      alt="Group"
                      onError={(event) => {
                        event.currentTarget.src = defaultGroupPhoto;
                      }}
                    />
                    <button type="button" onClick={() => setIsShowProfileImage(false)}>
                      <MdClose />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={`kind-insight ${isChannel ? "channel" : "group"}`}>
              <div className="kind-insight-icon">
                {isChannel ? <CampaignRoundedIcon /> : <GroupsRoundedIcon />}
              </div>
              <div className="kind-insight-copy">
                <span className="kind-insight-kicker">فضای فعال</span>
                <h3>{activeKindLabel}</h3>
                <p>{activeKindDescription}</p>
              </div>
              <div className="kind-insight-stats">
                <span>{formData.name.length}/40</span>
                <span>{visibleParticipants.length} عضو</span>
              </div>
            </div>
          </div>

          <div className="input-boxs">
            <div className="input-box kind-selector-box">
              <p>نوع فضا</p>
              <div className="kind-selector">
                <button
                  type="button"
                  className={!isChannel ? "active" : ""}
                  onClick={() => setFormData((prev) => ({ ...prev, kind: GROUP_KIND }))}
                >
                  <GroupsRoundedIcon />
                  <span>گروه</span>
                  <small>گفت‌وگو و همکاری بین اعضا</small>
                </button>
                <button
                  type="button"
                  className={isChannel ? "active" : ""}
                  onClick={() => setFormData((prev) => ({ ...prev, kind: CHANNEL_KIND }))}
                >
                  <CampaignRoundedIcon />
                  <span>کانال</span>
                  <small>انتشار محتوا با مدیریت متمرکز</small>
                </button>
              </div>
            </div>

            <div className="input-box">
              <div className="field-head">
                <p>{isChannel ? "نام کانال" : "نام گروه"}</p>
                <span>{formData.name.length}/40</span>
              </div>
              <input
                type="text"
                placeholder={
                  isChannel ? "یک نام برای کانال تعیین کنید..." : "یک نام برای گروه تعیین کنید..."
                }
                value={formData.name}
                onChange={handleGroupNameChange}
                maxLength={40}
              />
            </div>

            <div className="input-box">
              <div className="field-head">
                <p>{isChannel ? "درباره کانال" : "درباره گروه"}</p>
                <span>{formData.description.length}/50</span>
              </div>
              <textarea
                placeholder={
                  isChannel
                    ? "موضوع، هدف یا توضیح کوتاه کانال را بنویسید..."
                    : "موضوع، هدف یا توضیح کوتاه گروه را بنویسید..."
                }
                value={formData.description}
                onChange={handleGroupDescriptionChange}
                maxLength={50}
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="group-members-box">
          <div className="group-members-head">
            <h2>{isChannel ? "اعضای کانال" : "اعضای گروه"}</h2>
            <span className="members-count-chip">{visibleParticipants.length} نفر</span>
          </div>

          {!isGroupSettings && (
            <div className="group-admin">
              <img
                src={user.profilePhoto || defaultProfileAdminPhoto}
                alt="Admin Profile Image"
              />
              <div className="admin-info">
                <p className="user-display-name">{user.displayName}</p>
                {renderIdentifierChip(user.userIdentifier)}
                <span>مدیر</span>
              </div>
            </div>
          )}

          <div className={`other-users ${visibleParticipants.length === 0 ? "empty" : ""}`}>
            {visibleParticipants.length === 0 ? (
              <p className="empty-members-hint">
                هنوز عضوی اضافه نشده است. برای شروع، اعضا را به {activeKindLabel} دعوت کنید.
              </p>
            ) : (
              visibleParticipants
                .sort((a, b) => {
                  if (a.participantId === userId) return -1;
                  if (b.participantId === userId) return 1;
                  if (a.role === 0 && b.role !== 0) return -1;
                  if (a.role !== 0 && b.role === 0) return 1;
                  return 0;
                })
                .map((participant) => {
                  const isCurrentUser = participant.participantId === userId;

                  return (
                    <div className="user-box" key={participant.participantId}>
                      <div className="user-info">
                        <img
                          src={participant.profilePhoto || defaultProfilePhoto}
                          onError={(event) => {
                            event.currentTarget.src = defaultProfilePhoto;
                          }}
                          alt={participant.displayName}
                        />
                        <div className="username-and-role-box">
                          <p className="user-display-name">{participant.displayName}</p>
                          {renderIdentifierChip(participant.userIdentifier)}
                          {isCurrentUser ? (
                            <p className="role-badge">مدیر</p>
                          ) : (
                            <select
                              defaultValue={participant.role}
                              onChange={(event) =>
                                handleroleChange(participant.participantId, event.target.value)
                              }
                            >
                              <option value={1}>عضو</option>
                              <option value={0}>مدیر</option>
                            </select>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="remove-user-box"
                        onClick={() =>
                          isCurrentUser
                            ? handleLeaveGroup()
                            : handleRemoveUser(participant.participantId)
                        }
                      >
                        <MdPersonRemoveAlt1 className="icon" />
                        <span>
                          {isSmallScreen
                            ? isCurrentUser
                              ? "ترک"
                              : "خارج کن"
                            : isCurrentUser
                              ? `ترک ${activeKindLabel}`
                              : `حذف از ${activeKindLabel}`}
                        </span>
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      <div className="option-buttons">
            <button type="button" className="secondary-btn" onClick={() => setAddUserModal(true)}>
              <HiUserAdd className="icon" />
              افزودن عضو
            </button>

            {isGroupSettings ? (
              <button
                type="button"
                className={`primary-btn ${isSaveDisabled ? "disabled" : ""}`}
                onClick={handleSaveChanges}
                disabled={isSaveDisabled}
              >
                ذخیره تغییرات
              </button>
            ) : (
              <button
                type="button"
                className="primary-btn"
                onClick={handleSubmit}
                disabled={!isSubmitReady}
                style={{ opacity: isSubmitReady ? 1 : 0.8 }}
              >
                {isChannel ? "ایجاد کانال" : "ایجاد گروه"}
              </button>
            )}
      </div>

      {isAddUserModal && (
        <AddUser
          setFormData={setFormData}
          formData={formData}
          closeUserModal={() => setAddUserModal(false)}
        />
      )}

      {isLoading && <PreLoader />}
    </div>
  );
}

NewAndSettingsGroupModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
  isGroupSettings: PropTypes.bool,
  groupProfile: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    kind: PropTypes.number,
    photoUrl: PropTypes.string,
    groupId: PropTypes.string,
    photo: PropTypes.string,
    participants: PropTypes.object,
  }),
  groupId: PropTypes.string,
  userId: PropTypes.string.isRequired,
};

NewAndSettingsGroupModal.defaultProps = {
  isGroupSettings: false,
  groupProfile: null,
  groupId: null,
};

export default NewAndSettingsGroupModal;
