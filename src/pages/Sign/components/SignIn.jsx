import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from "../../../assets/logos/ChatNestLogoWithText.webp";

// import { FcGoogle } from "react-icons/fc";
// import { FaFacebook } from "react-icons/fa";
import { IoEye, IoEyeOff } from "react-icons/io5";

import PreLoader from "../../../shared/components/PreLoader/PreLoader.jsx";
import { ErrorAlert, SuccessAlert } from '../../../helpers/customAlert';

// import { signInWithPopup } from 'firebase/auth';
// import { auth, googleProvider, facebookProvider } from '../../../services/firebaseConfig.js';
import { useSignInWithEmailMutation } from '../../../store/Slices/auth/authApi.js';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from '../../../schemas/SignSchemas.js';
import { opacityEffect } from '../../../shared/animations/animations.js';
import { motion } from "framer-motion";
// import { getFirebaseAuthErrorMessage } from '../../../helpers/getFirebaseAuthErrorMessage .js';

function SignIn() {

  const [SignInWithEmail, { isLoading: isEmailLoading }] = useSignInWithEmailMutation();
  // const [SignInGoogle, { isLoading: isGoogleLoading }] = useSignInGoogleMutation();
  // const [SignInFacebook, { isLoading: isFacebookLoading }] = useSignInFacebookMutation();

  const isLoading = isEmailLoading ;// || isGoogleLoading || isFacebookLoading;

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
  });


  const handleSignInWithEmail = async (data) => {
    try {
      await SignInWithEmail(data).unwrap();
      SuccessAlert("وارد شدید");
    } catch (error) {
      ErrorAlert(error?.data?.message || "خطایی رخ داده است");
    }
  };

  // const handleSignInWithGoogle = async () => {
  //   try {
  //     const result = await signInWithPopup(auth, googleProvider);
  //     await SignInGoogle(result.user).unwrap();
  //     SuccessAlert("وارد شدید");
  //   } catch (error) {
  //     ErrorAlert(getFirebaseAuthErrorMessage(error));
  //   }
  // };

  // const handleSignInWithFacebook = async () => {
  //   try {
  //     const result = await signInWithPopup(auth, facebookProvider);
  //     await SignInFacebook(result.user).unwrap();
  //     SuccessAlert("وارد شدید");
  //   } catch (error) {
  //     ErrorAlert(getFirebaseAuthErrorMessage(error));
  //   }
  // };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <motion.div
      className="sign-in-general-container"
      {...opacityEffect()}>
      <img src={Logo} alt="ChatNest لوگو" />
      <div className='title-container'>
        <h1>با حساب خود وارد شوید</h1>
        <p>خوش آمدید، یکی از روش‌های زیر را انتخاب کنید:</p>
      </div>

      <div className='method-buttons'>
        {/* <button onClick={handleSignInWithGoogle}><FcGoogle className='icon' /><span>Google</span></button> */}
        {/* <button onClick={handleSignInWithFacebook}><FaFacebook className='icon' /><span>Facebook</span></button> */}
      </div>

      <div className='divider-container'>
        <span></span>
        <p>یا با ایمیل ادامه دهید</p>
        <span></span>
      </div>

      <form onSubmit={handleSubmit(handleSignInWithEmail)}>
        <div className='inputs-container'>
          <div className='input-box'>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 30 30" fill="none">
              <path d="M4.125 6.82565V21.3257C4.125 21.8064 4.31596 22.2674 4.65587 22.6073C4.99578 22.9472 5.45679 23.1382 5.9375 23.1382H24.0625C24.5432 23.1382 25.0042 22.9472 25.3441 22.6073C25.684 22.2674 25.875 21.8064 25.875 21.3257V6.82565H4.125ZM4.125 5.01315H25.875C26.3557 5.01315 26.8167 5.20411 27.1566 5.54402C27.4965 5.88393 27.6875 6.34495 27.6875 6.82565V21.3257C27.6875 22.2871 27.3056 23.2091 26.6258 23.8889C25.9459 24.5687 25.0239 24.9507 24.0625 24.9507H5.9375C4.97609 24.9507 4.05406 24.5687 3.37424 23.8889C2.69442 23.2091 2.3125 22.2871 2.3125 21.3257V6.82565C2.3125 6.34495 2.50346 5.88393 2.84337 5.54402C3.18328 5.20411 3.6443 5.01315 4.125 5.01315Z" fill="#828A96" />
              <path d="M26.1016 6.82565L19.0926 14.8369C18.5823 15.4203 17.9531 15.8879 17.2472 16.2083C16.5413 16.5286 15.7752 16.6943 15 16.6943C14.2248 16.6943 13.4587 16.5286 12.7528 16.2083C12.0469 15.8879 11.4177 15.4203 10.9074 14.8369L3.89844 6.82565H26.1016ZM6.30725 6.82565L12.2704 13.6425C12.6106 14.0315 13.0301 14.3433 13.5008 14.557C13.9714 14.7706 14.4822 14.8811 14.9991 14.8811C15.5159 14.8811 16.0268 14.7706 16.4974 14.557C16.9681 14.3433 17.3876 14.0315 17.7278 13.6425L23.6927 6.82565H6.30725Z" fill="#828A96" />
            </svg>
            <input {...register("Email")} type="email" placeholder="ایمیل" />
          </div>

          {errors.Email && <span className="error-message">{errors.Email.message}</span>}

          <div className='input-box password'>
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 30 30" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M8.95832 8.94023C8.95832 5.60281 11.6626 2.89856 15 2.89856C18.3374 2.89856 21.0417 5.60281 21.0417 8.94023V12.5652H21.525C22.5883 12.5652 23.4583 13.4352 23.4583 14.4986V22.9569C23.4583 24.5519 22.1533 25.8569 20.5583 25.8569H9.44166C7.84666 25.8569 6.54166 24.5519 6.54166 22.9569V14.4986C6.54166 13.4352 7.41166 12.5652 8.47499 12.5652H8.95832V8.94023ZM18.625 8.94023V12.5652H11.375V8.94023C11.375 6.93681 12.9966 5.31523 15 5.31523C17.0034 5.31523 18.625 6.93681 18.625 8.94023ZM15 15.284C14.5195 15.2835 14.0531 15.4466 13.6778 15.7466C13.3024 16.0466 13.0403 16.4654 12.9348 16.9342C12.8293 17.403 12.8866 17.8937 13.0972 18.3256C13.3079 18.7575 13.6594 19.1047 14.0937 19.3101V22.2319C14.0937 22.4722 14.1892 22.7028 14.3592 22.8727C14.5291 23.0427 14.7596 23.1381 15 23.1381C15.2403 23.1381 15.4708 23.0427 15.6408 22.8727C15.8108 22.7028 15.9062 22.4722 15.9062 22.2319V19.3101C16.3406 19.1047 16.6921 18.7575 16.9027 18.3256C17.1134 17.8937 17.1707 17.403 17.0652 16.9342C16.9596 16.4654 16.6976 16.0466 16.3222 15.7466C15.9468 15.4466 15.4805 15.2835 15 15.284Z" fill="#828A96" />
              </svg>
              <input
                {...register("Password")}
                type={showPassword ? "text" : "password"}
                placeholder="رمز عبور"
              />
            </div>

            {!showPassword
              ? <IoEye className='icon' onClick={togglePasswordVisibility} />
              : <IoEyeOff className='icon' onClick={togglePasswordVisibility} />
            }
          </div>
          {errors.Password && <span className="error-message">{errors.Password.message}</span>}
        </div>

        <div className='remember-and-forgot-box'>
          <div className='remember-me'>
            <div className="checkbox-wrapper-46">
              <input className="inp-cbx" id="cbx-46" type="checkbox" />
              <label className="cbx" htmlFor="cbx-46"><span>
                <svg width="12px" height="10px" viewBox="0 0 12 10">
                  <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                </svg></span><span>مرا به خاطر بسپار</span>
              </label>
            </div>
          </div>
          <Link to="/sifre-yenile">رمز عبور خود را فراموش کردم</Link>
        </div>

        <button type='submit' className='sign-buttons'>ورود</button>
        <p className='change-sign-method-text'>
          حساب کاربری ندارید؟
          <Link to="/uye-ol">ایجاد حساب</Link>
        </p>
      </form >
      {isLoading && <PreLoader />}
    </motion.div>
  );
}

export default SignIn;