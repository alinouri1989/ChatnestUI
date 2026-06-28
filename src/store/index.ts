// @ts-nocheck
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { authApi } from "./Slices/auth/authApi";
import { userSettingsApi } from './Slices/userSettings/userSettingsApi';
import { searchUsersApi } from './Slices/searchUsers/searchUserApi';
import { GroupApi } from './Slices/Group/GroupApi';
import { ChatNestAiApi } from './Slices/ChatNestAi/ChatNestAiApi';

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      userSettingsApi.middleware,
      searchUsersApi.middleware,
      GroupApi.middleware,
      ChatNestAiApi.middleware
    ),
});

export default store;
