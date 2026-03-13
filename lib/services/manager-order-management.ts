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

export type OrderStatus =
  | "CREATED"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type OrderFilterStatus =
  | "CONFIRMED"
  | "PROCESSING"
  | "READY"
  | "COMPLETED";

export type ManagerOrderDishItem = {
  orderDishItemId: number;
  stepId: number;
  itemId: number;
  itemName: string;
  itemImageUrl: string;
  unit: string;
  quantity: number;
  price: number;
  calories: number;
  note: string;
};

export type ManagerOrderDish = {
  orderDishId: number;
  dishId: number;
  dishName: string;
  dishImageUrl: string;
  dishStatus: string;
  dishPrice: number;
  dishCalories: number;
  quantity: number;
  lineTotal: number;
  customItems: ManagerOrderDishItem[];
};

export type ManagerOrder = {
  orderId: string;
  userId: string;
  totalPrice: number;
  discountAmount: number;
  finalAmount: number;
  status: OrderStatus;
  createdAt: string;
  pickupAt: string;
  note: string;
  dishes: ManagerOrderDish[];
};

export type OrderListResponse = {
  items: ManagerOrder[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ListOrdersParams = {
  page?: number;
  size?: number;
  status?: OrderFilterStatus | "ALL";
};

type RawOrderDishItem = Partial<ManagerOrderDishItem> & {
  id?: number;
};

type RawOrderDish = Partial<ManagerOrderDish> & {
  id?: number;
  customItems?: RawOrderDishItem[];
};

type RawManagerOrder = Partial<ManagerOrder> & {
  id?: string;
  dishes?: RawOrderDish[];
};

type RawOrderList = {
  content?: RawManagerOrder[];
  items?: RawManagerOrder[];
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

function buildQuery(params: ListOrdersParams) {
  const search = new URLSearchParams();

  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.size !== undefined) search.set("size", String(params.size));
  if (params.status && params.status !== "ALL") {
    search.set("status", params.status);
  }

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

function normalizeDishItem(item: RawOrderDishItem): ManagerOrderDishItem {
  return {
    orderDishItemId: normalizeNumber(item.orderDishItemId ?? item.id),
    stepId: normalizeNumber(item.stepId),
    itemId: normalizeNumber(item.itemId),
    itemName: item.itemName ?? "",
    itemImageUrl: item.itemImageUrl ?? "",
    unit: item.unit ?? "",
    quantity: normalizeNumber(item.quantity),
    price: normalizeNumber(item.price),
    calories: normalizeNumber(item.calories),
    note: item.note ?? "",
  };
}

function normalizeDish(dish: RawOrderDish): ManagerOrderDish {
  return {
    orderDishId: normalizeNumber(dish.orderDishId ?? dish.id),
    dishId: normalizeNumber(dish.dishId),
    dishName: dish.dishName ?? "",
    dishImageUrl: dish.dishImageUrl ?? "",
    dishStatus: dish.dishStatus ?? "",
    dishPrice: normalizeNumber(dish.dishPrice),
    dishCalories: normalizeNumber(dish.dishCalories),
    quantity: normalizeNumber(dish.quantity),
    lineTotal: normalizeNumber(dish.lineTotal),
    customItems: (Array.isArray(dish.customItems) ? dish.customItems : []).map(
      normalizeDishItem,
    ),
  };
}

function normalizeOrder(order: RawManagerOrder): ManagerOrder {
  return {
    orderId: order.orderId ?? order.id ?? "",
    userId: order.userId ?? "",
    totalPrice: normalizeNumber(order.totalPrice),
    discountAmount: normalizeNumber(order.discountAmount),
    finalAmount: normalizeNumber(order.finalAmount),
    status: (order.status ?? "CREATED") as OrderStatus,
    createdAt: order.createdAt ?? "",
    pickupAt: order.pickupAt ?? "",
    note: order.note ?? "",
    dishes: (Array.isArray(order.dishes) ? order.dishes : []).map(normalizeDish),
  };
}

function normalizeOrderList(payload: unknown): ApiResponse<OrderListResponse> {
  const unwrapped = unwrapPayload<RawOrderList>(payload);

  const items =
    (
      (Array.isArray(unwrapped?.items) ? unwrapped.items : undefined) ||
      (Array.isArray(unwrapped?.content) ? unwrapped.content : [])
    ).map(normalizeOrder);

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

export const managerOrderManagementService = {
  async listOrders(params: ListOrdersParams) {
    const payload = await requestWithAuth<unknown>(
      `/api/manager/orders${buildQuery(params)}`,
    );
    return normalizeOrderList(payload);
  },

  nextStatus(orderId: string) {
    return requestWithAuth<ApiResponse<ManagerOrder>>(
      `/api/manager/orders/${orderId}/next-status`,
      {
        method: "PATCH",
      },
    );
  },

  cancelOrder(orderId: string) {
    return requestWithAuth<ApiResponse<ManagerOrder>>(
      `/api/manager/orders/${orderId}/cancel`,
      {
        method: "PATCH",
      },
    );
  },
};

