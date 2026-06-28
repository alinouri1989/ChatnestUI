// @ts-nocheck
import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithReauth } from '../../baseQueryWithReauth';

const BASE_URL = import.meta.env.VITE_APP_BASE_API_URL;

export const ChatNestAiApi = createApi({
    reducerPath: 'chatNestAiApi',
    baseQuery: createBaseQueryWithReauth(`${BASE_URL}api/`),
    endpoints: (builder) => ({
        generateText: builder.mutation({
            query: ({ prompt, aiModel }) => ({
                url: 'GenerativeAi/Text',
                method: 'POST',
                body: {
                    prompt: prompt,
                    aiModel: aiModel
                },
            }),
        }),
        generateImage: builder.mutation({
            query: ({ prompt, aiModel }) => ({
                url: 'GenerativeAi/Image',
                method: 'POST',
                body: {
                    prompt: prompt,
                    aiModel: aiModel
                },
            }),
        }),
    }),
});

export const {
    useGenerateTextMutation,
    useGenerateImageMutation
} = ChatNestAiApi;
