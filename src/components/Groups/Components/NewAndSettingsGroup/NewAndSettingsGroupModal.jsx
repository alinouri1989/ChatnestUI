import { useState, useEffect, useCallback } from "react";
import PropTypes from 'prop-types';

import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import ImageSearchRoundedIcon from '@mui/icons-material/ImageSearchRounded';
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import { MdPersonRemoveAlt1 } from "react-icons/md";
import { HiUserAdd } from "react-icons/hi"
import { MdClose } from 'react-icons/md';
import { TbEdit } from "react-icons/tb";
import { IoMdSettings } from "react-icons/io";

import star from "../../../../assets/svg/star.svg";
import { defaultGroupPhoto, defaultProfilePhoto } from "../../../../constants/DefaultProfilePhoto.js";
import AddUser from "../AddUser.jsx";
import CloseModalButton from "../../../../contexts/components/CloseModalButton.jsx";
import { useDispatch, useSelector } from "react-redux";

import { ErrorAlert, SuccessAlert } from "../../../../helpers/customAlert.js";

import { useCreateGroupMutation, useEditGroupMutation, useLeaveGroupMutation } from "../../../../store/Slices/Group/GroupApi.js";
import PreLoader from "../../../../shared/components/PreLoader/PreLoader.jsx";
import "./style.scss";
import { useSignalR } from "../../../../contexts/SignalRContext.jsx";
import { addNewGroupChat } from "../../../../store/Slices/chats/chatSlice.js";
import useScreenWidth from "../../../../hooks/useScreenWidth.js";

