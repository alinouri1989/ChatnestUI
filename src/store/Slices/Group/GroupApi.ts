// @ts-nocheck
import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithReauth } from '../../baseQueryWithReauth';
import { prepareGroupFormData } from '../../helpers/prepareGroupFormData';

const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

export const GroupApi = createApi({
  reducerPath: 'newGroupApi',
  baseQuery: createBaseQueryWithReauth(`${BASE_URL}api/Group`),
  endpoints: (builder) => ({
    createGroup: builder.mutation({
      query: (formData) => ({
        url: '/Create',
        method: 'POST',
        body: prepareGroupFormData(formData, false),
      }),
    }),

    editGroup: builder.mutation({
      query: ({ groupId, formData }) => ({
        url: `/Edit/${groupId}`,
        method: 'PUT',
        body: prepareGroupFormData(formData, true),
      }),
    }),

    leaveGroup: builder.mutation({
      query: (groupId) => ({
        url: `/Leave/${groupId}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useCreateGroupMutation,
  useEditGroupMutation,
  useLeaveGroupMutation
} = GroupApi;
