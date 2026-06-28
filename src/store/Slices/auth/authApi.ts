// @ts-nocheck
import { setUser } from './authSlice';
import { createApi } from '@reduxjs/toolkit/query/react';
import { getJwtFromCookie } from '../../helpers/getJwtFromCookie';
import { setUserProfileTheme } from '../../../helpers/applyTheme';
import { createBaseQueryWithReauth } from '../../baseQueryWithReauth';
import { clearTokens, getRefreshToken, storeTokens } from '../../helpers/tokenStorage';

const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createBaseQueryWithReauth(`${BASE_URL}api/`),
  endpoints: (builder) => ({
    registerUser: builder.mutation({
      query: (formData) => ({
        url: 'Auth/SignUp',
        method: 'POST',
        body: formData,
      }),
    }),

    SignInWithEmail: builder.mutation({
      query: (formData) => ({
        url: "Auth/SignInEmail",
        method: "POST",
        body: formData,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        await handleAuthResponse(queryFulfilled, dispatch);
      },
    }),

    SignInGoogle: builder.mutation({
      query: (body) => ({
        url: "Auth/SignInGoogle",
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        await handleAuthResponse(queryFulfilled, dispatch);
      },
    }),

    SignInFacebook: builder.mutation({
      query: (body) => ({
        url: "Auth/SignInFacebook",
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        await handleAuthResponse(queryFulfilled, dispatch);
      },
    }),

    resetPassword: builder.mutation({
      query: (email) => ({
        url: 'Auth/Password',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(email),
      }),
    }),

    resetPasswordFallback: builder.mutation({
      query: (formData) => ({
        url: 'Auth/PasswordFallback',
        method: 'POST',
        body: formData,
      }),
    }),

    getPasswordFallbackQuestion: builder.mutation({
      query: (email) => ({
        url: 'Auth/PasswordFallbackQuestion',
        method: 'POST',
        body: { email },
      }),
    }),

    confirmResetPassword: builder.mutation({
      query: (formData) => ({
        url: 'Auth/ResetPassword',
        method: 'POST',
        body: formData,
      }),
    }),

    getUserProfile: builder.query({
      query: () => {
        const token = getJwtFromCookie();
        return {
          url: 'User/Info',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    logoutUser: builder.mutation({
      query: () => ({
        url: 'Auth/SignOut',
        method: 'POST',
        body: { refreshToken: getRefreshToken() },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
        } catch { /* The local session must still be cleared. */ }

        clearTokens();
        dispatch(setUser({ user: null, token: null }));
      }
    }),
  }),
});

const handleAuthResponse = async (queryFulfilled, dispatch) => {
  try {
    const { data } = await queryFulfilled;
    if (data?.token && data?.refreshToken) {
      storeTokens(data);

      const userProfile = await dispatch(authApi.endpoints.getUserProfile.initiate()).unwrap();
      const updatedUserProfile = setUserProfileTheme(userProfile);
      dispatch(setUser({ user: updatedUserProfile, token: data.token }));
    }
  } catch { /* empty */ }
};

export const {
  useRegisterUserMutation,
  useSignInWithEmailMutation,
  useSignInGoogleMutation,
  useSignInFacebookMutation,
  useGetUserProfileQuery,
  useLogoutUserMutation,
  useResetPasswordMutation,
  useResetPasswordFallbackMutation,
  useGetPasswordFallbackQuestionMutation,
  useConfirmResetPasswordMutation
} = authApi;
