import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";

import ChatNestAI from "../../../assets/logos/ChatNestAI.svg";
import ImageGeneratorBanner from "../../../assets/images/AIModal/ImageGeneratorBanner.webp";
import TextGeneratorBanner from "../../../assets/images/AIModal/TextGeneratorBanner.webp";

import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import { downloadImageFromBase64 } from "../../../helpers/downloadImageFromBase64.js";
import { convertBase64ToImage } from "../../../store/helpers/convertBase64ToImage.js";

import { IoClose } from "react-icons/io5";
import { TbFileText } from "react-icons/tb";
import { BiImage } from "react-icons/bi";
import { HiArrowSmUp } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import { MdRefresh } from "react-icons/md";
import { AiFillLike } from "react-icons/ai";
import { MdContentCopy } from "react-icons/md";
import { LuDownload } from "react-icons/lu";
import { FaCheck } from "react-icons/fa6";
import { TbSettingsBolt } from "react-icons/tb";

import "./style.scss";
import { encryptMessage } from "../../../helpers/messageCryptoHelper.js";
import { useSignalR } from "../../../contexts/SignalRContext.jsx";
import { useGenerateImageMutation, useGenerateTextMutation } from "../../../store/Slices/ChatNestAi/ChatNestAiApi.js";
import { opacityAndTransformEffect } from "../../animations/animations.js";

