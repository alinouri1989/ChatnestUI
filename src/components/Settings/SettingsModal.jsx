import { useState } from "react";
import { useDispatch } from "react-redux";
import PropTypes from 'prop-types';
import { useSignalR } from "../../contexts/SignalRContext.jsx";
import { motion } from "framer-motion";

import { IoMdSettings } from "react-icons/io";
import { FaUserCog } from "react-icons/fa";
import { PiPaintBrushFill } from "react-icons/pi";
import { MdSecurity } from "react-icons/md";
import { LuLogOut } from "react-icons/lu";
import { RiInformation2Fill } from "react-icons/ri";

import Account from "./Components/Account.jsx"
import Theme from "./Components/Theme.jsx"
import Help from "./Components/Help.jsx"
import Security from "./Components/Security.jsx";

import { useLogoutUserMutation } from "../../store/Slices/auth/authApi.js";
import { ErrorAlert, SuccessAlert } from "../../helpers/customAlert.js";
import { applyTheme } from "../../helpers/applyTheme.js";

import { opacityEffect } from "../../shared/animations/animations.js";
import CloseButton from "../../contexts/components/CloseModalButton.jsx";
import "./style.scss";

function SettingsModal({ closeModal }) {

  const dispatch = useDispatch();
  const { chatConnection, notificationConnection, callConnection } = useSignalR();

  const menuItems = [
    { id: "account", icon: <FaUserCog />, text: "حساب کاربری", component: <Account /> },
    { id: "theme", icon: <PiPaintBrushFill />, text: "تم", component: <Theme /> },
    { id: "security", icon: <MdSecurity />, text: "امنیت", component: <Security /> },
    { id: "help", icon: <RiInformation2Fill />, text: "راهنما", component: <Help /> },
  ];

  const [activeMenu, setActiveMenu] = useState("account");
  const [logoutUser] = useLogoutUserMutation();

  const handleLogout = async () => {
    try {
      await Promise.all([
        chatConnection.stop().catch(() => ErrorAlert("خطایی رخ داده است.")),
        notificationConnection.stop().catch(() => ErrorAlert("خطایی رخ داده است.")),
        callConnection.stop().catch(() => ErrorAlert("خطایی رخ داده است."))
      ]);

      await logoutUser();
      dispatch({ type: 'RESET_STORE' });
      applyTheme("Light");
      SuccessAlert('خروج انجام شد');
      closeModal();
    } catch {
      ErrorAlert('خروج انجام نمی‌شود');
    }
  };

  const handleMenuKeyDown = (event, menuId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveMenu(menuId);
    }
  };

  const handleLogoutKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLogout();
    }
  };

  return (
    <div className="setting-general-box">
      <CloseButton closeModal={closeModal} />
      <div className="title-box">
        <IoMdSettings />
        <p>تنظیمات</p>
      </div>
      <div className="contents-box">
        <div className="sidebar">
          <div className="menu-list">
            {menuItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`menu-item ${activeMenu === item.id ? "active" : ""}`}
                onClick={() => setActiveMenu(item.id)}
                onKeyDown={(event) => handleMenuKeyDown(event, item.id)}
              >
                <div className={`active-item-line ${activeMenu === item.id ? "visible" : ""}`}></div>
                {item.icon}
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <div 
            className="menu-item logout"
            role="button"
            tabIndex={0}
            onClick={handleLogout}
            onKeyDown={handleLogoutKeyDown}
          >
            <LuLogOut className="icon" />
            <p>خروج</p>
          </div>
        </div>

        <motion.div
          className="dynamic-content"
          key={activeMenu}
          variants={opacityEffect(0.8)}
          initial="initial"
          animate="animate"
        >
          {menuItems.find((item) => item.id === activeMenu)?.component}
        </motion.div>
      </div>
    </div>
  );
}

// PropTypes validation
SettingsModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
};

export default SettingsModal;