// @ts-nocheck
const ACCESS_TOKEN_COOKIE = "jwt";
const REFRESH_TOKEN_COOKIE = "refreshToken";

const getCookie = (name) => {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

const setCookie = (name, value, expiration) => {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiration.toUTCString()}; path=/; samesite=strict${secure}`;
};

const removeCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; samesite=strict`;
};

export const getAccessToken = () => getCookie(ACCESS_TOKEN_COOKIE);
export const getRefreshToken = () => getCookie(REFRESH_TOKEN_COOKIE);

export const storeTokens = ({ token, refreshToken, refreshTokenExpiration }) => {
  const refreshExpiration = refreshTokenExpiration
    ? new Date(refreshTokenExpiration)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  setCookie(ACCESS_TOKEN_COOKIE, token, refreshExpiration);
  setCookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshExpiration);
};

export const clearTokens = () => {
  removeCookie(ACCESS_TOKEN_COOKIE);
  removeCookie(REFRESH_TOKEN_COOKIE);
};
