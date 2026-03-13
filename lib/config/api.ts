const DEFAULT_API_BASE_URL = "https://chicken-kitchen.milize-lena.space";
//Tam thoi fixed ở đây để call API từ server mới do thằng chủ repo nó config ở env mà nó kêu t vào sửa
//Coi cay không

export const API_BASE_URL =
  // normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
  DEFAULT_API_BASE_URL;

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
