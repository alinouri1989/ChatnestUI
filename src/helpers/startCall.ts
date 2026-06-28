// @ts-nocheck
import { setIsCallStarting } from "../store/Slices/calls/callSlice";
import { ErrorAlert } from "./customAlert";

export const startCall = async (
  callConnection,
  recipientId,
  isCameraCall,
  dispatch,
  openModalCallback
) => {
  if (!callConnection || !recipientId) {
    ErrorAlert("اطلاعات گیرنده تماس کامل نیست.");
    return;
  }

  if (callConnection.state !== "Connected") {
    ErrorAlert("اتصال تماس برقرار نیست. چند ثانیه دیگر دوباره تلاش کنید.");
    return;
  }

  let blockedByValidation = false;
  const validationHandler = (data) => {
    blockedByValidation = true;
    if (data?.message) {
      ErrorAlert(data.message);
    }
  };

  callConnection.off("ValidationError", validationHandler);
  callConnection.on("ValidationError", validationHandler);

  try {
    await callConnection.invoke("StartCall", recipientId, isCameraCall ? 1 : 0);
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (!blockedByValidation) {
      dispatch(setIsCallStarting(true));
      openModalCallback();
    }
  } catch (error) {
    console.error("StartCall failed:", error);
    ErrorAlert(error?.message || "خطایی رخ داده است.");
  } finally {
    callConnection.off("ValidationError", validationHandler);
  }
};
