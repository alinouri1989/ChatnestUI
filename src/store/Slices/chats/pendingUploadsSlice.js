import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
};

const pendingUploadsSlice = createSlice({
  name: "pendingUploads",
  initialState,
  reducers: {
    addPendingUpload: (state, action) => {
      state.items.push(action.payload);
    },
    updatePendingUpload: (state, action) => {
      const { id, changes } = action.payload;
      const item = state.items.find((upload) => upload.id === id);

      if (!item) return;

      Object.assign(item, changes);
    },
    markPendingUploadSent: (state, action) => {
      const id = typeof action.payload === "string" ? action.payload : action.payload?.id;
      const item = state.items.find((upload) => upload.id === id);

      if (!item) return;

      item.progress = 100;
      item.phase = "sent";
      item.statusText = "ارسال شد";
    },
    removePendingUpload: (state, action) => {
      const id = typeof action.payload === "string" ? action.payload : action.payload?.id;
      state.items = state.items.filter((upload) => upload.id !== id);
    },
    clearPendingUploads: (state) => {
      state.items = [];
    },
  },
});

export const {
  addPendingUpload,
  updatePendingUpload,
  markPendingUploadSent,
  removePendingUpload,
  clearPendingUploads,
} = pendingUploadsSlice.actions;

export default pendingUploadsSlice.reducer;
