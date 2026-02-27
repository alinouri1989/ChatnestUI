import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Logo from "../../../assets/logos/ChatNestLogoWithText.svg";
import {
  useGetPasswordFallbackQuestionMutation,
  useResetPasswordFallbackMutation,
} from "../../../store/Slices/auth/authApi";
import { resetPasswordFallbackSchema } from "../../../schemas/SignSchemas";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";
import { opacityEffect } from "../../../shared/animations/animations.js";

function ResetPasswordFallback() {
  const [resetPasswordFallback, { isLoading: isSubmitting }] = useResetPasswordFallbackMutation();
  const [getPasswordFallbackQuestion, { isLoading: isQuestionLoading }] = useGetPasswordFallbackQuestionMutation();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [questionInfo, setQuestionInfo] = useState(null);
  const [questionEmail, setQuestionEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    trigger,
    watch,
  } = useForm({
    resolver: zodResolver(resetPasswordFallbackSchema),
    mode: "onChange",
    defaultValues: {
      Email: "",
      QuestionKey: "",
      Answer: "",
      NewPassword: "",
      NewPasswordAgain: "",
    },
  });

  const watchedEmail = watch("Email");

  useEffect(() => {
    const normalizedEmail = (watchedEmail || "").trim();
    if (questionInfo && questionEmail && normalizedEmail !== questionEmail) {
      setQuestionInfo(null);
      setQuestionEmail("");
      setValue("QuestionKey", "", { shouldValidate: true });
    }
  }, [watchedEmail, questionInfo, questionEmail, setValue]);

  const handleGetQuestion = async () => {
    const isEmailValid = await trigger("Email");
    if (!isEmailValid) return;

    const email = (getValues("Email") || "").trim();
    try {
      const result = await getPasswordFallbackQuestion(email).unwrap();
      setQuestionInfo(result);
      setQuestionEmail(email);
      setValue("QuestionKey", result.questionKey, { shouldValidate: true });

      if (!result.hasAnswerConfigured) {
        ErrorAlert("برای این حساب هنوز پاسخ پرسش امنیتی ثبت نشده است.");
      }
    } catch (error) {
      setQuestionInfo(null);
      setQuestionEmail("");
      setValue("QuestionKey", "", { shouldValidate: true });
      ErrorAlert(error?.data?.message || "دریافت پرسش امنیتی انجام نشد.");
    }
  };

  const onSubmit = async (data) => {
    if (!questionInfo) {
      ErrorAlert("ابتدا پرسش امنیتی حساب را دریافت کنید.");
      return;
    }

    if (!questionInfo.hasAnswerConfigured) {
      ErrorAlert("برای این حساب هنوز پاسخ پرسش امنیتی ثبت نشده است.");
      return;
    }

    try {
      await resetPasswordFallback(data).unwrap();
      SuccessAlert("رمز عبور با موفقیت تغییر کرد.");
      navigate("/sign-in", { replace: true });
    } catch (error) {
      ErrorAlert(error?.data?.message || "خطایی رخ داده است.");
    }
  };

  const isLoading = isSubmitting || isQuestionLoading;

  return (
    <motion.div {...opacityEffect()} className='reset-password-general-container'>
      <img src={Logo} alt="لوگوی ChatNest" />

      <div className='title-container'>
        <h1>بازیابی رمز عبور با پرسش امنیتی</h1>
        <p style={{ maxWidth: "390px" }}>
          ابتدا ایمیل حساب را وارد کنید و پرسش امنیتی اختصاصی خود را دریافت کنید. این پرسش‌ها عمومی نیستند و باید قبلاً در تنظیمات حساب ثبت شده باشند.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("QuestionKey")} />

        <div className='inputs-container'>
          <div className='input-box'>
            <input {...register("Email")} type="email" placeholder="ایمیل" />
          </div>
          {errors.Email && <span className="error-message">{errors.Email.message}</span>}

          <button
            className='cancel-btn'
            type="button"
            onClick={handleGetQuestion}
            disabled={isLoading}
          >
            دریافت پرسش امنیتی
          </button>

          {questionInfo && (
            <div className='input-box' style={{ minHeight: "56px", alignItems: "center" }}>
              <span style={{ fontSize: "13px", lineHeight: 1.8 }}>
                {questionInfo.questionText}
              </span>
            </div>
          )}

          {questionInfo && !questionInfo.hasAnswerConfigured && (
            <span className="error-message">
              برای این حساب هنوز پاسخ پرسش امنیتی ثبت نشده است. بعد از ورود به حساب، از بخش تنظیمات آن را تنظیم کنید.
            </span>
          )}

          <div className='input-box'>
            <input
              {...register("Answer")}
              type="text"
              placeholder="پاسخ پرسش امنیتی"
              disabled={!questionInfo || !questionInfo.hasAnswerConfigured}
            />
          </div>
          {errors.Answer && <span className="error-message">{errors.Answer.message}</span>}

          <div className='input-box password'>
            <div>
              <input
                {...register("NewPassword")}
                type={showPassword ? "text" : "password"}
                placeholder="رمز عبور جدید"
                disabled={!questionInfo || !questionInfo.hasAnswerConfigured}
              />
            </div>
            {!showPassword
              ? <IoEye className='icon' onClick={() => setShowPassword(true)} />
              : <IoEyeOff className='icon' onClick={() => setShowPassword(false)} />}
          </div>
          {errors.NewPassword && <span className="error-message">{errors.NewPassword.message}</span>}

          <div className='input-box password'>
            <div>
              <input
                {...register("NewPasswordAgain")}
                type={showRepeatPassword ? "text" : "password"}
                placeholder="تکرار رمز عبور جدید"
                disabled={!questionInfo || !questionInfo.hasAnswerConfigured}
              />
            </div>
            {!showRepeatPassword
              ? <IoEye className='icon' onClick={() => setShowRepeatPassword(true)} />
              : <IoEyeOff className='icon' onClick={() => setShowRepeatPassword(false)} />}
          </div>
          {errors.NewPasswordAgain && <span className="error-message">{errors.NewPasswordAgain.message}</span>}
          {errors.QuestionKey && <span className="error-message">{errors.QuestionKey.message}</span>}
        </div>

        <button
          className='sign-buttons'
          type="submit"
          disabled={isLoading || !questionInfo || !questionInfo.hasAnswerConfigured}
        >
          تغییر رمز عبور
        </button>
        <button className='cancel-btn' type="button" onClick={() => navigate("/reset-password", { replace: true })}>
          بازگشت
        </button>
      </form>

      {isLoading && <PreLoader />}
    </motion.div>
  );
}

export default ResetPasswordFallback;
