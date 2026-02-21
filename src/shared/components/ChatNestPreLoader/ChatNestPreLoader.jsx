import ChatNestLogo from "../../../assets/logos/ChatNestLogoWithText.svg";
import { motion } from "framer-motion";
import "./style.scss";

function ChatNestPreLoader() {
    return (
        <motion.div
            className="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
        >
            <img src={ChatNestLogo} alt="" />
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
