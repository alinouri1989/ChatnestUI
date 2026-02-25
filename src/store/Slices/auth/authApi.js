import { setUser } from './authSlice';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getJwtFromCookie } from '../../helpers/getJwtFromCookie';
import { removeJwtFromCookie } from '../../helpers/removeJwtFromCookie';
import { setUserProfileTheme } from '../../../helpers/applyTheme';

const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}api/`,
  }),
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
      query: () => {
        const token = getJwtFromCookie();
        return {
          url: 'Auth/SignOut',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
      },
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          removeJwtFromCookie();

          dispatch(setUser({
            user: null,
            token: null,
          }));

        } catch { /* empty */ }
      }
    }),
  }),
});

const handleAuthResponse = async (queryFulfilled, dispatch) => {
  try {
    const { data } = await queryFulfilled;
    if (data?.token) {
      const now = new Date();
      const expireDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      document.cookie = `jwt=${data.token}; expires=${expireDate.toUTCString()}; path=/; secure; samesite=strict`;

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
  useConfirmResetPasswordMutation
} = authApi;
