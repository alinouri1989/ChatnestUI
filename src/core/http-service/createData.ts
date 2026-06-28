import axios, { type AxiosProgressEvent } from 'axios';
import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from '../../store/helpers/tokenStorage';

const API_BASE_URL = `${import.meta.env.VITE_APP_BASE_API_URL ?? ''}api/`;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RequestHeaders = Record<string, string>;

type CreateDataOptions<TBody = unknown> = {
  method?: HttpMethod;
  body?: TBody;
  headers?: RequestHeaders;
  signal?: AbortSignal;
  skipAuth?: boolean;
  onUploadProgress?: (progress: {
    loaded: number;
    total?: number;
    percent?: number;
  }) => void;
};

type RequestResult = {
  status: number;
  ok: boolean;
  data: unknown;
};

const normalizeUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE_URL}${url.replace(/^\/+/, '')}`;
};

const createAbortError = () => {
  const error = new Error('upload_cancelled');
  error.name = 'AbortError';
  return error;
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await axios({
    url: normalizeUrl('Auth/RefreshToken'),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { refreshToken },
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) return null;

  const data = response.data;
  if (data?.token && data?.refreshToken) {
    storeTokens(data);
    return data.token as string;
  }

  return null;
};

const buildHeaders = <TBody>(
  body: TBody | undefined,
  token: string | null | undefined,
  skipAuth: boolean,
  headers?: RequestHeaders,
) => {
  const requestHeaders: RequestHeaders = {};

  if (!(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token && !skipAuth) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (headers) {
    Object.assign(requestHeaders, headers);
  }

  return requestHeaders;
};

const requestWithAxios = async <TBody>(
  url: string,
  options: Required<Pick<CreateDataOptions<TBody>, 'method' | 'skipAuth'>> &
    Pick<CreateDataOptions<TBody>, 'body' | 'headers' | 'signal' | 'onUploadProgress'>,
  token?: string | null,
): Promise<RequestResult> => {
  try {
    const response = await axios({
      url: normalizeUrl(url),
      method: options.method,
      signal: options.signal,
      headers: buildHeaders(options.body, token, options.skipAuth, options.headers),
      data: options.body,
      onUploadProgress: (event: AxiosProgressEvent) => {
        options.onUploadProgress?.({
          loaded: event.loaded,
          total: event.total,
          percent: event.total ? Math.round((event.loaded / event.total) * 100) : undefined,
        });
      },
      validateStatus: () => true,
    });

    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      data: response.status === 204 ? null : response.data,
    };
  } catch (error) {
    if (axios.isCancel(error) || options.signal?.aborted) {
      throw createAbortError();
    }

    throw error;
  }
};

export const createData = async <TResponse = unknown, TBody = unknown>(
  url: string,
  options: CreateDataOptions<TBody> = {},
): Promise<TResponse> => {
  const {
    method = 'GET',
    body,
    headers,
    signal,
    skipAuth = false,
    onUploadProgress,
  } = options;

  const makeRequest = async (token?: string | null) => requestWithAxios(
    url,
    { method, body, headers, signal, skipAuth, onUploadProgress },
    token,
  );

  let response = await makeRequest(skipAuth ? null : getAccessToken());

  if (response.status === 401 && !skipAuth) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      response = await makeRequest(refreshedToken);
    } else {
      clearTokens();
    }
  }

  const { data } = response;

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data
      ? String((data as { message?: string }).message)
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as TResponse;
};
