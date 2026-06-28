// @ts-nocheck
import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithReauth } from '../../baseQueryWithReauth';

const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

export const searchUsersApi = createApi({
    reducerPath: 'searchUsersApi',
    baseQuery: createBaseQueryWithReauth(`${BASE_URL}api/`),
    endpoints: (builder) => ({
        searchUsers: builder.query({
            query: (query) => ({
                url: "Users",
                method: "GET",
                params: { Query: query },
            }),
        }),
    }),
});
export const { useSearchUsersQuery } = searchUsersApi;
