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

export type DiscountType = "PERCENT" | "AMOUNT" | string;
export type PromotionStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | string;

export type PromotionRecord = {
  promotionId: number;
  name: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  quantity: number;
  status: PromotionStatus;
  createdAt: string;
};

export type PromotionListData = {
  items: PromotionRecord[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ListPromotionsParams = {
  page?: number;
  size?: number;
};

type RawPromotionRecord = Partial<PromotionRecord> & {
  id?: number;
};

type RawPromotionListData = {
  content?: RawPromotionRecord[];
  items?: RawPromotionRecord[];
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

function buildQuery(params: ListPromotionsParams) {
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

function normalizePromotion(promotion: RawPromotionRecord): PromotionRecord {
  return {
    promotionId: normalizeNumber(promotion.promotionId ?? promotion.id),
    name: promotion.name ?? "",
    code: promotion.code ?? "",
    description: promotion.description ?? "",
    discountType: promotion.discountType ?? "PERCENT",
    discountValue: normalizeNumber(promotion.discountValue),
    startDate: promotion.startDate ?? "",
    endDate: promotion.endDate ?? "",
    quantity: normalizeNumber(promotion.quantity),
    status: promotion.status ?? "INACTIVE",
    createdAt: promotion.createdAt ?? "",
  };
}

function normalizePromotionList(
  payload: unknown,
): ApiResponse<PromotionListData> {
  const unwrapped = unwrapPayload<RawPromotionListData>(payload);

  const items =
    (
      (Array.isArray(unwrapped?.items) ? unwrapped.items : undefined) ||
      (Array.isArray(unwrapped?.content) ? unwrapped.content : [])
    ).map(normalizePromotion);

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

function normalizePromotionDetail(
  payload: unknown,
): ApiResponse<PromotionRecord> {
  const unwrapped = unwrapPayload<RawPromotionRecord>(payload);

  return {
    success: true,
    message: "OK",
    data: normalizePromotion(unwrapped ?? {}),
  };
}

export const promotionManagementService = {
  async listPromotions(params: ListPromotionsParams) {
    const payload = await requestWithAuth<unknown>(
      `/api/promotions${buildQuery(params)}`,
    );
    return normalizePromotionList(payload);
  },

  getPromotionById(promotionId: number) {
    return requestWithAuth<unknown>(`/api/promotions/${promotionId}`).then(
      normalizePromotionDetail,
    );
  },
};
