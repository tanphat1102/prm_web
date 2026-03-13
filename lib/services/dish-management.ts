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

export type DishStatus = string;
export type DishStepStatus = string;
export type DishItemStatus = string;

export type DishItem = {
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
  status: DishItemStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type DishStep = {
  dishStepId: number;
  stepId: number;
  stepName: string;
  stepDescription: string;
  stepNumber: number;
  stepStatus: DishStepStatus;
  stepOrder: number;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  items: DishItem[];
};

export type DishRecord = {
  dishId: number;
  name: string;
  description: string;
  price: number;
  status: DishStatus;
  imageUrl: string;
  calories: number;
  createdAt: string;
  updatedAt: string;
  steps?: DishStep[];
};

export type DishListData = {
  items: DishRecord[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ListDishesParams = {
  page?: number;
  size?: number;
};

type RawDishItem = Partial<DishItem> & {
  id?: number;
};

type RawDishStep = Partial<DishStep> & {
  items?: RawDishItem[];
  id?: number;
};

type RawDishRecord = Partial<DishRecord> & {
  id?: number;
  steps?: RawDishStep[];
};

type RawDishListData = {
  content?: RawDishRecord[];
  items?: RawDishRecord[];
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

function buildQuery(params: ListDishesParams) {
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

function normalizeDishItem(item: RawDishItem): DishItem {
  return {
    itemId: normalizeNumber(item.itemId ?? item.id),
    stepId: normalizeNumber(item.stepId),
    stepName: item.stepName ?? "",
    name: item.name ?? "",
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    baseQuantity: normalizeNumber(item.baseQuantity),
    unit: item.unit ?? "",
    caloriesPerUnit: normalizeNumber(item.caloriesPerUnit),
    calories: normalizeNumber(item.calories),
    price: normalizeNumber(item.price),
    status: item.status ?? "ENABLE",
    note: item.note ?? "",
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",
  };
}

function normalizeDishStep(step: RawDishStep): DishStep {
  return {
    dishStepId: normalizeNumber(step.dishStepId ?? step.id),
    stepId: normalizeNumber(step.stepId),
    stepName: step.stepName ?? "",
    stepDescription: step.stepDescription ?? "",
    stepNumber: normalizeNumber(step.stepNumber),
    stepStatus: step.stepStatus ?? "ENABLE",
    stepOrder: normalizeNumber(step.stepOrder),
    minSelect: normalizeNumber(step.minSelect),
    maxSelect: normalizeNumber(step.maxSelect),
    isRequired: Boolean(step.isRequired),
    items: (Array.isArray(step.items) ? step.items : []).map(normalizeDishItem),
  };
}

function normalizeDish(record: RawDishRecord): DishRecord {
  return {
    dishId: normalizeNumber(record.dishId ?? record.id),
    name: record.name ?? "",
    description: record.description ?? "",
    price: normalizeNumber(record.price),
    status: record.status ?? "UNKNOWN",
    imageUrl: record.imageUrl ?? "",
    calories: normalizeNumber(record.calories),
    createdAt: record.createdAt ?? "",
    updatedAt: record.updatedAt ?? "",
    steps: Array.isArray(record.steps)
      ? record.steps.map(normalizeDishStep)
      : undefined,
  };
}

function normalizeDishList(payload: unknown): ApiResponse<DishListData> {
  const unwrapped = unwrapPayload<RawDishListData>(payload);

  const items =
    (
      (Array.isArray(unwrapped?.items) ? unwrapped.items : undefined) ||
      (Array.isArray(unwrapped?.content) ? unwrapped.content : [])
    ).map(normalizeDish);

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

function normalizeDishDetail(payload: unknown): ApiResponse<DishRecord> {
  const unwrapped = unwrapPayload<RawDishRecord>(payload);

  return {
    success: true,
    message: "OK",
    data: normalizeDish(unwrapped ?? {}),
  };
}

export const dishManagementService = {
  async listDishes(params: ListDishesParams) {
    const query = buildQuery(params);

    try {
      const payload = await requestWithAuth<unknown>(`/api/dishses${query}`);
      return normalizeDishList(payload);
    } catch {
      const payload = await requestWithAuth<unknown>(`/api/dishes${query}`);
      return normalizeDishList(payload);
    }
  },

  getDishById(dishId: number) {
    return requestWithAuth<unknown>(`/api/dishes/${dishId}`).then(
      normalizeDishDetail,
    );
  },
};
