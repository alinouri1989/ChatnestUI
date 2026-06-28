// @ts-nocheck
import { useModal } from "../../contexts/ModalContext";
import { IoMdSettings } from "react-icons/io";

import ChatNestLogo from "../../assets/logos/ChatNestLogoWithText.svg";
import ChatNestLogo_Dark from "../../assets/logos/ChatNestLogoWithText_dark.svg";
import useThemeImage from "../../hooks/useThemeImage";

import SettingsModal from "../../components/Settings/SettingsModal";
import "./style.scss";

function Header() {
  const { showModal, closeModal } = useModal();
  const logoSrc = useThemeImage(ChatNestLogo, ChatNestLogo_Dark);

  const handleSettings = () => {
    showModal(<SettingsModal closeModal={closeModal} />);
  };

  return (
    <header>
      <img src={logoSrc} alt="" />
      <button onClick={handleSettings}><IoMdSettings /></button>
    </header>
  )
}

export default Header
