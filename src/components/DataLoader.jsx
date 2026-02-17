import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";

import { getJwtFromCookie } from "../store/helpers/getJwtFromCookie";
import { authApi } from "../store/Slices/auth/authApi";
import { setUser } from "../store/Slices/auth/authSlice";

import { setUserProfileTheme } from "../helpers/applyTheme";
import { SignalRProvider } from "../contexts/SignalRContext";
import ChatNestPreLoader from "../shared/components/ChatNestPreLoader/ChatNestPreLoader";
import { ErrorAlert } from "../helpers/customAlert";

const DataLoader = ({ children }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth < 900) {
        document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
      } else {
        document.documentElement.style.setProperty("--app-height", "100vh");
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const jwt = getJwtFromCookie();

      if (jwt) {
        try {
          const userProfile = await dispatch(
            authApi.endpoints.getUserProfile.initiate()
          ).unwrap();

          const updatedUserProfile = setUserProfileTheme(userProfile);

          dispatch(
            setUser({
              user: updatedUserProfile,
              token: jwt,
            })
          );
        } catch {
          // If you want to inspect errors, replace with: `catch (error) { console.error(error); ... }`
          ErrorAlert("خطایی رخ داده است.");
        }
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 900);
    };

    initializeAuth();
  }, [dispatch]);

  if (isLoading) {
    return <ChatNestPreLoader />;
  }

  return user ? <SignalRProvider>{children}</SignalRProvider> : <>{children}</>;
};

DataLoader.propTypes = {
  children: PropTypes.node,
};

DataLoader.defaultProps = {
  children: null,
};

export default DataLoader;