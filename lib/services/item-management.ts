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

export type ItemStatus = string;

export type ItemRecord = {
  itemId: number;
  stepId: number;
  stepName: string;
  name: string;
  description: string;
  imageUrl: string;
  baseQuantity: number;
  unit: string;
  caloriesPerUnit: number;
  calories: number;
  price: number;
  status: ItemStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemListData = {
  items: ItemRecord[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ListItemsParams = {
  page?: number;
  size?: number;
};

type RawItemRecord = Partial<ItemRecord> & {
  id?: number;
};

type RawItemListData = {
  content?: RawItemRecord[];
  items?: RawItemRecord[];
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

function buildQuery(params: ListItemsParams) {
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

function normalizeItem(record: RawItemRecord): ItemRecord {
  return {
    itemId: normalizeNumber(record.itemId ?? record.id),
    stepId: normalizeNumber(record.stepId),
    stepName: record.stepName ?? "",
    name: record.name ?? "",
    description: record.description ?? "",
    imageUrl: record.imageUrl ?? "",
    baseQuantity: normalizeNumber(record.baseQuantity),
    unit: record.unit ?? "",
    caloriesPerUnit: normalizeNumber(record.caloriesPerUnit),
    calories: normalizeNumber(record.calories),
    price: normalizeNumber(record.price),
    status: record.status ?? "ENABLE",
    note: record.note ?? "",
    createdAt: record.createdAt ?? "",
    updatedAt: record.updatedAt ?? "",
  };
}

function normalizeItemList(payload: unknown): ApiResponse<ItemListData> {
  const unwrapped = unwrapPayload<RawItemListData>(payload);

  const items =
    (
      (Array.isArray(unwrapped?.items) ? unwrapped.items : undefined) ||
      (Array.isArray(unwrapped?.content) ? unwrapped.content : [])
    ).map(normalizeItem);

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

function normalizeItemDetail(payload: unknown): ApiResponse<ItemRecord> {
  const unwrapped = unwrapPayload<RawItemRecord>(payload);

  return {
    success: true,
    message: "OK",
    data: normalizeItem(unwrapped ?? {}),
  };
}

export const itemManagementService = {
  async listItems(params: ListItemsParams) {
    const payload = await requestWithAuth<unknown>(`/api/items${buildQuery(params)}`);
    return normalizeItemList(payload);
  },

  getItemById(itemId: number) {
    return requestWithAuth<unknown>(`/api/items/${itemId}`).then(normalizeItemDetail);
  },
};

