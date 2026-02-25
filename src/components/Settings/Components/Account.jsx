import { useState } from "react";
import { useSelector } from "react-redux";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { TbEdit } from "react-icons/tb";
import { FaCheck } from "react-icons/fa";
import { MdClose } from 'react-icons/md';

import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import ImageSearchRoundedIcon from '@mui/icons-material/ImageSearchRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';

import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";
import { convertFileToBase64 } from "../../../store/helpers/convertFileToBase64";
import {
  useUpdateDisplayNameMutation,
  useUpdateUserIdentifierMutation,
  useUpdatePhoneNumberMutation,
  useUpdateBiographyMutation,
  useRemoveProfilePhotoMutation,
  useUpdateProfilePhotoMutation
} from "../../../store/Slices/userSettings/userSettingsApi";

import { biographySchema, displayNameSchema, phoneNumberSchema, userIdentifierSchema } from "../../../schemas/AccountSchemas";

function Account() {

  const { user } = useSelector(state => state.auth);
  const isDarkMode = user?.userSettings?.theme === "Dark";

  const [selectedImage, setSelectedImage] = useState(user?.profilePhoto || "");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingUserIdentifier, setIsEditingUserIdentifier] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingBiography, setIsEditingBiography] = useState(false);
  const [isShowProfileImage, setIsShowProfileImage] = useState(false);

  const [updateDisplayName, { isLoading: isLoadingDisplayName }] = useUpdateDisplayNameMutation();
  const [updateUserIdentifier, { isLoading: isLoadingUserIdentifier }] = useUpdateUserIdentifierMutation();
  const [updateBiography, { isLoading: isLoadingBiography }] = useUpdateBiographyMutation();
  const [updatePhoneNumber, { isLoading: isLoadingPhoneNumber }] = useUpdatePhoneNumberMutation();
  const [updateProfilePhoto, { isLoading: isLoadingProfilePhoto }] = useUpdateProfilePhotoMutation();
  const [removeProfilePhoto, { isLoading: isLoadingRemovePhoto }] = useRemoveProfilePhotoMutation();

  const isLoading =
    isLoadingDisplayName ||
    isLoadingUserIdentifier ||
    isLoadingBiography ||
    isLoadingPhoneNumber ||
    isLoadingProfilePhoto ||
    isLoadingRemovePhoto;

  const { register: registerDisplayName, handleSubmit: handleDisplayNameSubmit, formState: { errors: displayNameErrors } } = useForm({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: user?.displayName },
  });

  const { register: registerPhone, handleSubmit: handlePhoneSubmit, formState: { errors: phoneNumberErrors } } = useForm({
    resolver: zodResolver(phoneNumberSchema),
    defaultValues: { phoneNumber: user?.phoneNumber || "مشخص نشده" },
  });

  const { register: registerUserIdentifier, handleSubmit: handleUserIdentifierSubmit, formState: { errors: userIdentifierErrors } } = useForm({
    resolver: zodResolver(userIdentifierSchema),
    defaultValues: { userIdentifier: user?.userIdentifier || "" },
  });

  const { register: registerBio, handleSubmit: handleBioSubmit, formState: { errors: bioErrors } } = useForm({
    resolver: zodResolver(biographySchema),
    defaultValues: { bio: user?.biography || "" },
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const onSubmitForDisplayName = async (data) => {
    setIsEditingUsername(!isEditingUsername);

    if (user.displayName !== data.displayName) {
      try {
        await updateDisplayName(data.displayName);
        SuccessAlert("نام و نام خانوادگی تغییر کرد");
      } catch {
        ErrorAlert("تغییر نام انجام نشد");
      }
    }
  };

  const onSubmitForPhoneNumber = async (data) => {
    setIsEditingPhone(!isEditingPhone);

    if (user.phoneNumber !== data.phoneNumber) {
      try {
        await updatePhoneNumber(data.phoneNumber);
        SuccessAlert("شماره تلفن به‌روزرسانی شد")
      } catch {
        ErrorAlert("به‌روزرسانی شماره تلفن انجام نشد");
      }
    }
  };

  const onSubmitForUserIdentifier = async (data) => {
    setIsEditingUserIdentifier(!isEditingUserIdentifier);

    if (user.userIdentifier !== data.userIdentifier) {
      try {
        await updateUserIdentifier(data.userIdentifier).unwrap();
        SuccessAlert("شناسه کاربر به‌روزرسانی شد");
      } catch (error) {
        ErrorAlert(error?.data?.message || "به‌روزرسانی شناسه کاربر انجام نشد");
      }
    }
  };

  const onSubmitForBio = async (data) => {
    setIsEditingBiography(!isEditingBiography);

    if (user.biography !== data.bio) {
      try {
        await updateBiography(data.bio);
        SuccessAlert("بیوگرافی به‌روزرسانی شد")
      } catch {
        ErrorAlert("به‌روزرسانی بیوگرافی انجام نشد");
      }
    }
  };

  const handleChangeProfileImage = () => {
    handleClose();
    document.getElementById("image-upload-input").click();
  };

  const handleShowProfileImage = () => {
    handleClose();
    setIsShowProfileImage(true);
  };

  const handleDeleteProfileImage = async () => {
    handleClose();
    try {
      await removeProfilePhoto().unwrap();
      SuccessAlert("عکس حذف شد")
      setSelectedImage(defaultProfilePhoto)
    } catch {
      ErrorAlert("حذف انجام نشد")
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validExtensions = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const maxFileSize = 2 * 1024 * 1024;

    if (!validExtensions.includes(file.type)) {
      return ErrorAlert("لطفا یک فایل تصویری انتخاب کنید");
    }

    if (file.size > maxFileSize) {
      return ErrorAlert("حجم عکس باید حداکثر 2 مگابایت باشد");
    }

    try {
      const base64String = await convertFileToBase64(file);
      await updateProfilePhoto(base64String).unwrap();
      setSelectedImage(base64String);
      SuccessAlert("عکس به‌روزرسانی شد");
    } catch {
      ErrorAlert("به‌روزرسانی عکس انجام نشد");
    }
  };

  const handleCopyUserIdentifier = async () => {
    if (!user?.userIdentifier) {
      ErrorAlert("شناسه کاربر موجود نیست.");
      return;
    }

    try {
      await navigator.clipboard.writeText(user.userIdentifier);
      SuccessAlert("شناسه کاربر کپی شد");
    } catch {
      ErrorAlert("کپی شناسه انجام نشد");
    }
  };

  return (
    <div className="account-box">
      <h3>حساب کاربری</h3>
      <div className="image-box">
        <img
          className="profile-image"
          src={user?.profilePhoto || defaultProfilePhoto}
          onError={(e) => e.currentTarget.src = defaultProfilePhoto}
          alt="Profile"
        />
        <IconButton
          className={"edit-btn"}
          aria-label="more"
          id="long-button"
          aria-controls={open ? "long-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-haspopup="true"
          onClick={handleClick}
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
                color: isDarkMode ? "#E4E6EB" : "#000000",
                boxShadow: "none",
                marginLeft: "36px",
                marginTop: "-27px",
              },
            },
          }}
        >
          <MenuItem
            onClick={handleShowProfileImage}
            sx={{ color: "#585CE1" }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <ImageSearchRoundedIcon />
            </ListItemIcon>
            <ListItemText
              primary="مشاهده"
              primaryTypographyProps={{
                fontFamily: "Montserrat",
                fontWeight: "700",
                fontSize: "14px",
              }}
            />
          </MenuItem>

          <MenuItem
            onClick={handleChangeProfileImage}
            sx={{ color: "#585CE1" }}
          >
            <ListItemIcon fontSize={"small"} sx={{ color: "inherit" }}>
              <AddPhotoAlternateRoundedIcon />
            </ListItemIcon>
            <ListItemText
              primary="تغییر"
              primaryTypographyProps={{
                fontFamily: "Montserrat",
                fontWeight: "700",
                fontSize: "14px",
              }}
            />
          </MenuItem>

          {selectedImage !== defaultProfilePhoto &&
            <MenuItem
              onClick={handleDeleteProfileImage}
              sx={{ color: "#EB6262" }}
            >
              <ListItemIcon sx={{ color: "inherit" }}>
                <DeleteOutlineRoundedIcon />
              </ListItemIcon>
              <ListItemText
                primary="حذف"
                primaryTypographyProps={{
                  fontFamily: "Montserrat",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              />
            </MenuItem>
          }
        </Menu>
        {isShowProfileImage &&
          <div className="full-size-profil-image-box">
            <img src={user.profilePhoto} alt="User Profile"
              onError={(e) => e.currentTarget.src = defaultProfilePhoto}
            />
            <button onClick={() => setIsShowProfileImage(false)}>
              <MdClose />
            </button>
          </div>
        }
        <input
          id="image-upload-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />
      </div>

      <form onSubmit={handleDisplayNameSubmit(onSubmitForDisplayName)}>
        <div className="name-box">
          {isEditingUsername ? (
            <input
              {...registerDisplayName("displayName")}
              type="text"
              placeholder="نام و نام خانوادگی را وارد کنید..."
              autoFocus
            />
          ) : (
            <p>{user.displayName}</p>
          )}

          {!isEditingUsername && (
            <button
              className="edit-btn"
              type="button"
              onClick={() => setIsEditingUsername(true)}
            >
              <TbEdit />
            </button>
          )}

          {isEditingUsername && (
            <button className="edit-btn" type="submit">
              <FaCheck />
            </button>
          )}
        </div>
      </form>

      {displayNameErrors.displayName && (
        <span className="error-messages">{displayNameErrors.displayName.message}</span>
      )}

      <form>
        <div className="email-and-phone-box">
          <div className="email-box">
            <p>Email</p>
            <span>{user?.email}</span>
          </div>

          <div className="phone-box">
            <p>شناسه کاربر</p>
            <div className="phone-edit-box">
              {isEditingUserIdentifier ? (
                <input
                  {...registerUserIdentifier("userIdentifier")}
                  type="text"
                  placeholder="user_id"
                  autoFocus
                />
              ) : (
                <p>{user?.userIdentifier || "در حال ساخت..."}</p>
              )}

              {!isEditingUserIdentifier && (
                <div className="field-action-buttons">
                  <button
                    className="edit-btn copy-btn"
                    type="button"
                    onClick={handleCopyUserIdentifier}
                    title="کپی شناسه"
                  >
                    <ContentCopyRoundedIcon fontSize="inherit" />
                  </button>
                  <button
                    className="edit-btn"
                    type="button"
                    onClick={() => setIsEditingUserIdentifier(true)}
                  >
                    <TbEdit />
                  </button>
                </div>
              )}

              {isEditingUserIdentifier && (
                <button
                  className="edit-btn"
                  type="submit"
                  onClick={handleUserIdentifierSubmit(onSubmitForUserIdentifier)}
                >
                  <FaCheck />
                </button>
              )}
            </div>
            {userIdentifierErrors.userIdentifier && (
              <span className="error-messages">{userIdentifierErrors.userIdentifier.message}</span>
            )}
          </div>

          <div className="phone-box">
            <p>تلفن</p>
            <div className="phone-edit-box">
              {isEditingPhone ? (
                <input
                  {...registerPhone("phoneNumber")}
                  type="text"
                  placeholder="شماره تلفن را وارد کنید..."
                  autoFocus
                />
              ) : (
                <p>{user?.phoneNumber || "مشخص نشده"}</p>
              )}

              {!isEditingPhone && (
                <button
                  className="edit-btn"
                  type="button"
                  onClick={() => setIsEditingPhone(true)}
                >
                  <TbEdit />
                </button>
              )}

              {isEditingPhone && (
                <button
                  className="edit-btn"
                  type="submit"
                  onClick={handlePhoneSubmit(onSubmitForPhoneNumber)}
                >
                  <FaCheck />
                </button>
              )}
            </div>
            {phoneNumberErrors.phoneNumber && (
              <span className="error-messages">{phoneNumberErrors.phoneNumber.message}</span>
            )}
          </div>

          <div className="biography-box">
            <div className="biograpy-edit-box">
              <p>بیوگرافی</p>

              {!isEditingBiography && (
                <button
                  className="edit-btn"
                  type="button"
                  onClick={() => setIsEditingBiography(true)}
                >
                  <TbEdit />
                </button>
              )}

              {isEditingBiography && (
                <button
                  className="edit-btn"
                  type="submit"
                  onClick={handleBioSubmit(onSubmitForBio)}
                >
                  <FaCheck />
                </button>
              )}
            </div>

            {!isEditingBiography ? (
              <span className="biography-span">{user?.biography}</span>
            ) : (
              <textarea
                {...registerBio("bio")}
                type="text"
                placeholder="بیوگرافی خود را وارد کنید..."
                autoFocus
              />
            )}
          </div>
          {bioErrors.bio && (
            <span className="error-messages">{bioErrors.bio.message}</span>
          )}
        </div>
      </form>

      {isLoading && <PreLoader />}
    </div >
  );
}

export default Account;
