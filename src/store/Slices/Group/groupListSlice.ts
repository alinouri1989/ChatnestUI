// @ts-nocheck
import { createSlice } from '@reduxjs/toolkit';

const groupListSlice = createSlice({
  name: 'groupList',
  initialState: {
    groupList: {},
    isGroupListInitialized: false,
  },
  reducers: {
    setGroupList(state, action) {
      state.groupList = {
        ...state.groupList,
        ...action.payload,
      };
      state.isGroupListInitialized = true;
    },
    updateUserInfoToGroupList(state, action) {
      const data = action.payload;

      Object.entries(data).forEach(([userId, updates]) => {
        Object.keys(state.groupList).forEach((groupId) => {
          const group = state.groupList[groupId];
          const participant = group.participants[userId];

          if (participant) {
            group.participants[userId] = {
              ...participant,
              ...updates,
            };
          }
        });
      });
    },
    updateGroupInformations(state, action) {
      const newData = action.payload;

      Object.keys(newData).forEach((groupId) => {
        const newGroupData = newData[groupId];
        const oldGroupData = state.groupList[groupId];

        if (oldGroupData) {
          const oldParticipants = oldGroupData.participants || {};
          const newParticipants = newGroupData.participants || {};

          Object.keys(newParticipants).forEach((userId) => {
            if (oldParticipants[userId]) {
              newParticipants[userId] = {
                ...oldParticipants[userId],
                ...newParticipants[userId],
              };
            }
          });

          Object.keys(oldParticipants).forEach((userId) => {
            if (!newParticipants[userId]) {
              newParticipants[userId] = {
                ...oldParticipants[userId],
              };
            }
          });

          state.groupList[groupId] = {
            ...oldGroupData,
            ...newGroupData,
            participants: newParticipants,
          };
        } else {
          state.groupList[groupId] = newGroupData;
        }
      });
    },
    removeGroupList(state, action) {
      const groupId = action.payload;
      delete state.groupList[groupId];
    }
  },
});

export const { setGroupList, updateUserInfoToGroupList, updateGroupInformations, removeGroupList } =
  groupListSlice.actions;
export default groupListSlice.reducer;
