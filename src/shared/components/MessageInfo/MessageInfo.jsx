import { useSelector } from "react-redux";
import PropTypes from 'prop-types';
import { formatDateForMessageInfo } from "../../../helpers/dateHelper";
import CloseModalButton from "../../../contexts/components/CloseModalButton";
import "./style.scss";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";
import { NestDoubleCheckIcon } from "../BrandIcons/BrandIcons.jsx";

function MessageInfo({ closeModal, chatId, messageId }) {

    const { Group } = useSelector(state => state.chat);
    const { groupList } = useSelector(state => state.groupList);

    const chat = Group.find(group => group.id === chatId);
    if (!chat) return <div>گفتگو یافت نشد</div>;

    const message = chat.messages.find(msg => msg.id === messageId);
    if (!message) return <div>پیام یافت نشد</div>;

    const group = groupList[chatId];
    if (!group) return <div>گروه یافت نشد</div>;

    const deliveredUsers = Object.keys(message.status.delivered || {}).filter(userId => !message.status.read[userId]);
    const readUsers = Object.keys(message.status.read || {});

    const getUserInfo = (userId) => group.participants[userId] || null;

    return (
        <div className="message-info-modal">
            <CloseModalButton closeModal={closeModal} />
            {readUsers.length > 0 && (
                <div className="message-info-section">
                    <div className="title-box">
                        <NestDoubleCheckIcon className="read" />
                        <p className="read">خوانندگان</p>
                    </div>
                    <div className={`user-list ${deliveredUsers.length > 0 ? "first" : ""}`}>
                        {readUsers.map(userId => {
                            const user = getUserInfo(userId);
                            return user ? (
                                <div key={userId} className="user-info">
                                    <div className="image-and-name-box">
                                        <img
                                            src={user.profilePhoto ?? defaultProfilePhoto}
                                            alt={`پروفایل ${user.displayName}`}
                                            className="profile-photo"
                                            onError={(e) => {
                                                e.currentTarget.src = defaultProfilePhoto;
                                            }}
                                        />
                                        <span>{user.displayName}</span>
                                    </div>
                                    <p>{formatDateForMessageInfo(message.status.read[userId])}</p>
                                </div>
                            ) : null;
                        })}
                    </div>
                </div>
            )}

            {deliveredUsers.length > 0 ? (
                <div className="message-info-section">
                    <div className="title-box">
                        <NestDoubleCheckIcon />
                        <p>تحویل شده‌ها</p>
                    </div>
                    <div className="user-list">
                        {deliveredUsers.map(userId => {
                            const user = getUserInfo(userId);
                            return user ? (
                                <div key={userId} className="user-info">
                                    <div className="image-and-name-box">
                                        <img
                                            src={user.profilePhoto ?? defaultProfilePhoto}
                                            alt={`پروفایل ${user.displayName}`}
                                            className="profile-photo"
                                            onError={(e) => {
                                                e.currentTarget.src = defaultProfilePhoto;
                                            }}
                                        />
                                        <span>{user.displayName}</span>
                                    </div>
                                    <p>{formatDateForMessageInfo(message.status.delivered[userId])}</p>
                                </div>
                            ) : (
                                <p key={userId}>تحویل داده نشده</p>
                            );
                        })}
                    </div>
                </div>
            ) : readUsers.length === 0 && (
                <div className="no-user">
                    <p>پیام ارسال شد، هیچ کاربری آن را نخوانده یا دریافت نکرده است.</p>
                </div>
            )}
        </div>
    );
}

MessageInfo.propTypes = {
    closeModal: PropTypes.func.isRequired,
    chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    messageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default MessageInfo;
