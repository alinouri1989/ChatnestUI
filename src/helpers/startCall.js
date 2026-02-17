import { setIsCallStarting } from "../store/Slices/calls/callSlice";
import { ErrorAlert } from "./customAlert";

export const startCall = async (callConnection, recipientId, isCameraCall, dispatch, openModalCallback) => {
    if (!callConnection || !recipientId) return;

    let isCallBlocked = false;

    try {
        const handler = (data) => {
            ErrorAlert(data.message);
            isCallBlocked = true;
        };
        callConnection.on("ValidationError", handler);

        await callConnection.invoke("StartCall", recipientId, isCameraCall ? 1 : 0);

        await new Promise((resolve) => setTimeout(resolve, 200));

        callConnection.off("ValidationError", handler);

        if (!isCallBlocked) {
            dispatch(setIsCallStarting(true));
            openModalCallback();
        }
    } catch {
        ErrorAlert("خطایی رخ داده است.");
    }
};
