import { useState, useRef, useEffect } from 'react';
import { Slider, Stack } from '@mui/material';
import PropTypes from 'prop-types';
import useScreenWidth from "../../../../hooks/useScreenWidth";
import { NestDownloadIcon, NestPauseIcon, NestPlayIcon } from "../../BrandIcons/BrandIcons.jsx";

export function AudioMessage({ content }) {

    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const isScreenSmall = useScreenWidth(540);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (audioElement) {
            const handleLoadedMetadata = () => {
                setDuration(audioElement.duration);
            };

            audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
            
            // If metadata is already loaded
            if (audioElement.readyState >= 1) {
                setDuration(audioElement.duration);
            }

            return () => {
                audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [content]);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleSeek = (event, newValue) => {
        if (audioRef.current) {
            audioRef.current.currentTime = newValue;
            setCurrentTime(newValue);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = content;
        link.download = 'ChatNestChatSound.mp3';
        link.target = '_blank';
        link.click();
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    };

    return (
        <div className="audio-player">
            <audio
                ref={audioRef}
                src={content}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                preload="metadata"
            />
            <div className="audio-controls">
                <button onClick={togglePlayPause} className="play-pause-btn" type="button">
                    {isPlaying ? <NestPauseIcon /> : <NestPlayIcon />}
                </button>
                <div className="progress-container">
                    <div className="time">
                        {formatTime(currentTime)}
                    </div>
                    <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
                        <Slider
                            aria-label="Audio Progress"
                            value={currentTime}
                            onChange={handleSeek}
                            min={0}
                            max={duration || 0}
                            step={0.1}
                            className="custom-slider"
                            sx={{ width: isScreenSmall ? '50px' : '120px' }}
                        />
                    </Stack>
                    <div className="time">
                        {formatTime(duration)}
                    </div>
                </div>
                <button onClick={handleDownload} className="download-btn" type="button">
                    <NestDownloadIcon />
                </button>
            </div>
        </div>
    );
}

AudioMessage.propTypes = {
    content: PropTypes.string.isRequired,
};