export const AIModal = ({ chatId, isOpen, onClose, buttonRef }) => {

    const [generateText] = useGenerateTextMutation();
    const [generateImage] = useGenerateImageMutation();
    const { chatConnection } = useSignalR();

    const [isTextGeneratorMode, setIsTextGeneratorMode] = useState(true);

    const [textPrompt, setTextPrompt] = useState("");
    const [imagePrompt, setImagePrompt] = useState("");

    const [textAiModel] = useState("Gemini-2.0-Flash");
    const [imageAiModel, setImageAiModel] = useState("Flux");
    const [showImageModels, setShowImageModels] = useState(false);

    const [responseText, setResponseText] = useState("");
    const [responseImage, setResponseImage] = useState("");

    const [textError, setTextError] = useState(false);
    const [imageError, setImageError] = useState(false);

    const [isTextLiked, setIsTextLiked] = useState(false);
    const [isImageLiked, setIsImageLiked] = useState(false);
    const [isTextCopied, setIsTextCopied] = useState(false);

    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isContent, setIsContent] = useState(true);
    const [maxHeight, setMaxHeight] = useState("300px");

    const modalRef = useRef(null);
    const modelSelectionBoxRef = useRef(null);

    const updatePosition = () => {
        if (buttonRef.current && modalRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const modalRect = modalRef.current.getBoundingClientRect();

            if (window.innerWidth < 430) {
                setPosition({
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                });
            } else {
                setPosition({
                    top: rect.top - modalRect.height - 38,
                    left: rect.left - modalRect.width * 0.7,
                    width: "auto",
                    height: "auto",
                });
            }
        }
    };

    const handleOutsideClick = (event) => {
        if (
            modalRef.current &&
            !modalRef.current.contains(event.target) &&
            buttonRef.current &&
            !buttonRef.current.contains(event.target) &&
            !event.target.closest(".send-prompt-btn") &&
            !event.target.closest(".inputs") &&
            !event.target.closest(".delete-response") &&
            !event.target.closest(".refresh-response") &&
            !event.target.closest(".copy-text") &&
            !event.target.closest(".copy-icons") &&
            !event.target.closest(".model-selection")
        ) {
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();

            window.addEventListener("resize", updatePosition);
            window.addEventListener("scroll", updatePosition);
            window.addEventListener("click", handleOutsideClick);

            return () => {
                window.removeEventListener("resize", updatePosition);
                window.removeEventListener("scroll", updatePosition);
                window.removeEventListener("click", handleOutsideClick);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const updateHeight = () => {
            if (window.innerWidth <= 430) {
                setMaxHeight(`${window.innerHeight * 0.75}px`);
            } else {
                setMaxHeight("300px");
            }
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);

        return () => {
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(".change-ai-model-btn") && modelSelectionBoxRef.current &&
                !modelSelectionBoxRef.current.contains(event.target)) {
                setShowImageModels(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDeleteResponse = () => {
        if (isTextGeneratorMode) {
            if (textPrompt) {
                setResponseText("");
                setTextPrompt("");
                setIsTextLiked(false);
            }
        }
        else {
            if (imagePrompt) {
                setResponseImage("");
                setImagePrompt("");
                setIsImageLiked(false);
            }
        }
    };

    const handleCopyText = () => {
        if (!responseText) return;

        const tempElement = document.createElement("div");
        tempElement.innerHTML = responseText;

        const plainText = tempElement.innerText || tempElement.textContent;

        navigator.clipboard.writeText(plainText)
            .then(() => {
                setIsTextCopied(true);
                SuccessAlert("متن در کلیپ‌بورد کپی شد");
                setTimeout(() => setIsTextCopied(false), 2000);
            })
            .catch(() => {
                ErrorAlert("خطا در کپی کردن متن");
            });
    };

    const stripHtmlTags = (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent || "";
    };

    const extractBase64 = (dataUrl) => dataUrl.split(",")[1] || "";

    const getChatType = (pathname) => {
        if (pathname.includes('chats') || pathname.includes('archives')) return 'Individual';
        if (pathname.includes('groups')) return 'Group';
        return '';
    };

    const sendMessage = async (contentType, content) => {
        try {
            await chatConnection.invoke("SendMessage", getChatType(location.pathname), chatId, { ContentType: contentType, Content: content });
            onClose();
        } catch {
            ErrorAlert("خطا در ارسال پیام");
        }
    };

    const handleSendMessage = async () => {
        if (isTextGeneratorMode) {
            if (!textPrompt) return;
            const textContent = stripHtmlTags(responseText);
            const encryptedMessage = encryptMessage(textContent, chatId);
            await sendMessage(0, encryptedMessage);
        } else {
            if (!responseImage) return;
            await sendMessage(1, extractBase64(responseImage));
        }
    };

    const handleSendPrompt = async () => {
        if (!isTextGeneratorMode && !imagePrompt) {
            return;
        }
        if (isTextGeneratorMode && !textPrompt) {
            return;
        }
        if (!textAiModel && isTextGeneratorMode) {
            return;
        }
        if (!imageAiModel && !isTextGeneratorMode) {
            return;
        }

        setIsTextLiked(false);
        setIsImageLiked(false);
        setIsContent(false);
        setTextError(false);
        setImageError(false);

        const handleSuccess = (data) => {
            setIsContent(true);
            if (isTextGeneratorMode) {
                const markdownToHtml = () => marked(data.responseText);
                setResponseText(markdownToHtml);
            } else {
                setResponseImage(convertBase64ToImage(data.responseImage));
            }
        };

        const handleError = () => {
            if (isTextGeneratorMode) {
                setTextError(true);
            } else {
                setImageError(true);
            }
            setIsContent(true);
        };

        try {
            let data;
            if (isTextGeneratorMode) {
                data = await generateText({ prompt: textPrompt, aiModel: textAiModel }).unwrap();
            } else {
                data = await generateImage({ prompt: imagePrompt, aiModel: imageAiModel }).unwrap();
            }

            handleSuccess(data);
        } catch {
            handleError();
        } finally {
            setIsContent(true);
        }
    };

    const handleDownloadImage = () => {
        const base64Image = responseImage;
        downloadImageFromBase64(base64Image, 'ChatNestImage.png');
    };

    const handleModelSelect = (model) => {
        setImageAiModel(model);
        setShowImageModels(false);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            handleSendPrompt();
        }
    };

    const toggleTextGeneratorMode = () => {
        setIsTextGeneratorMode(true);
    };

    const toggleImageGeneratorMode = () => {
        setIsTextGeneratorMode(false);
    };

    const toggleImageModels = () => {
        setShowImageModels(!showImageModels);
    };

    const toggleTextLike = () => {
        setIsTextLiked(!isTextLiked);
    };

    const toggleImageLike = () => {
        setIsImageLiked(!isImageLiked);
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={modalRef}
                    className="ai-modal"
                    style={{
                        position: "absolute",
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                    }}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{
                        duration: 0.25,
                        ease: "easeOut",
                    }}
                >
                    {isContent ? (
                        <motion.div
                            className="content-box"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1.2 }}
                            transition={{ duration: 1.2 }}
                        >
                            <div className="navigation-box">
                                <img src={ChatNestAI} alt="ChatNest AI لوگو" />
                                <button onClick={toggleTextGeneratorMode} className={`text-generate-btn ${isTextGeneratorMode ? "active" : ""}`}>
                                    <TbFileText />
                                    <span>متن</span>
                                </button>

                                <button
                                    onClick={toggleImageGeneratorMode}
                                    className={`image-generate-btn ${!isTextGeneratorMode ? "active" : ""}`}>
                                    <BiImage />
                                    <span>تصویر</span>
                                </button>

                                <button onClick={onClose} className="close-btn"><IoClose /></button>
                            </div>

                            <div className="result-box">
                                {isTextGeneratorMode
                                    ?
                                    responseText ?
                                        <div style={{ maxHeight: maxHeight, overflowY: "auto" }}
                                            dangerouslySetInnerHTML={{ __html: responseText }}
                                            className="text-generator-result">
                                        </div>
                                        :
                                        <div className="banner">
                                            <img src={TextGeneratorBanner} alt="text generator banner" />
                                            {textError && <span>خطایی رخ داده است. دوباره تلاش کنید.</span>}
                                        </div>

                                    :
                                    responseImage ?
                                        <div className="image-generator-result">
                                            <img src={responseImage} alt="generated image" />
                                        </div>

                                        :
                                        <div className="banner">
                                            <img src={ImageGeneratorBanner} alt="image generator banner" />
                                            {imageError && <span>خطایی رخ داده است. دوباره تلاش کنید.</span>}
                                        </div>
                                }
                            </div>

                            <div className="options-box">
                                {isTextGeneratorMode ? (
                                    responseText ? (
                                        <div className="result-options-box">
                                            <div className="buttons">
                                                <button className="delete-response" onClick={handleDeleteResponse}><MdDelete /></button>
                                                <button className="refresh-response" onClick={handleSendPrompt}><MdRefresh /></button>
                                                <button className={`like-response ${isTextLiked ? "liked" : ""}`} onClick={toggleTextLike}><AiFillLike /></button>
                                                <button className="copy-text" onClick={handleCopyText}>
                                                    {isTextCopied ? <FaCheck className="copy-icons" /> : <MdContentCopy className="copy-icons" />}
                                                </button>
                                            </div>
                                            <button onClick={handleSendMessage} className="send-message-btn">
                                                ارسال
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="input-box">
                                            <input
                                                className="inputs"
                                                placeholder="درخواست خود را بنویسید"
                                                type="text"
                                                onKeyDown={handleKeyDown}
                                                value={textPrompt}
                                                onChange={(e) => setTextPrompt(e.target.value)}
                                            />
                                            <button className="send-prompt-btn" onClick={handleSendPrompt}>
                                                <HiArrowSmUp />
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    responseImage ? (
                                        <div className="result-options-box">
                                            <div className="buttons">
                                                <button className="delete-response" onClick={handleDeleteResponse}><MdDelete /></button>
                                                <button className="refresh-response" onClick={handleSendPrompt}><MdRefresh /></button>
                                                <button className={`like-response ${isImageLiked ? "liked" : ""}`} onClick={toggleImageLike}><AiFillLike /></button>
                                                <button className="download-image" onClick={handleDownloadImage}><LuDownload /></button>
                                            </div>
                                            <button onClick={handleSendMessage} className="send-message-btn">
                                                ارسال
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="model-selection-box">
                                                <button onClick={toggleImageModels} className="change-ai-model-btn">
                                                    <TbSettingsBolt />
                                                </button>

                                                {showImageModels && (
                                                    <motion.div
                                                        ref={modelSelectionBoxRef}
                                                        className="model-selection"
                                                        variants={opacityAndTransformEffect()}
                                                        initial="initial"
                                                        animate="animate"
                                                        exit="exit"
                                                    >
                                                        <button
                                                            className={`model-option ${imageAiModel === 'Flux' ? 'selected-model' : ''}`}
                                                            onClick={() => handleModelSelect('Flux')}
                                                        >
                                                            Flux
                                                        </button>
                                                        <button
                                                            className={`model-option ${imageAiModel === 'Artples' ? 'selected-model' : ''}`}
                                                            onClick={() => handleModelSelect('Artples')}
                                                        >
                                                            Artples
                                                        </button>
                                                        <button
                                                            className={`model-option ${imageAiModel === 'Compvis' ? 'selected-model' : ''}`}
                                                            onClick={() => handleModelSelect('Compvis')}
                                                        >
                                                            Compvis
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </div>
                                            <div className="input-box">
                                                <input
                                                    className="inputs"
                                                    placeholder="درخواست خود را بنویسید"
                                                    type="text"
                                                    onKeyDown={handleKeyDown}
                                                    value={imagePrompt}
                                                    onChange={(e) => setImagePrompt(e.target.value)}
                                                />
                                                <button className="send-prompt-btn" onClick={handleSendPrompt}>
                                                    <HiArrowSmUp />
                                                </button>
                                            </div>
                                        </>
                                    )
                                )}
                            </div>
                        </motion.div>
                    )
                        :
                        <div className="intro-box">
                            <img src={ChatNestAI} alt="ChatNest AI" />
                        </div>
                    }
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
