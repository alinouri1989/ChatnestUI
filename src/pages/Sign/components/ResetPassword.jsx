import { useNavigate } from "react-router-dom";
import { useResetPasswordMutation } from "../../../store/Slices/auth/authApi";
import Logo from "../../../assets/logos/ChatNestLogoWithText.svg";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { resetPasswordSchema } from "../../../schemas/SignSchemas";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";

import { opacityEffect } from '../../../shared/animations/animations.js';
import { motion } from "framer-motion";

function ResetPassword() {
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const handleCancel = () => {
    navigate('/sign-in', { replace: true });
  };

  const onSubmit = async (data) => {
    try {
      await resetPassword(data.Email).unwrap();
      navigate('/sign-in');
      SuccessAlert("لینک بازنشانی رمز عبور ارسال شد.");
    } catch (error) {
      ErrorAlert(error?.data?.message || "خطایی رخ داده است");
    }
  };

  return (
    <motion.div
      {...opacityEffect()}
      className='reset-password-general-container'>
      <img src={Logo} alt="لوگوی ChatNest" />

      <div className='title-container'>
        <h1>{"بازنشانی رمز عبور"}</h1>
        <p style={{ maxWidth: "360px" }}>
          {"برای ارسال لینک بازنشانی رمز عبور، به آدرس ایمیل شما نیاز داریم."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='inputs-container'>
          <div className='input-box'>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 30 30" fill="none">
              <path d="M4.125 6.82565V21.3257C4.125 21.8064 4.31596 22.2674 4.65587 22.6073C4.99578 22.9472 5.45679 23.1382 5.9375 23.1382H24.0625C24.5432 23.1382 25.0042 22.9472 25.3441 22.6073C25.684 22.2674 25.875 21.8064 25.875 21.3257V6.82565H4.125ZM4.125 5.01315H25.875C26.3557 5.01315 26.8167 5.20411 27.1566 5.54402C27.4965 5.88393 27.6875 6.34495 27.6875 6.82565V21.3257C27.6875 22.2871 27.3056 23.2091 26.6258 23.8889C25.9459 24.5687 25.0239 24.9507 24.0625 24.9507H5.9375C4.97609 24.9507 4.05406 24.5687 3.37424 23.8889C2.69442 23.2091 2.3125 22.2871 2.3125 21.3257V6.82565C2.3125 6.34495 2.50346 5.88393 2.84337 5.54402C3.18328 5.20411 3.6443 5.01315 4.125 5.01315Z" fill="#828A96" />
              <path d="M26.1016 6.82565L19.0926 14.8369C18.5823 15.4203 17.9531 15.8879 17.2472 16.2083C16.5413 16.5286 15.7752 16.6943 15 16.6943C14.2248 16.6943 13.4587 16.5286 12.7528 16.2083C12.0469 15.8879 11.4177 15.4203 10.9074 14.8369L3.89844 6.82565H26.1016ZM6.30725 6.82565L12.2704 13.6425C12.6106 14.0315 13.0301 14.3433 13.5008 14.557C13.9714 14.7706 14.4822 14.8811 14.9991 14.8811C15.5159 14.8811 16.0268 14.7706 16.4974 14.557C16.9681 14.3433 17.3876 14.0315 17.7278 13.6425L23.6927 6.82565H6.30725Z" fill="#828A96" />
            </svg>
            <input
              {...register("Email")}
              type="text"
              placeholder="ایمیل"
            />
          </div>
          {errors.Email && <span className="error-message">{errors.Email.message}</span>}
        </div>

        <button className='sign-buttons' type="submit" disabled={isLoading}>
          {"ارسال"}
        </button>
        <button className='cancel-btn' type="button" onClick={handleCancel}>
          {"انصراف"}
        </button>
        <button
          className='cancel-btn'
          type="button"
          onClick={() => navigate('/reset-password-manual', { replace: true })}>
          {"بازیابی با پرسش امنیتی"}
        </button>
      </form>

      {isLoading && <PreLoader />}
    </motion.div>
  );
}

export default ResetPassword;
