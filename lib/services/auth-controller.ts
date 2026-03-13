export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginRequest = {
  idToken: string;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

const DEFAULT_API_BASE_URL = "https://chicken-kitchen.milize-lena.space";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  DEFAULT_API_BASE_URL;

async function postJson<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload as TResponse;
}

export const authController = {
  login(body: LoginRequest) {
    return postJson<ApiResponse<AuthTokens>, LoginRequest>(
      "/api/auth/login",
      body,
    );
  },

  refreshToken(body: RefreshTokenRequest) {
    return postJson<ApiResponse<AuthTokens>, RefreshTokenRequest>(
      "/api/auth/refresh-token",
      body,
    );
  },

  logout() {
    return postJson<ApiResponse<Record<string, never>>>("/api/auth/logout");
  },
};
