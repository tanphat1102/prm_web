const DEFAULT_API_BASE_URL = "https://chicken-kitchen.milize-lena.space";
//Tam thoi fixed ở đây để call API từ server mới do thằng chủ repo nó config ở env mà nó kêu t vào sửa
//Coi cay không
function normalizeBaseUrl(url?: string): string {
  return url?.trim().replace(/\/+$/, "") ?? "";
}

export const API_BASE_URL =
  // normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
  DEFAULT_API_BASE_URL;

export const MANAGER_API_BASE_URL =
  // normalizeBaseUrl(process.env.NEXT_PUBLIC_MANAGER_API_BASE_URL) ||
  API_BASE_URL;

type ApiScope = "default" | "manager";

const API_BASE_URLS: Record<ApiScope, string> = {
  default: API_BASE_URL,
  manager: MANAGER_API_BASE_URL,
};

export function buildApiUrl(path: string, scope: ApiScope = "default"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URLS[scope]}${normalizedPath}`;
}
