import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { useDebounce } from '../../../hooks/useDebounce';
import { useSignalR } from '../../../contexts/SignalRContext';

import { MdClose } from 'react-icons/md';
import { HiUserAdd } from "react-icons/hi";
import { HiCheckCircle } from "react-icons/hi2";
import { BiSearchAlt } from "react-icons/bi";
import { TiThList } from "react-icons/ti";
import { AiFillInfoCircle } from "react-icons/ai";
import star from "../../../assets/svg/star.svg";

import PreLoader from '../../../shared/components/PreLoader/PreLoader';
import { opacityEffect } from '../../../shared/animations/animations.js';
import { ErrorAlert, SuccessAlert } from '../../../helpers/customAlert';
import { motion } from "framer-motion";
import "../../Chats/Components/NewChat/style.scss";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto.js";

function AddUser({ closeUserModal, setFormData, formData }) {

    const { notificationConnection } = useSignalR();
    const [inputValue, setInputValue] = useState("");
    const debouncedSearchQuery = useDebounce(inputValue, 300);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!notificationConnection || !debouncedSearchQuery) return;

        setLoading(true);
        setError(null);

        const handleReceiveSearchUsers = (response) => {
            if (!response || response.query !== debouncedSearchQuery) return;

            const formattedUsers = Object.entries(response.data || {}).map(([id, user]) => ({
                userId: id,
                ...user,
            }));

            if (formattedUsers.length === 0) {
                setError("چنین کاربری پیدا نشد.");
            }

            setUsers(formattedUsers);
            setLoading(false);
        };

        notificationConnection.off("ReceiveSearchUsers");
        notificationConnection.on("ReceiveSearchUsers", handleReceiveSearchUsers);
        notificationConnection.invoke("SearchUsers", debouncedSearchQuery).catch((err) => {
            setError(err.message);
            setLoading(false);
        });

        return () => {
            notificationConnection.off("ReceiveSearchUsers", handleReceiveSearchUsers);
        };
    }, [debouncedSearchQuery, notificationConnection]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleAddSelectedUser = (userId) => {
        const selectedUser = users.find(user => user.userId === userId);
        if (!selectedUser) return;
        if (!formData.participants || !formData.participants[userId]) {
            setFormData(prevState => ({
                ...prevState,
                participants: {
                    ...prevState.participants,
                    [userId]: {
                        displayName: selectedUser.displayName,
                        role: 1,
                        profilePhoto: selectedUser.profilePhoto
                    }
                }
            }));
            SuccessAlert("کاربر اضافه شد", 1000);
        } else {
            const currentRole = formData.participants[userId].role;
            if (currentRole === 2) {
                const updatedParticipants = { ...formData.participants };
                updatedParticipants[userId] = { ...updatedParticipants[userId], role: 1 };
                setFormData(prevState => ({
                    ...prevState,
                    participants: updatedParticipants
                }));
                SuccessAlert("کاربر اضافه شد.", 1000);
            } else if (currentRole === 1 || currentRole === 0) {
                ErrorAlert("این کاربر قبلا اضافه شده است.", 1500);
            }
        }
    };

    return (
        <div className='add-user-modal'>
            <div className="fullsize-overlay">
                <div className="card">
                    <button onClick={closeUserModal} className='modal-close'><MdClose /></button>
                    <div className="title-and-input-bar">
                        <div className="title-box">
                            <img src={star} alt="Star icon" />
                            <p>افزودن عضو</p>
                        </div>
                        <div className="search-user-input-box">
                            <BiSearchAlt className="icon" />
                            <input
                                type="text"
                                placeholder="با نام کاربری یا ایمیل جستجو کنید..."
                                value={inputValue}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                    {loading && <PreLoader />}
                    {error && !loading && (
                        <motion.div
                            variants={opacityEffect(0.8)}
                            initial="initial"
                            animate="animate"
                            className="no-result-box active">
                            <AiFillInfoCircle className="icon" />
                            <p>{error}</p>
                        </motion.div>
                    )}
                    {!loading && users.length > 0 && (
                        <motion.div
                            variants={opacityEffect(0.8)}
                            initial="initial"
                            animate="animate"
                            className="user-list-box active">
                            <div className="result-number-box">
                                <TiThList className="icon" />
                                <p>{users.length} کاربر نمایش داده می‌شود</p>
                            </div>
                            <div className="users-box">
                                {users.map(user => {
                                    const isAlreadyAdded = formData.participants && formData.participants[user.userId];
                                    const userRole = isAlreadyAdded ? formData.participants[user.userId].role : null;
                                    return (
                                        <div key={user.userId} className="user-box" onClick={() => handleAddSelectedUser(user.userId)}>
                                            <div className='image-box'>
                                                <img src={user.profilePhoto ?? defaultProfilePhoto}
                                                    onError={(e) => e.currentTarget.src = defaultProfilePhoto}
                                                    alt={user.displayName} />
                                            </div>
                                            <div className="user-info">
                                                <p>{user.displayName}</p>
                                                <span>{user.email}</span>
                                            </div>
                                            <div className='add-user-box'>
                                                {isAlreadyAdded ? (
                                                    userRole === 2 ? null : (
                                                        <>
                                                            <HiCheckCircle className='icon' />
                                                            <p>اضافه شد</p>
                                                        </>
                                                    )
                                                ) : (
                                                    <>
                                                        <HiUserAdd className='icon' />
                                                        <p>افزودن</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

// PropTypes validation
AddUser.propTypes = {
    closeUserModal: PropTypes.func.isRequired,
    setFormData: PropTypes.func.isRequired,
    formData: PropTypes.shape({
        participants: PropTypes.object,
    }).isRequired,
};

export default AddUser;
