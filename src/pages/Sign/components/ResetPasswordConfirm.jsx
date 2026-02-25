import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Logo from "../../../assets/logos/ChatNestLogoWithText.svg";
import { useConfirmResetPasswordMutation } from "../../../store/Slices/auth/authApi";
import { resetPasswordConfirmSchema } from "../../../schemas/SignSchemas";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";
import { opacityEffect } from "../../../shared/animations/animations.js";

function ResetPasswordConfirm() {
  const [confirmResetPassword, { isLoading }] = useConfirmResetPasswordMutation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const hasLinkData = Boolean(email && token);

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordConfirmSchema),
    mode: "onChange",
    defaultValues: {
      Email: email,
      Token: token,
      NewPassword: "",
      NewPasswordAgain: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      await confirmResetPassword(data).unwrap();
      SuccessAlert("Password changed successfully.");
      navigate("/sign-in", { replace: true });
    } catch (error) {
      ErrorAlert(error?.data?.message || "An error occurred.");
    }
  };

  return (
    <motion.div
      {...opacityEffect()}
      className='reset-password-general-container'>
      <img src={Logo} alt="ChatNest Logo" />

      <div className='title-container'>
        <h1>Set New Password</h1>
        <p style={{ maxWidth: "360px" }}>
          {hasLinkData
            ? `Create a new password for ${email}`
            : "Recovery link is invalid or incomplete."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("Email")} />
        <input type="hidden" {...register("Token")} />

        <div className='inputs-container'>
          <div className='input-box password'>
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 30 30" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M8.95832 8.94023C8.95832 5.60281 11.6626 2.89856 15 2.89856C18.3374 2.89856 21.0417 5.60281 21.0417 8.94023V12.5652H21.525C22.5883 12.5652 23.4583 13.4352 23.4583 14.4986V22.9569C23.4583 24.5519 22.1533 25.8569 20.5583 25.8569H9.44166C7.84666 25.8569 6.54166 24.5519 6.54166 22.9569V14.4986C6.54166 13.4352 7.41166 12.5652 8.47499 12.5652H8.95832V8.94023ZM18.625 8.94023V12.5652H11.375V8.94023C11.375 6.93681 12.9966 5.31523 15 5.31523C17.0034 5.31523 18.625 6.93681 18.625 8.94023ZM15 15.284C14.5195 15.2835 14.0531 15.4466 13.6778 15.7466C13.3024 16.0466 13.0403 16.4654 12.9348 16.9342C12.8293 17.403 12.8866 17.8937 13.0972 18.3256C13.3079 18.7575 13.6594 19.1047 14.0937 19.3101V22.2319C14.0937 22.4722 14.1892 22.7028 14.3592 22.8727C14.5291 23.0427 14.7596 23.1381 15 23.1381C15.2403 23.1381 15.4708 23.0427 15.6408 22.8727C15.8108 22.7028 15.9062 22.4722 15.9062 22.2319V19.3101C16.3406 19.1047 16.6921 18.7575 16.9027 18.3256C17.1134 17.8937 17.1707 17.403 17.0652 16.9342C16.9596 16.4654 16.6976 16.0466 16.3222 15.7466C15.9468 15.4466 15.4805 15.2835 15 15.284Z" fill="#828A96" />
              </svg>
              <input
                {...register("NewPassword")}
                type={showPassword ? "text" : "password"}
                placeholder="New password"
              />
            </div>
            {!showPassword
              ? <IoEye className='icon' onClick={() => setShowPassword(true)} />
              : <IoEyeOff className='icon' onClick={() => setShowPassword(false)} />
            }
          </div>
          {errors.NewPassword && <span className="error-message">{errors.NewPassword.message}</span>}

          <div className='input-box password'>
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 30 30" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M8.95832 8.94023C8.95832 5.60281 11.6626 2.89856 15 2.89856C18.3374 2.89856 21.0417 5.60281 21.0417 8.94023V12.5652H21.525C22.5883 12.5652 23.4583 13.4352 23.4583 14.4986V22.9569C23.4583 24.5519 22.1533 25.8569 20.5583 25.8569H9.44166C7.84666 25.8569 6.54166 24.5519 6.54166 22.9569V14.4986C6.54166 13.4352 7.41166 12.5652 8.47499 12.5652H8.95832V8.94023ZM18.625 8.94023V12.5652H11.375V8.94023C11.375 6.93681 12.9966 5.31523 15 5.31523C17.0034 5.31523 18.625 6.93681 18.625 8.94023ZM15 15.284C14.5195 15.2835 14.0531 15.4466 13.6778 15.7466C13.3024 16.0466 13.0403 16.4654 12.9348 16.9342C12.8293 17.403 12.8866 17.8937 13.0972 18.3256C13.3079 18.7575 13.6594 19.1047 14.0937 19.3101V22.2319C14.0937 22.4722 14.1892 22.7028 14.3592 22.8727C14.5291 23.0427 14.7596 23.1381 15 23.1381C15.2403 23.1381 15.4708 23.0427 15.6408 22.8727C15.8108 22.7028 15.9062 22.4722 15.9062 22.2319V19.3101C16.3406 19.1047 16.6921 18.7575 16.9027 18.3256C17.1134 17.8937 17.1707 17.403 17.0652 16.9342C16.9596 16.4654 16.6976 16.0466 16.3222 15.7466C15.9468 15.4466 15.4805 15.2835 15 15.284Z" fill="#828A96" />
              </svg>
              <input
                {...register("NewPasswordAgain")}
                type={showRepeatPassword ? "text" : "password"}
                placeholder="Repeat new password"
              />
            </div>
            {!showRepeatPassword
              ? <IoEye className='icon' onClick={() => setShowRepeatPassword(true)} />
              : <IoEyeOff className='icon' onClick={() => setShowRepeatPassword(false)} />
            }
          </div>
          {errors.NewPasswordAgain && <span className="error-message">{errors.NewPasswordAgain.message}</span>}

          {!hasLinkData && <span className="error-message">Missing email or token in recovery link.</span>}
        </div>

        <button className='sign-buttons' type="submit" disabled={isLoading || !hasLinkData}>
          Save New Password
        </button>
        <button className='cancel-btn' type="button" onClick={() => navigate("/sign-in", { replace: true })}>
          Back to Sign In
        </button>
      </form>

      {isLoading && <PreLoader />}
    </motion.div>
  );
}

export default ResetPasswordConfirm;
