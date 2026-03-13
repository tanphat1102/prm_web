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
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PREPARING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export type ManagerOrder = {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  shippingAddress?: string;
  notes?: string;
  shipperId?: string;
};

export type OrderListResponse = {
  items: ManagerOrder[];
  total: number;
  page: number;
  size: number;
};

export type ListOrdersParams = {
  page?: number;
  size?: number;
  status?: OrderStatus | "ALL";
  keyword?: string;
};

type RawManagerOrder = Partial<ManagerOrder> & {
  customer?: {
    name?: string;
    fullName?: string;
    phone?: string;
  };
  customerFullName?: string;
  phoneNumber?: string;
  total?: number | string;
  amount?: number | string;
  finalAmount?: number | string;
  shippingFee?: number | string;
  address?: string;
  deliveryAddress?: string;
};

function buildQuery(params: ListOrdersParams) {
  const search = new URLSearchParams();

  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.size !== undefined) search.set("size", String(params.size));
  if (params.keyword) search.set("keyword", params.keyword);
  if (params.status && params.status !== "ALL")
    search.set("status", params.status);

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

type RawOrderList = {
  content?: RawManagerOrder[];
  items?: RawManagerOrder[];
  totalElements?: number;
  total?: number;
  number?: number;
  page?: number;
  size?: number;
  limit?: number;
};

function normalizeMoney(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeOrder(order: RawManagerOrder): ManagerOrder {
  return {
    id: order.id ?? "",
    code: order.code ?? "",
    customerName:
      order.customerName ??
      order.customer?.name ??
      order.customer?.fullName ??
      order.customerFullName ??
      "Khách hàng chưa xác định",
    customerPhone:
      order.customerPhone ?? order.customer?.phone ?? order.phoneNumber,
    totalAmount: normalizeMoney(
      order.totalAmount ?? order.total ?? order.amount ?? order.finalAmount,
    ),
    status: (order.status ?? "PENDING") as OrderStatus,
    createdAt: order.createdAt ?? "",
    shippingAddress:
      order.shippingAddress ?? order.address ?? order.deliveryAddress,
    notes: order.notes,
    shipperId: order.shipperId,
  };
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

function normalizeOrderList(payload: unknown): ApiResponse<OrderListResponse> {
  const unwrapped = unwrapPayload<RawOrderList>(payload);

  const items =
    (
      (Array.isArray(unwrapped?.items) ? unwrapped.items : undefined) ||
      (Array.isArray(unwrapped?.content) ? unwrapped.content : [])
    ).map(normalizeOrder);

  const total = unwrapped?.total ?? unwrapped?.totalElements ?? items.length;
  const page = unwrapped?.page ?? unwrapped?.number ?? 0;
  const size = unwrapped?.size ?? unwrapped?.limit ?? items.length;

  return {
    success: true,
    message: "OK",
    data: {
      items,
      total,
      page,
      size,
    },
  };
}

function normalizeOrderDetail(payload: unknown): ApiResponse<ManagerOrder> {
  const unwrapped = unwrapPayload<RawManagerOrder>(payload);

  return {
    success: true,
    message: "OK",
    data: normalizeOrder(unwrapped ?? {}),
  };
}

export const managerOrderManagementService = {
  async listOrders(params: ListOrdersParams) {
    const payload = await requestWithAuth<unknown>(
      `/api/manager/orders${buildQuery(params)}`,
    );
    return normalizeOrderList(payload);
  },

  getOrderById(orderId: string) {
    return requestWithAuth<unknown>(
      `/api/manager/orders/${orderId}`,
    ).then(normalizeOrderDetail);
  },

  approveOrder(orderId: string) {
    return requestWithAuth<ApiResponse<ManagerOrder>>(
      `/api/manager/orders/${orderId}/approve`,
      {
        method: "POST",
      },
    );
  },

  rejectOrder(orderId: string, reason: string) {
    return requestWithAuth<ApiResponse<ManagerOrder>>(
      `/api/manager/orders/${orderId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },

  updateOrderStatus(orderId: string, status: OrderStatus) {
    return requestWithAuth<ApiResponse<ManagerOrder>>(
      `/api/manager/orders/${orderId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  },

  assignShipper(orderId: string, shipperId: string) {
    return requestWithAuth<ApiResponse<ManagerOrder>>(
      `/api/manager/orders/${orderId}/assign-shipper`,
      {
        method: "POST",
        body: JSON.stringify({ shipperId }),
      },
    );
  },

  cancelOrder(orderId: string, reason: string) {
    return requestWithAuth<ApiResponse<ManagerOrder>>(
      `/api/manager/orders/${orderId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },
};
