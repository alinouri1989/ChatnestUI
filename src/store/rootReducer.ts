// @ts-nocheck
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from "./Slices/auth/authSlice";
import chatReducer from "./Slices/chats/chatSlice";
import chatListReducer from "./Slices/chats/chatListSlice";
import pendingUploadsReducer from "./Slices/chats/pendingUploadsSlice";
import groupListReducer from "./Slices/Group/groupListSlice";
import callReducer from "./Slices/calls/callSlice";
import activeContentReducer from "./Slices/activeContent/activeContentSlice";

import { authApi } from "./Slices/auth/authApi";
import { userSettingsApi } from './Slices/userSettings/userSettingsApi';
import { searchUsersApi } from './Slices/searchUsers/searchUserApi';
import { GroupApi } from './Slices/Group/GroupApi';
import { ChatNestAiApi } from './Slices/ChatNestAi/ChatNestAiApi';

const appReducer = combineReducers({
    auth: authReducer,
    chat: chatReducer,
    chatList: chatListReducer,
    pendingUploads: pendingUploadsReducer,
    groupList: groupListReducer,
    call: callReducer,
    activeContent: activeContentReducer,
    [authApi.reducerPath]: authApi.reducer,
    [userSettingsApi.reducerPath]: userSettingsApi.reducer,
    [searchUsersApi.reducerPath]: searchUsersApi.reducer,
    [GroupApi.reducerPath]: GroupApi.reducer,
    [ChatNestAiApi.reducerPath]: ChatNestAiApi.reducer,
});

const rootReducer = (state, action) => {
    if (action.type === 'RESET_STORE') {
        state = undefined;
    }
    return appReducer(state, action);
};

export default rootReducer;
