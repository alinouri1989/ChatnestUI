import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../../assets/logos/ChatNestLogoWithText.webp";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from '../../../schemas/SignSchemas.js';

import { useModal } from "../../../contexts/ModalContext";
import { useRegisterUserMutation } from "../../../store/Slices/auth/authApi.js";

import { Controller } from "react-hook-form";
// Jalali Date Picker imports  
import DatePicker from "react-multi-date-picker";  
import persian from "react-date-object/calendars/persian";  
import persian_fa from "react-date-object/locales/persian_fa";  
import "react-multi-date-picker/styles/layouts/mobile.css";  

import { IoEye } from "react-icons/io5";
import { IoEyeOff } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { MdOutlineMail } from "react-icons/md";
import { PiLockKeyFill } from "react-icons/pi";
import { LuCalendarDays } from "react-icons/lu";

import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert.js";
import MembershipModal from "./MembershipModal";
import PreLoader from "../../../shared/components/PreLoader/PreLoader.jsx";

import { opacityEffect } from '../../../shared/animations/animations.js';
import { motion } from "framer-motion";

function SignUp() {

  const navigate = useNavigate();
  const { showModal } = useModal();

  const [registerUser, { isLoading }] = useRegisterUserMutation();

  const [showPassword, setShowPassword] = useState(false);
  const [showAgainPassword, setShowAgainPassword] = useState(false);
  const [isMembershipAgreementAccepted, setIsMembershipAgreementAccepted] = useState(false);

  const { register, handleSubmit, formState: { errors, isValid }, control } = useForm({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
  });

  const isFormValid = isValid && isMembershipAgreementAccepted;
  const today = new Date();

  const handleKeyPressForBirthDate = (e) => {
    const allowedKeys = [
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '/',
      'Backspace', 'Delete',
      'ArrowLeft', 'ArrowRight'
    ];
    if (!allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleAgainPasswordVisibility = () => {
    setShowAgainPassword(!showAgainPassword);
  };

  const toggleMembershipAgreement = () => {
    setIsMembershipAgreementAccepted(!isMembershipAgreementAccepted);
  };

  const onSubmit = async (data) => {
    if (isFormValid) {
      try {
        // Convert date for backend submission
        const submitData = {
          ...data,
          BirthDate: data.BirthDate ? data.BirthDate.toISOString() : null
        };
        
        await registerUser(submitData).unwrap();
        SuccessAlert("حساب ایجاد شد");
        navigate('/giris-yap');

      } catch (error) {
        ErrorAlert(error?.data?.message || "خطایی رخ داده است");
      }
    }
    else {
      ErrorAlert("تمام فیلدها باید پر شوند");
    }
  };

  const handleMembershipAgreementModal = () => {
    showModal(<MembershipModal />);
  };

  return (
    <motion.div
      {...opacityEffect()}
      className='sign-up-general-container'>
      <img src={Logo} alt="ChatNest لوگو" />

      <div className='title-container'>
        <h1>ایجاد حساب</h1>
        <p>به راحتی حساب ایجاد کنید، فوراً شروع به گپ کنید</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='inputs-container'>
          <div className='input-box'>
            <FaUser size="28" color="#828A96"/>
            <input
              {...register("DisplayName")}
              type="text"
              placeholder='نام و نام خانوادگی' />
          </div>
          {errors.DisplayName && <span className="error-message">{errors.DisplayName.message}</span>}

          <div className='input-box'>
            <MdOutlineMail size="28" color="#828A96"/>
            <input
              {...register("Email")}
              type="email"
              placeholder='ایمیل' />
          </div>
          {errors.Email && <span className="error-message">{errors.Email.message}</span>}

          <div className='input-box password'>
            <div>
              <PiLockKeyFill size="28" color="#828A96"/>
              <input
                {...register("Password")}
                type={showPassword ? "text" : "password"}
                placeholder='رمز عبور' />
            </div>
            {showPassword
              ? <IoEyeOff size="28" className='icon' onClick={togglePasswordVisibility} />
              : <IoEye size="28" className='icon' onClick={togglePasswordVisibility} />
            }
          </div>
          {errors.Password && <span className="error-message">{errors.Password.message}</span>}

          <div className='input-box password'>
            <div>
              <PiLockKeyFill size="28" color="#828A96"/>
              <input
                {...register("PasswordAgain")}
                type={showAgainPassword ? "text" : "password"}
                placeholder='تکرار رمز عبور' />
            </div>

            {showAgainPassword
              ? <IoEyeOff size="28" className='icon' onClick={toggleAgainPasswordVisibility} />
              : <IoEye size="28" className='icon' onClick={toggleAgainPasswordVisibility} />
            }
          </div>
          {errors.PasswordAgain && <span className="error-message">{errors.PasswordAgain.message}</span>}

          <div className='input-box'>
            <LuCalendarDays size="28" color="#828A96"/>
            <Controller
              name="BirthDate"
              control={control}
              rules={{ required: "تاریخ تولد الزامی است" }}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={(dateObject) => {
                    // Convert DateObject to JavaScript Date
                    if (dateObject) {
                      const jsDate = dateObject.toDate();
                      field.onChange(jsDate);
                    } else {
                      field.onChange(null);
                    }
                  }}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  format="YYYY/MM/DD"
                  placeholder="تاریخ تولد" 
                  onKeyDown={handleKeyPressForBirthDate}
                  maxDate={today}
                  style={{
                    width: "100%",
                    height: "50px",
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    fontSize: "16px",
                    padding: "0 12px"
                  }}
                  containerStyle={{
                    width: "100%"
                  }}
                />
              )}
            />
          </div>
          {errors.BirthDate && <span className="error-message">{errors.BirthDate.message}</span>}
        </div>

        <div className="membership-agreement-input">
          <div className="checkbox-wrapper-46">
            <input onClick={toggleMembershipAgreement} className="inp-cbx" id="cbx-46" type="checkbox" />
            <label className="cbx" htmlFor="cbx-46"><span>
              <svg width="12px" height="10px" viewBox="0 0 12 10">
                <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
              </svg></span><span></span>
            </label>
          </div>
          <p><strong onClick={handleMembershipAgreementModal}>قرارداد عضویت</strong> شرایط را خوانده و قبول دارم.
          </p>
        </div>

        <button
          type="submit"
          className="sign-buttons"
          disabled={!isFormValid}
          style={{ opacity: isFormValid ? 1 : 0.7 }}>
          ایجاد
        </button>

        <p className='change-sign-method-text'>
          قبلاً حساب دارید؟
          <Link to="/giris-yap">وارد شوید</Link>
        </p>

      </form>
      {isLoading && <PreLoader />}
    </motion.div>
  );
}

export default SignUp;