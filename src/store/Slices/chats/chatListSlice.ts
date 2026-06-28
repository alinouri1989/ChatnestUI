// @ts-nocheck
import { createSlice } from "@reduxjs/toolkit";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";

const initialState = {
    chatList: {},
    isChatListInitialized: false,
};

const createDefaultChatUser = () => ({
    displayName: "",
    email: "",
    biography: "",
    profilePhoto: defaultProfilePhoto,
    lastConnectionDate: null,
    isOnline: false,
});

const mergeChatUser = (existingUser = {}, incomingUser = {}) => ({
    ...existingUser,
    ...incomingUser,
    displayName: incomingUser.displayName ?? existingUser.displayName ?? "",
    email: incomingUser.email ?? existingUser.email ?? "",
    biography: incomingUser.biography ?? existingUser.biography ?? "",
    profilePhoto: incomingUser.profilePhoto ?? existingUser.profilePhoto ?? defaultProfilePhoto,
    lastConnectionDate: incomingUser.lastConnectionDate ?? existingUser.lastConnectionDate ?? null,
    isOnline: incomingUser.isOnline ?? existingUser.isOnline ?? false,
});

const chatListSlice = createSlice({
    name: "chatList",
    initialState,
    reducers: {
        setInitialChatList: (state, action) => {
            state.chatList = action.payload;
            state.isChatListInitialized = true;
        },
        addNewUserToChatList: (state, action) => {
            Object.entries(action.payload || {}).forEach(([newUserId, newUserData]) => {
                const existingUser = state.chatList[newUserId] || createDefaultChatUser();
                state.chatList[newUserId] = mergeChatUser(existingUser, newUserData || {});
            });
        },
        updateUserInfoToChatList: (state, action) => {
            Object.entries(action.payload || {}).forEach(([chatId, updates]) => {
                const existingUser = state.chatList[chatId] || createDefaultChatUser();
                state.chatList[chatId] = mergeChatUser(existingUser, updates || {});
            });
        },
        appendChatList: (state, action) => {
            // می‌خواهیم فقط کلیدهای جدید را به‌هم پیوند بزنیم
            state.chatList = { ...state.chatList, ...action.payload };
        },
        resetChatList: (state) => {
            state.chatList = {};
        },
    },
});

export const {
    setInitialChatList,
    addNewUserToChatList,
    updateUserInfoToChatList,
    appendChatList,
    resetChatList
} = chatListSlice.actions;

export default chatListSlice.reducer;
