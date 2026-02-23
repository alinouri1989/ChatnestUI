import { combineReducers } from '@reduxjs/toolkit';

import authReducer from "./Slices/auth/authSlice.js";
import chatReducer from "./Slices/chats/chatSlice.js";
import chatListReducer from "./Slices/chats/chatListSlice.js";
import pendingUploadsReducer from "./Slices/chats/pendingUploadsSlice.js";
import groupListReducer from "./Slices/Group/groupListSlice.js";
import callReducer from "./Slices/calls/callSlice.js";
import activeContentReducer from "./Slices/activeContent/activeContentSlice.js";

import { authApi } from "./Slices/auth/authApi.js";
import { userSettingsApi } from './Slices/userSettings/userSettingsApi.js';
import { searchUsersApi } from './Slices/searchUsers/searchUserApi.js';
import { GroupApi } from './Slices/Group/GroupApi.js';
import { ChatNestAiApi } from './Slices/ChatNestAi/ChatNestAiApi.js';

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
    [ChatNestAiApi.reducerPath]: GroupApi.reducer,
});

const rootReducer = (state, action) => {
    if (action.type === 'RESET_STORE') {
        state = undefined;
    }
    return appReducer(state, action);
};

export default rootReducer;
