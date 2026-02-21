import { useModal } from "../../contexts/ModalContext";
import { IoMdSettings } from "react-icons/io";
import Logo from "../../assets/logos/ChatNestLogoWithText.svg";
import SettingsModal from "../../components/Settings/SettingsModal";
import "./style.scss";

function Header() {

  const { showModal, closeModal } = useModal();

  const handleSettings = () => {
    showModal(<SettingsModal closeModal={closeModal} />);
  };

  return (
    <header>
      <img src={Logo} alt="" />
      <button onClick={handleSettings}><IoMdSettings /></button>
    </header>
  )
}

export default Header
