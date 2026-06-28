// @ts-nocheck
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

import { useModal } from "../../contexts/ModalContext";
import { useSignalR } from "../../contexts/SignalRContext";
import { useOutsideClick } from "../../hooks/useOutsideClick";
import useScreenWidth from "../../hooks/useScreenWidth";

import { IoChatbubbleEllipses } from "react-icons/io5";
import { PiPhoneFill } from "react-icons/pi";
import { HiMenu } from "react-icons/hi";
import { HiArchiveBox, HiUserGroup } from "react-icons/hi2";
import { AiFillHome } from "react-icons/ai";
import { IoMdSettings } from "react-icons/io";
import { LuLogOut } from "react-icons/lu";

import { useLogoutUserMutation } from "../../store/Slices/auth/authApi";
import { ErrorAlert, SuccessAlert } from "../../helpers/customAlert";
import { applyTheme } from "../../helpers/applyTheme";

import SettingsModal from "../../components/Settings/SettingsModal";

import "./style.scss";
import { BiLogOutCircle } from "react-icons/bi";

function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const { showModal, closeModal } = useModal();

  const {
    chatConnection,
    notificationConnection,
    callConnection,
  } = useSignalR();

  const [logoutUser, { isLoading: isLoggingOut }] =
    useLogoutUserMutation();

  const [isOpen, setIsOpen] = useState(false);
  const isSmallScreen = useScreenWidth(900);
  const sidebarRef = useRef(null);

  const restrictedPaths = ["chats/", "calls/", "archives/", "groups/"];

  const shouldHideSidebar =
    isSmallScreen &&
    restrictedPaths.some(
      (path) =>
        location.pathname.startsWith(`/${path}`) &&
        location.pathname.length > path.length + 1
    );

  const navItems = [
    {
      icon: <IoChatbubbleEllipses className="icon" />,
      label: "گفت‌وگوها",
      path: "/chats",
    },
    {
      icon: <PiPhoneFill className="icon" />,
      label: "تماس‌ها",
      path: "/calls",
    },
    {
      icon: <HiArchiveBox className="icon" />,
      label: "بایگانی‌ها",
      path: "/archives",
    },
    {
      icon: <HiUserGroup className="icon" />,
      label: "گروه‌ها",
      path: "/groups",
    },
  ];

  if (!isSmallScreen) {
    navItems.push({
      icon: <AiFillHome className="icon home" />,
      label: "صفحه اصلی",
      path: "/home",
    });
  }

  useOutsideClick(sidebarRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSettings = () => {
    showModal(<SettingsModal closeModal={closeModal} />);
  };

  const toggleSidebar = () => {
    setIsOpen((previousValue) => !previousValue);
  };

  const stopConnection = async (connection) => {
    if (!connection) {
      return;
    }

    try {
      await connection.stop();
    } catch {
      ErrorAlert("قطع ارتباط با سرور با خطا مواجه شد.");
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      await Promise.all([
        stopConnection(chatConnection),
        stopConnection(notificationConnection),
        stopConnection(callConnection),
      ]);

      await logoutUser().unwrap();

      dispatch({ type: "RESET_STORE" });
      applyTheme("Light");
      closeModal();
      navigate("/login", { replace: true });

      SuccessAlert("خروج انجام شد");
    } catch (error) {
      console.error("Logout failed:", error);
      ErrorAlert("خروج انجام نمی‌شود");
    }
  };

  const isActive = (path) =>
    location.pathname.startsWith(path) ? "active" : "";

  if (shouldHideSidebar) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className={`sidebar-container ${isOpen ? "open" : ""}`}
    >
      <div className="top-box">
        <button
          type="button"
          id="menu-btn"
          className={`nav-buttons ${isOpen ? "open" : ""}`}
          onClick={toggleSidebar}
          aria-label="باز و بسته کردن منو"
        >
          <HiMenu className="icon" />
        </button>

        <div className="navigation-buttons">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.path}
              className={`nav-buttons ${isOpen ? "open" : ""} ${isActive(
                item.path
              )}`}
              onClick={() => handleNavigation(item.path)}
            >
              {item.icon}
              {isOpen && <span>{item.label}</span>}
            </button>
          ))}
          {isSmallScreen && <button
            type="button"
            className={`nav-buttons ${isOpen ? "open" : ""}`}
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="خروج از حساب کاربری"
          >
            <BiLogOutCircle className="icon text-red-500" />
            {isOpen && <span>خروج</span>}
          </button>
          }
        </div>
      </div>

      <div
        className="bottom-box"
        style={{ width: isOpen ? "100%" : undefined }}
      >
        <button
          type="button"
          className={`nav-buttons ${isOpen ? "open" : ""}`}
          onClick={handleSettings}
        >
          <IoMdSettings className="icon" />
          {isOpen && <span>تنظیمات</span>}
        </button>

        <button
          type="button"
          className={`nav-buttons ${isOpen ? "open" : ""}`}
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="خروج از حساب کاربری"
        >
          <LuLogOut className="icon text-red-500" />
          {isOpen && <span>خروج</span>}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
