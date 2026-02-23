import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSignalR } from "../../../contexts/SignalRContext";
import { useDispatch } from 'react-redux';
import PropTypes from 'prop-types';

import CloseModalButton from "../../../contexts/components/CloseModalButton";
import { BiSolidMicrophone } from "react-icons/bi";
import ReactAudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

import PreLoader from '../PreLoader/PreLoader';
import { opacityEffect } from '../../animations/animations';
import { ErrorAlert } from '../../../helpers/customAlert';
import { convertFileToBase64 } from '../../../store/helpers/convertFileToBase64';
import {
    addPendingUpload,
    markPendingUploadSent,
    removePendingUpload,
    updatePendingUpload,
} from '../../../store/Slices/chats/pendingUploadsSlice';
import {
    registerPendingUploadAbortController,
    unregisterPendingUploadAbortController,
} from '../../upload/pendingUploadAbortRegistry';

import { motion } from "framer-motion";
import "./style.scss";

function SoundRecordModal({ closeModal, chatId }) {

    const location = useLocation();
    const { chatConnection } = useSignalR();
    const dispatch = useDispatch();

    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [recordStarted, setRecordStarted] = useState(false);
    const [recordFinished, setRecordFinished] = useState(false);
    const [wavesAnimation, setWavesAnimation] = useState(false);

    const [timer, setTimer] = useState(0);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioStream, setAudioStream] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);

    useEffect(() => {
        let timerInterval;
        if (isRecording) {
            timerInterval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else if (!isRecording && timer > 0) {
            clearInterval(timerInterval);
        }

        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [isRecording, timer]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);

            const chunks = [];
            recorder.ondataavailable = (event) => {
                chunks.push(event.data);
            };
            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioUrl(audioUrl);
                setAudioChunks(chunks);
            };

            recorder.start();
            setAudioChunks(chunks);
            setIsRecording(true);
            setRecordStarted(true);
            setWavesAnimation(true);
        } catch (error) {
            console.error("Recording error:", error);
            ErrorAlert("خطایی رخ داده است");
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        setWavesAnimation(false);
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
        if (audioStream) {
            const tracks = audioStream.getTracks();
            tracks.forEach(track => track.stop());
        }
        setRecordFinished(true);
    };

    const finishRecording = () => {
        stopRecording();
        setTimer(0);
    };

    const combineAudioChunks = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        return audioUrl;
    };

    const handleDeleteAudio = () => {
        setAudioUrl(null);
        setRecordStarted(false);
        setRecordFinished(false);
        setWavesAnimation(false);
        setAudioChunks([]);
        setTimer(0);

        if (mediaRecorder) {
            mediaRecorder.stop();
        }
        if (audioStream) {
            const tracks = audioStream.getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    const handleSendAudio = async () => {
        const chatType = location.pathname.includes('chats') || location.pathname.includes('archives')
            ? 'Individual'
            : 'Group';
        const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const abortController = new AbortController();

        try {
            setIsLoading(true);

            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioFile = new File([audioBlob], "voice-message.wav", { type: "audio/wav" });

            dispatch(addPendingUpload({
                id: pendingId,
                chatId,
                chatType,
                contentType: 3,
                fileName: audioFile.name,
                fileSize: audioFile.size,
                progress: 0,
                phase: "preparing",
                statusText: "در حال آماده سازی...",
                createdAt: new Date().toISOString(),
            }));
            registerPendingUploadAbortController(pendingId, abortController);

            const base64String = await convertFileToBase64(audioFile, (percent) => {
                dispatch(updatePendingUpload({
                    id: pendingId,
                    changes: {
                        progress: percent,
                        phase: "preparing",
                        statusText: "در حال آماده سازی...",
                    },
                }));
            }, { signal: abortController.signal });

            dispatch(updatePendingUpload({
                id: pendingId,
                changes: {
                    progress: 95,
                    phase: "sending",
                    statusText: "در حال ارسال...",
                },
            }));

            await chatConnection.invoke("SendMessage", chatType, chatId, {
                ContentType: 3,
                ClientMessageId: pendingId,
                content: base64String,
                FileName: "voice-message.wav",
            });
            dispatch(markPendingUploadSent(pendingId));
            setTimeout(() => {
                dispatch(removePendingUpload(pendingId));
            }, 900);

            closeModal();
        } catch (error) {
            if (error?.name === "AbortError") {
                dispatch(updatePendingUpload({
                    id: pendingId,
                    changes: { phase: "cancelled", statusText: "لغو شد" },
                }));
                setTimeout(() => {
                    dispatch(removePendingUpload(pendingId));
                }, 450);
            } else {
                dispatch(removePendingUpload(pendingId));
                console.error("Audio send error:", error);
                ErrorAlert("خطایی رخ داده است");
            }
        } finally {
            unregisterPendingUploadAbortController(pendingId);
            setIsLoading(false);
        }
    };

    const handleRemoveAudioTrack = () => {
        if (audioStream) {
            const tracks = audioStream.getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    return (
        <div className='sound-record-box'>
            <div onClick={handleRemoveAudioTrack}>
                <CloseModalButton closeModal={closeModal} />
            </div>
            <div className="sound-record-content">
                <div className="title-box">
                    <BiSolidMicrophone />
                    <p>صدای خود را ضبط کنید</p>
                </div>
                {!recordFinished &&
                    <div className='content-box'>
                        <div className="sound-waves-box">
                            <div className={`wave ${wavesAnimation ? 'animate first' : ''}`}></div>
                            <div className={`wave ${wavesAnimation ? 'animate second' : ''}`}></div>
                            <div className={`wave ${wavesAnimation ? 'animate last' : ''}`}></div>
                        </div>

                        <div className="record-time">
                            {String(Math.floor(timer / 60)).padStart(2, '0')}:
                            {String(timer % 60).padStart(2, '0')}
                        </div>
                    </div>
                }

                {recordFinished && audioUrl && (
                    <motion.div
                        className="record-finished-box"
                        variants={opacityEffect(0.8)}
                        initial="initial"
                        animate="animate"
                        style={{ width: "100%" }}
                    >
                        <div className="audio-player-wrapper">
                            <ReactAudioPlayer
                                src={combineAudioChunks()}
                                autoPlay={false}
                                controls
                            />
                        </div>
                    </motion.div>
                )}

                <div className="options-box">
                    {recordStarted && !recordFinished && (
                        <button
                            className="record-button"
                            onClick={finishRecording}
                            type="button"
                        >
                            پایان ضبط
                        </button>
                    )}
                    {!recordStarted && !recordFinished && (
                        <button
                            className="record-button"
                            onClick={startRecording}
                            type="button"
                        >
                            شروع ضبط
                        </button>
                    )}
                </div>

                {recordFinished && audioUrl &&
                    <div className='send-and-cancel-buttons-box'>
                        <button onClick={handleDeleteAudio} type="button">حذف</button>
                        <button onClick={handleSendAudio} type="button">ارسال</button>
                    </div>
                }
            </div>
            {isLoading && <PreLoader />}
        </div>
    );
}

SoundRecordModal.propTypes = {
    closeModal: PropTypes.func.isRequired,
    chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default SoundRecordModal;

