import { buildApiUrl } from "@/lib/config/api";
import {
  authController,
  type ApiResponse,
} from "@/lib/services/auth-controller";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "@/lib/services/token-storage";

export type NutrientRecord = {
  nutrientId: number;
  name: string;
  description: string;
  unit: string;
};

export type NutrientListData = {
  items: NutrientRecord[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ListNutrientsParams = {
  page?: number;
  size?: number;
};

type RawNutrientRecord = Partial<NutrientRecord> & {
  id?: number;
};

type RawNutrientListData = {
  content?: RawNutrientRecord[];
  items?: RawNutrientRecord[];
  pageNumber?: number;
  number?: number;
  page?: number;
  pageSize?: number;
  size?: number;
  totalElements?: number;
  total?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
};

function buildQuery(params: ListNutrientsParams) {
  const search = new URLSearchParams();

  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.size !== undefined) search.set("size", String(params.size));

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

async function requestWithAuth<TResponse>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<TResponse> {
  const accessToken = getAccessToken();

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });

  if (response.status === 401 && retry) {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthTokens();
      throw new Error("Phiên đăng nhập đã hết hạn");
    }

    const refreshed = await authController.refreshToken({ refreshToken });
    saveAuthTokens(refreshed.data.accessToken, refreshed.data.refreshToken);
    return requestWithAuth<TResponse>(path, init, false);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload as TResponse;
}

function unwrapPayload<T>(payload: unknown): T {
  const wrapped = payload as ApiResponse<T>;
  if (
    wrapped &&
    typeof wrapped === "object" &&
    "success" in wrapped &&
    "data" in wrapped
  ) {
    return wrapped.data;
  }
  return payload as T;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeNutrient(record: RawNutrientRecord): NutrientRecord {
  return {
    nutrientId: normalizeNumber(record.nutrientId ?? record.id),
    name: record.name ?? "",
    description: record.description ?? "",
    unit: record.unit ?? "",
  };
}

function normalizeNutrientList(payload: unknown): ApiResponse<NutrientListData> {
  const unwrapped = unwrapPayload<RawNutrientListData>(payload);

  const items =
    (
      (Array.isArray(unwrapped?.items) ? unwrapped.items : undefined) ||
      (Array.isArray(unwrapped?.content) ? unwrapped.content : [])
    ).map(normalizeNutrient);

  const pageNumber =
    unwrapped?.pageNumber ?? unwrapped?.number ?? unwrapped?.page ?? 0;
  const pageSize = unwrapped?.pageSize ?? unwrapped?.size ?? items.length;
  const totalElements =
    unwrapped?.totalElements ?? unwrapped?.total ?? items.length;
  const totalPages =
    unwrapped?.totalPages ??
    (pageSize > 0 ? Math.ceil(totalElements / pageSize) : 1);

  return {
    success: true,
    message: "OK",
    data: {
      items,
      pageNumber,
      pageSize,
      totalElements,
      totalPages,
      first: Boolean(unwrapped?.first ?? pageNumber <= 0),
      last:
        typeof unwrapped?.last === "boolean"
          ? unwrapped.last
          : pageNumber >= Math.max(0, totalPages - 1),
    },
  };
}

function normalizeNutrientDetail(payload: unknown): ApiResponse<NutrientRecord> {
  const unwrapped = unwrapPayload<RawNutrientRecord>(payload);

  return {
    success: true,
    message: "OK",
    data: normalizeNutrient(unwrapped ?? {}),
  };
}

export const nutrientManagementService = {
  async listNutrients(params: ListNutrientsParams) {
    const payload = await requestWithAuth<unknown>(
      `/api/nutrients${buildQuery(params)}`,
    );
    return normalizeNutrientList(payload);
  },

  getNutrientById(nutrientId: number) {
    return requestWithAuth<unknown>(`/api/nutrients/${nutrientId}`).then(
      normalizeNutrientDetail,
    );
  },
};
