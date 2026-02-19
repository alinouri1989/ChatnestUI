
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import ChatsList from "./components/ChatsList";
import CallsList from "./components/CallsList";
import ArchivesList from "./components/ArchivesList";
import GroupsList from "./components/GroupsList";

import { defaultProfilePhoto } from "../../constants/DefaultProfilePhoto"

import "./style.scss";

function Dashboard() {

    const location = useLocation();
    const { user } = useSelector(state => state.auth);

    const renderComponent = () => {
        const path = location.pathname;

        switch (true) {
            case path.includes("/chats"):
            case path.includes("/home"):
                return <ChatsList />;
            case path.includes("/calls"):
                return <CallsList />;
            case path.includes("/archives"):
                return <ArchivesList />;
            case path.includes("/groups"):
                return <GroupsList />;
            default:
                return <p>نتیجه‌ای یافت نشد</p>;
        }
    };

    return (
        <>
            <div className="dashboard-container">
                <div className="user-info-box">
                    <img
                        src={user.profilePhoto || defaultProfilePhoto}
                        alt=""
                        onError={(e) => e.currentTarget.src = defaultProfilePhoto}
                    />
                    <p>{user.displayName}</p>
                </div>
                <div className="dynamic-list-box">{renderComponent()}</div>
            </div>

        </>
    )
}

export default Dashboard;
