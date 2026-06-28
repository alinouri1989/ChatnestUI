// @ts-nocheck
export const formatTime = (elapsedTime) => {
    const hours = Math.floor(elapsedTime / 3600).toString();
    const minutes = Math.floor((elapsedTime % 3600) / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (elapsedTime % 60).toString().padStart(2, "0");

    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
};