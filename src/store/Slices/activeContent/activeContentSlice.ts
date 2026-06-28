// @ts-nocheck
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    isActiveContent: false,
};

const activeContentSlice = createSlice({
    name: "activeContent",
    initialState,
    reducers: {
        toggleActiveContent: (state) => {
            state.isActiveContent = !state.isActiveContent;
        },
    },
});

export const { toggleActiveContent } = activeContentSlice.actions;

export default activeContentSlice.reducer;
