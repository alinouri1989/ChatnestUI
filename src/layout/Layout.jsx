import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Header from "./Header/Header";
import Sidebar from "./Sidebar/Sidebar";
import Dashboard from "./Dashboard/Dashboard";

import "./style.scss";

const Layout = () => {
  const location = useLocation();
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 900);
  const [isActiveContent, setIsActiveContent] = useState(false);

  useEffect(() => {
    const updateHeight = () => {
      setIsWideScreen(window.innerWidth >= 900);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    const activeRoutes = ["/chats", "/archives", "/calls", "/groups"];
    const isMatchingRoute = activeRoutes.some((route) => {
      return (
        location.pathname.startsWith(route) &&
        location.pathname !== route &&
        location.pathname !== `${route}/`
      );
    });

    setIsActiveContent(isMatchingRoute);
  }, [location.pathname]);

  return (
    <div className="layout-container">
      {isWideScreen || !isActiveContent ? <Header /> : null}

      <div className="main-content">
        <div className="outlet-content">
          {isWideScreen ? (
            <>
              <Dashboard />
              <Outlet />
            </>
          ) : isActiveContent ? (
            <Outlet />
          ) : (
            <Dashboard />
          )}
        </div>
        <Sidebar />
      </div>
    </div>
  );
};

export default Layout;
