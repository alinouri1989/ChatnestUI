// @ts-nocheck
import ChatNestLogo from "../../../assets/logos/ChatNestLogoWithText.svg";
import ChatNestLogo_Dark from "../../../assets/logos/ChatNestLogoWithText_dark.svg";
import useThemeImage from "../../../hooks/useThemeImage";
import { motion } from "framer-motion";
import "./style.scss";

function ChatNestPreLoader() {
    const logoSrc = useThemeImage(ChatNestLogo, ChatNestLogo_Dark);

    return (
        <motion.div
            className="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
        >
            <img src={logoSrc} alt="" />
            <div className="progress-bar">
                <div className="progress"></div>
            </div>
        </motion.div>
    );
}

export default ChatNestPreLoader;

export const opacityEffect = (duration = 0.8) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration }
});
