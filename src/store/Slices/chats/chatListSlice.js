import { createSlice } from "@reduxjs/toolkit";
import { defaultProfilePhoto } from "../../../constants/DefaultProfilePhoto";

const initialState = {
    chatList: {},
    isChatListInitialized: false,
};

const chatListSlice = createSlice({
    name: "chatList",
    initialState,
    reducers: {
        setInitialChatList: (state, action) => {
            state.chatList = action.payload;
            state.isChatListInitialized = true;
        },
        addNewUserToChatList: (state, action) => {
            const newUserId = Object.keys(action.payload)[0];
            const newUserData = action.payload[newUserId];
            if (!state.chatList[newUserId]) {
                state.chatList[newUserId] = {
                    displayName: newUserData.displayName || "ChatNest",
                    email: newUserData.email || "",
                    biography: newUserData.biography || "",
                    profilePhoto: newUserData.profilePhoto || defaultProfilePhoto,
                    lastConnectionDate: newUserData.lastConnectionDate || null,
                };
            }
        },
        updateUserInfoToChatList: (state, action) => {
            const chatId = Object.keys(action.payload)[0];
            const updates = action.payload[chatId];

            if (!state.chatList[chatId]) {
                state.chatList[chatId] = {
                    displayName: "ChatNest",
                    email: "",
                    biography: "",
                    profilePhoto: defaultProfilePhoto,
                    lastConnectionDate: null,
                };
            }

            Object.entries(updates || {}).forEach(([key, value]) => {
                state.chatList[chatId][key] = value;
            });
        },
    },
});

export const { setInitialChatList, addNewUserToChatList, updateUserInfoToChatList } = chatListSlice.actions;

export default chatListSlice.reducer;
