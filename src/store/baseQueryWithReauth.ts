// @ts-nocheck
import axios from "axios";
import { clearUser, setToken } from "./Slices/auth/authSlice";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  storeTokens,
} from "./helpers/tokenStorage";

const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;
let refreshPromise = null;

const prepareHeaders = (headers) => {
  const token = getAccessToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const createAxiosResult = async (baseUrl, args, api) => {
  const request = typeof args === "string" ? { url: args } : args;
  const headers = prepareHeaders({ ...(request.headers || {}) });

  try {
    const response = await axios({
      baseURL: baseUrl,
      url: request.url,
      method: request.method || "GET",
      params: request.params,
      data: request.body,
      headers,
      signal: api.signal,
      validateStatus: () => true,
    });

    if (response.status >= 200 && response.status < 300) {
      return { data: response.data };
    }

    return {
      error: {
        status: response.status,
        data: response.data,
      },
    };
  } catch (error) {
    return {
      error: {
        status: "CUSTOM_ERROR",
        data: error?.response?.data,
        error: error?.message || "Request failed",
      },
    };
  }
};

const refreshTokens = async (api) => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await axios({
    baseURL: `${BASE_URL}api/`,
    url: "Auth/RefreshToken",
    method: "POST",
    data: { refreshToken },
    validateStatus: () => true,
  }).catch(() => null);

  if (!response) return null;

  if (response.status >= 200 && response.status < 300 && response.data?.token && response.data?.refreshToken) {
    storeTokens(response.data);
    api.dispatch(setToken(response.data.token));
    return response.data;
  }

  return null;
};

export const createBaseQueryWithReauth = (baseUrl) => {
  return async (args, api, extraOptions) => {
    let result = await createAxiosResult(baseUrl, args, api, extraOptions);
    const requestUrl = typeof args === "string" ? args : args.url || "";
    const isPublicAuthRequest = requestUrl.startsWith("Auth/SignIn") ||
      requestUrl === "Auth/RefreshToken";

    if (result.error?.status !== 401 || isPublicAuthRequest) {
      return result;
    }

    if (!refreshPromise) {
      refreshPromise = refreshTokens(api).finally(() => {
        refreshPromise = null;
      });
    }

    const tokens = await refreshPromise;
    if (tokens) {
      result = await createAxiosResult(baseUrl, args, api, extraOptions);
    } else {
      clearTokens();
      api.dispatch(clearUser());
    }

    return result;
  };
};
