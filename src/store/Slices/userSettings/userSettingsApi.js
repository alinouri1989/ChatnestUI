import { setUser } from '../auth/authSlice.js';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getJwtFromCookie } from '../../helpers/getJwtFromCookie.js';
import { updateUserField } from "../../helpers/updateUserField.js";
import { ErrorAlert } from '../../../helpers/customAlert.js';

const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

export const userSettingsApi = createApi({
  reducerPath: 'accountSettingsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}api/`,
    prepareHeaders: (headers) => {
      const token = getJwtFromCookie();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),

  endpoints: (builder) => ({
    removeProfilePhoto: builder.mutation({
      query: () => ({
        url: 'User/ProfilePhoto',
        method: 'DELETE',
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          const { data } = await queryFulfilled;
          const currentUser = getState().auth;
          updateUserField(dispatch, currentUser, 'profilePhoto', data.profilePhoto);
        } catch (error) {
          console.error('Error removing profile photo:', error);
        }
      },
    }),

    updateProfilePhoto: builder.mutation({
      query: (newPhoto) => {
        return {
          url: 'User/ProfilePhoto',
          method: 'PATCH',
          body: { profilePhoto: newPhoto },
        };
      },
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          const { data } = await queryFulfilled;

          const currentUser = getState().auth;

          updateUserField(dispatch, currentUser, 'profilePhoto', data.profilePhoto);
        } catch { /* empty */ }
      },
    }),

    updateDisplayName: builder.mutation({
      query: (newDisplayName) => ({
        url: 'User/DisplayName',
        method: 'PATCH',
        body: { displayName: newDisplayName },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          await queryFulfilled;
          const currentUser = getState().auth;
          updateUserField(dispatch, currentUser, 'displayName', arg);
        } catch { /* empty */ }
      },
    }),

    updateUserIdentifier: builder.mutation({
      query: (newUserIdentifier) => ({
        url: 'User/UserIdentifier',
        method: 'PATCH',
        body: { userIdentifier: newUserIdentifier },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          await queryFulfilled;
          const currentUser = getState().auth;
          updateUserField(dispatch, currentUser, 'userIdentifier', arg);
        } catch { /* empty */ }
      },
    }),

    updatePhoneNumber: builder.mutation({
      query: (newPhoneNumber) => ({
        url: 'User/PhoneNumber',
        method: 'PATCH',
        body: { phoneNumber: newPhoneNumber },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          await queryFulfilled;
          const currentUser = getState().auth;
          updateUserField(dispatch, currentUser, 'phoneNumber', arg);
        } catch (error) {
          console.error('Error updating phone number:', error);
        }
      },
    }),

    updateBiography: builder.mutation({
      query: (newBiography) => ({
        url: 'User/Biography',
        method: 'PATCH',
        body: { biography: newBiography },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          await queryFulfilled;
          const currentUser = getState().auth;
          updateUserField(dispatch, currentUser, 'biography', arg);
        } catch (error) {
          console.error('Error updating biography:', error);
        }
      },
    }),

    changePassword: builder.mutation({
      query: (formData) => ({
        url: 'User/Password',
        method: 'PATCH',
        body: formData,
      }),
    }),

    // ============ Theme Settings  ============

    changeTheme: builder.mutation({
      query: (themeId) => ({
        url: 'User/Theme',
        method: 'PATCH',
        body: { theme: themeId },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          await queryFulfilled;

          const currentAuth = getState().auth;
          const themeMapping = {
            0: "DefaultSystemMode",
            1: "Light",
            2: "Dark",
          };

          dispatch(
            setUser({
              ...currentAuth,
              user: {
                ...currentAuth.user,
                userSettings: {
                  ...currentAuth.user.userSettings,
                  theme: themeMapping[arg],
                },
              },
            })
          );
        } catch (error) {
          console.error('Error updating theme:', error);
        }
      },
    }),

    changeChatBackground: builder.mutation({
      query: (colorId) => ({
        url: 'User/ChatBackground',
        method: 'PATCH',
        body: { chatBackground: colorId },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          await queryFulfilled;

          const currentAuth = getState().auth;

          dispatch(
            setUser({
              ...currentAuth,
              user: {
                ...currentAuth.user,
                userSettings: {
                  ...currentAuth.user.userSettings,
                  chatBackground: arg,
                },
              },
            })
          );
        } catch {
          ErrorAlert("خطایی رخ داده است.");
        }
      },
    }),
  }),
});

export const {
  useRemoveProfilePhotoMutation,
  useUpdateProfilePhotoMutation,
  useUpdateDisplayNameMutation,
  useUpdateUserIdentifierMutation,
  useUpdatePhoneNumberMutation,
  useUpdateBiographyMutation,
  useChangePasswordMutation,
  useChangeChatBackgroundMutation,
  useChangeThemeMutation
} = userSettingsApi;