function NewAndSettingsGroupModal({ closeModal, isGroupSettings, groupProfile, groupId, userId }) {

    const dispatch = useDispatch();

    const { chatConnection } = useSignalR();
    const { user } = useSelector(state => state.auth);
    const isDarkMode = user?.userSettings?.theme === "Dark";

    const [createGroup, { isLoading: createLoading }] = useCreateGroupMutation();
    const [editGroup, { isLoading: editLoading }] = useEditGroupMutation();
    const [leaveGroup, { isLoading: leaveLoading }] = useLeaveGroupMutation();

    const isLoading = editLoading || createLoading || leaveLoading;

    const groupImageDefault = defaultGroupPhoto;
    const [isAddUserModal, setAddUserModal] = useState(false);

    const [isShowProfileImage, setIsShowProfileImage] = useState(false);
    const [isSaveDisabled, setSaveDisabled] = useState(true);
    const isSmallScreen = useScreenWidth(768);

    const initialData = useCallback(() => ({
        name: isGroupSettings ? groupProfile?.name || "" : "",
        description: isGroupSettings ? groupProfile?.description || "" : "",
        photoUrl: isGroupSettings ? groupProfile?.photoUrl || null : null,
        photo: isGroupSettings ? groupProfile?.photo || "" : "",
        participants: isGroupSettings ? groupProfile?.participants || null : null
    }), [isGroupSettings, groupProfile]);

    const [formData, setFormData] = useState(initialData);
    const [isSubmitReady, setIsSubmitReady] = useState(false);

    // --------------------------------------------------------------

    useEffect(() => {
        const currentInitialData = initialData();
        const isSameData = JSON.stringify(formData) === JSON.stringify(currentInitialData);
        const isNameTooShort = formData.name.length < 2;
        setSaveDisabled(isSameData || isNameTooShort);
        
        const { name, participants } = formData;
        const isNameTooShortForSubmit = name.length < 2;
        const filteredParticipants = participants && Object.values(participants).filter(participant => participant.role !== 2);
        const hasValidParticipants = filteredParticipants && filteredParticipants.length > 0;
        setIsSubmitReady(!(isNameTooShortForSubmit || !hasValidParticipants));
    }, [formData, initialData]);

    useEffect(() => {
        if (formData.photo instanceof File) {
            const objectURL = URL.createObjectURL(formData.photo);
            return () => URL.revokeObjectURL(objectURL);
        }
    }, [formData.photo]);

    useEffect(() => {
        const handleReceiveCreateChat = (response) => {
            const groupData = response?.Group;
            if (groupData) {
                const groupId = Object.keys(groupData)[0];
                if (groupId) {
                    const chatData = groupData[groupId];
                    dispatch(addNewGroupChat({ groupId, chatData }));
                    closeModal();
                }
            }
        };

        if (chatConnection) {
            chatConnection.on("ReceiveCreateChat", handleReceiveCreateChat);
        }

        return () => {
            if (chatConnection) {
                chatConnection.off("ReceiveCreateChat", handleReceiveCreateChat);
            }
        };
    }, [chatConnection, dispatch, closeModal]);

    // --------------------------------------------------------------

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    // ----------------------------HELPERS----------------------------------

    const getPhotoURL = (photo) => {
        if (photo instanceof File) {
            return URL.createObjectURL(photo);
        }

        return photo || groupImageDefault;
    };

    // ----------------------------MANIPULATE FORM STATES----------------------------------

    const handleGroupNameChange = (e) => setFormData((prev) => ({ ...prev, name: e.target.value }));

    const handleGroupDescriptionChange = (e) => setFormData((prev) => ({ ...prev, description: e.target.value }));

    const handleGroupImageEdit = (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileType = file.type;
            const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];

            if (!validImageTypes.includes(fileType)) {
                ErrorAlert("Bir resim dosyası seçiniz.");
                return;
            }

            setFormData((prev) => ({
                ...prev,
                photoUrl: isGroupSettings ? file : prev.photoUrl,
                photo: isGroupSettings ? null : file,
            }));
        }
    };

    const handleChangeGroupImage = () => {
        handleClose();
        document.getElementById("image-upload-input").click();
    };

    const handleShowGroupImage = () => {
        handleClose();
        setIsShowProfileImage(true);
    };

    const handleDeleteGroupImage = () => {
        handleClose();
        setFormData((prev) => ({ ...prev, photo: "", photoUrl: null }));
    };

    const handleRemoveUser = (userId) => {
        const participantKeys = Object.keys(formData.participants);
        const userToRemove = participantKeys.find((key) => key === userId);

        if (userToRemove) {
            // formData'dan kullanıcıyı çıkarma işlemi için yeni bir kopya oluşturuyoruz
            const updatedParticipants = { ...formData.participants };

            // Kullanıcının rolünü 2 yapıyoruz (gruptan çıkarma)
            const updatedUser = { ...updatedParticipants[userToRemove], role: 2 };

            // Kullanıcının rolünü güncelledik, şimdi objenin kopyasını güncelliyoruz
            updatedParticipants[userToRemove] = updatedUser;

            // State'i güncelliyoruz
            setFormData((prevFormData) => ({
                ...prevFormData,
                participants: updatedParticipants
            }));

            const removedUserName = formData.participants[userToRemove].displayName;
            SuccessAlert(`${removedUserName} gruptan çıkarıldı.`, 1500);
        }
    };

    const handleroleChange = (userId, newrole) => {
        const updatedParticipants = {
            ...formData.participants,
            [userId]: {
                ...formData.participants[userId],
                role: Number(newrole)
            }
        };

        setFormData((prevFormData) => ({
            ...prevFormData,
            participants: updatedParticipants,
        }));

        SuccessAlert(`Rol Değiştirildi`);
    };

    // ----------------------------SUBMITS----------------------------------

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
                    const base64String = reader.result.split(',')[1];
                    formDataCopy.photoUrl = null;
                    formDataCopy.photo = base64String;
                    const response = await createGroup(formDataCopy);

                    if (response?.error) {
                        return;
                    }

                    SuccessAlert("Grup Oluşturuldu");
                    closeModal();
                };
            } else {
                const response = await createGroup(formDataCopy);
                if (response?.error) {
                    return;
                }
                SuccessAlert("Grup Oluşturuldu");
                closeModal();
            }
        } catch (error) {
            const errorMessage = error?.data?.message || "Bir hata oluştu, lütfen tekrar deneyin.";
            ErrorAlert(errorMessage);
        }
    };

    const handleSaveChanges = async () => {
        try {
            const formDataCopy = { ...formData };

            if ((!formDataCopy.photo && !formDataCopy.photoUrl) || (formDataCopy.photoUrl === null && formDataCopy.photo === null)) {
                formDataCopy.photoUrl = defaultGroupPhoto;
            }

            if (formDataCopy.photoUrl && formDataCopy.photoUrl instanceof File) {
                const reader = new FileReader();

                reader.onload = () => {
                    const base64String = reader.result.split(',')[1];
                    formDataCopy.photoUrl = base64String;

                    editGroup({ groupId, formData: formDataCopy }).unwrap();
                    SuccessAlert("Değişiklikler kayıt edildi");
                    closeModal();
                };

                reader.readAsDataURL(formDataCopy.photoUrl);
            } else {
                await editGroup({ groupId, formData: formDataCopy }).unwrap();
                SuccessAlert("Değişiklikler kayıt edildi");
                closeModal();
            }
        } catch (error) {
            if (error.data && error.data.message.includes("Grup kurucusu yöneticilikten")) {
                ErrorAlert(error.data.message);
            } else {
                ErrorAlert("Bir hata meydana geldi");
            }
        }
    };

    const handleLeaveGroup = async () => {
        try {
            await leaveGroup(groupId).unwrap();
            SuccessAlert("Gruptan Çıktın")
            closeModal();
        } catch (error) {
            ErrorAlert("Bir hata meydana geldi", error);
        }
    }

    // ----------------------------JSX----------------------------------

    return (
        <div className="new-group-modal">
            <CloseModalButton closeModal={closeModal} />
            <div className="title-box">
                {isGroupSettings ? (
                    <>
                        <IoMdSettings className="setting-icon" />
                        <p>Grup Ayarları</p>
                    </>
                ) : (
                    <>
                        <img src={star} alt="" />
                        <p>Yeni bir grup oluştur</p>
                    </>
                )}
            </div>
            <div className="contents">
                <div className="choose-group-image">
                    <p>Grup Resmi</p>
                    <div className="group-image-box">
                        {isGroupSettings
                            ? <img src={getPhotoURL(formData.photoUrl)} alt="Group" />
                            : <img src={getPhotoURL(formData.photo)} alt="Group" />
                        }

                        <label className="edit-image-btn">
                            <IconButton
                                className={"edit-btn"}
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
                                            marginTop: "-27px"
                                        },
                                    },
                                }}
                            >
                                <MenuItem
                                    onClick={handleShowGroupImage}
                                    sx={{ color: "#585CE1" }}
                                >
                                    <ListItemIcon sx={{ color: "inherit" }}>
                                        <ImageSearchRoundedIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Görüntüle"
                                        primaryTypographyProps={{
                                            fontFamily: "Montserrat",
                                            fontWeight: "700",
                                            fontSize: "14px",
                                        }}
                                    />
                                </MenuItem>

                                <MenuItem
                                    onClick={handleChangeGroupImage}
                                    sx={{ color: "#585CE1" }}
                                >
                                    <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
                                        <AddPhotoAlternateRoundedIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Değiştir"
                                        primaryTypographyProps={{
                                            fontFamily: "Montserrat",
                                            fontWeight: "700",
                                            fontSize: "14px",
                                        }}
                                    />
                                </MenuItem>

                                <MenuItem
                                    onClick={handleDeleteGroupImage}
                                    sx={{ color: "#EB6262" }}
                                >
                                    <ListItemIcon sx={{ color: "inherit" }}>
                                        <DeleteOutlineRoundedIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Kaldır"
                                        primaryTypographyProps={{
                                            fontFamily: "Montserrat",
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
                        {isShowProfileImage &&
                            <div className="full-size-group-image-box">
                                <img src={getPhotoURL(formData.photoUrl || formData.photo)} alt="Group" />
                                <button onClick={() => setIsShowProfileImage(false)}>
                                    <MdClose />
                                </button>
                            </div>
                        }
                    </div>
                </div>
                <div className="input-boxs">
                    <div className="input-box">
                        <p>Grup Adı</p>
                        <input
                            type="text"
                            placeholder="Bir grup adı belirle..."
                            value={formData.name}
                            onChange={handleGroupNameChange}
                            maxLength={40}
                        />
                    </div>
                    <div className="input-box">
                        <p>Grup Açıklaması</p>
                        <input
                            type="text"
                            placeholder="Grup açıklaması belirle..."
                            value={formData.description}
                            onChange={handleGroupDescriptionChange}
                            maxLength={50}
                        />
                    </div>
                </div>

                <div className="group-members-box">
                    <h2>Grup Üyeleri</h2>

                    {!isGroupSettings &&
                        <div className="group-admin">
                            <img src={user.profilePhoto} alt="Admin Profile Image" />
                            <div className="admin-info">
                                <p className="user-display-name">{user.displayName}</p>
                                <span>Yönetici</span>
                            </div>
                        </div>
                    }

                    <div className="other-users">
                        {formData.participants &&
                            Object.keys(formData.participants)
                                .sort((a, b) => {
                                    const userA = formData.participants[a];
                                    const userB = formData.participants[b];

                                    // Öncelikle isCurrentUser olan kullanıcıyı en üste taşır
                                    if (a === userId) return -1;
                                    if (b === userId) return 1;

                                    // Sonrasında role değeri 0 olanları önce sıralar (Yönetici)
                                    if (userA.role === 0 && userB.role !== 0) return -1;
                                    if (userA.role !== 0 && userB.role === 0) return 1;

                                    // Diğerleri için sıralama yapmaz
                                    return 0;
                                })
                                .filter((participantId) => formData.participants[participantId].role !== 2)
                                .map((participantId) => {
                                    const user = formData.participants[participantId];
                                    const isCurrentUser = participantId === userId;

                                    return (
                                        <div className="user-box" key={participantId}>
                                            <div className="user-info">
                                                <img src={user.profilePhoto}
                                                    onError={(e) => e.currentTarget.src = defaultProfilePhoto}
                                                    alt={user.displayName} />
                                                <div className="username-and-role-box">
                                                    <p className="user-display-name">{user.displayName}</p>
                                                    {isCurrentUser ? (
                                                        <p style={{ color: "#585CE1", fontSize: "14px" }}>Yönetici</p>
                                                    ) : (
                                                        <select
                                                            defaultValue={user.role}
                                                            onChange={(e) => handleroleChange(participantId, e.target.value)}
                                                        >
                                                            <option value={1}>Üye</option>
                                                            <option value={0}>Yönetici</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                className="remove-user-box"
                                                onClick={() =>
                                                    isCurrentUser
                                                        ? handleLeaveGroup()
                                                        : handleRemoveUser(participantId)
                                                }
                                            >
                                                <MdPersonRemoveAlt1 className="icon" />
                                                <span>
                                                    {isSmallScreen
                                                        ? (isCurrentUser ? "Ayrıl" : "Çıkar")
                                                        : (isCurrentUser ? "Gruptan Ayrıl" : "Gruptan Çıkar")}
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}
                    </div>

                    <div className="option-buttons">
                        <button onClick={() => setAddUserModal(true)}>
                            <HiUserAdd className="icon" />
                            Üye Ekle
                        </button>
                        {isGroupSettings ? (
                            <button
                                onClick={handleSaveChanges}
                                disabled={isSaveDisabled}
                                className={isSaveDisabled ? "disabled" : ""}
                            >
                                Kaydet
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={!isSubmitReady}
                                style={{ opacity: isSubmitReady ? 1 : 0.8 }}>
                                Grubu Oluştur
                            </button>
                        )}
                    </div>
                </div>
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

// PropTypes validation
NewAndSettingsGroupModal.propTypes = {
    closeModal: PropTypes.func.isRequired,
    isGroupSettings: PropTypes.bool,
    groupProfile: PropTypes.shape({
        name: PropTypes.string,
        description: PropTypes.string,
        photoUrl: PropTypes.string,
        photo: PropTypes.string,
        participants: PropTypes.object,
    }),
    groupId: PropTypes.string,
    userId: PropTypes.string.isRequired,
};

export default NewAndSettingsGroupModal;