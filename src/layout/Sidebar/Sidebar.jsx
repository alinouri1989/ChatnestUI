import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useModal } from "../../contexts/ModalContext.jsx";
import { useOutsideClick } from "../../hooks/useOutsideClick";

import { IoChatbubbleEllipses } from "react-icons/io5";
import { PiPhoneFill } from "react-icons/pi";
import { HiArchiveBox } from "react-icons/hi2";
import { HiUserGroup } from "react-icons/hi2";
import { AiFillHome } from "react-icons/ai";
import { IoMdSettings } from "react-icons/io";
import { HiMenu } from "react-icons/hi";

import useScreenWidth from "../../hooks/useScreenWidth.js";
import "./style.scss";
import SettingsModal from "../../components/Settings/SettingsModal.jsx";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showModal, closeModal } = useModal();

  const [isOpen, setIsOpen] = useState(false);
  const isSmallScreen = useScreenWidth(900);
  const sidebarRef = useRef(null);

  const restrictedPaths = ["sohbetler/", "aramalar/", "arsivler/", "gruplar/"];

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
      path: "/sohbetler",
    },
    {
      icon: <PiPhoneFill className="icon" />,
      label: "تماس‌ها",
      path: "/aramalar",
    },
    {
      icon: <HiArchiveBox className="icon" />,
      label: "بایگانی‌ها",
      path: "/arsivler",
    },
    {
      icon: <HiUserGroup className="icon" />,
      label: "گروه‌ها",
      path: "/gruplar",
    },
  ];

  if (!isSmallScreen) {
    navItems.push({
      icon: <AiFillHome className="icon home" />,
      label: "صفحه اصلی",
      path: "/anasayfa",
    });
  }

  useOutsideClick(sidebarRef, () => {
    if (isOpen) setIsOpen(false);
  });

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSettings = () => {
    showModal(<SettingsModal closeModal={closeModal} />);
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path) => (location.pathname.includes(path) ? "active" : "");

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
          className={`nav-buttons ${isOpen ? "open" : ""}`}
          id="menu-btn"
          onClick={toggleSidebar}
        >
          <HiMenu className="icon" />
        </button>

        <div className="navigation-buttons">
          {navItems.map((item, index) => (
            <button
              key={index}
              className={`nav-buttons ${isOpen ? "open" : ""} ${isActive(
                item.path
              )}`}
              onClick={() => handleNavigation(item.path)}
            >
              {item.icon}
              {isOpen && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="bottom-box" style={{ width: isOpen ? "100%" : "" }}>
        <button
          className={`nav-buttons ${isOpen ? "open" : ""} ${
            location.pathname === "/ayarlar" ? "active" : ""
          }`}
          onClick={handleSettings}
        >
          <IoMdSettings className="icon" />
          {isOpen && <span>تنظیمات</span>}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
