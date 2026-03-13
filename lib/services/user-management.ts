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

export type UserWallet = {
  walletId: number;
  balance: number;
  updatedAt: string;
};

export type UserRecord = {
  userId: string;
  displayName: string;
  imageUrl: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  wallet?: UserWallet;
};

export type UserListData = {
  items: UserRecord[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ListUsersParams = {
  page?: number;
  size?: number;
};

type RawWallet = Partial<UserWallet> & {
  id?: number;
  amount?: number;
};

type RawUserRecord = Partial<UserRecord> & {
  id?: string;
  name?: string;
  avatarUrl?: string;
  wallet?: RawWallet;
};

type RawUserListData = {
  content?: RawUserRecord[];
  items?: RawUserRecord[];
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

function buildQuery(params: ListUsersParams) {
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

function normalizeWallet(wallet: RawWallet | undefined): UserWallet | undefined {
  if (!wallet) return undefined;
  return {
    walletId: normalizeNumber(wallet.walletId ?? wallet.id),
    balance: normalizeNumber(wallet.balance ?? wallet.amount),
    updatedAt: wallet.updatedAt ?? "",
  };
}

function normalizeUser(user: RawUserRecord): UserRecord {
  return {
    userId: user.userId ?? user.id ?? "",
    displayName: user.displayName ?? user.name ?? "Unknown User",
    imageUrl: user.imageUrl ?? user.avatarUrl ?? "",
    email: user.email ?? "",
    role: user.role ?? "USER",
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt ?? "",
    updatedAt: user.updatedAt ?? "",
    wallet: normalizeWallet(user.wallet),
  };
}

function normalizeUserList(payload: unknown): ApiResponse<UserListData> {
  const unwrapped = unwrapPayload<RawUserListData>(payload);

  const items =
    (
      (Array.isArray(unwrapped?.items) ? unwrapped.items : undefined) ||
      (Array.isArray(unwrapped?.content) ? unwrapped.content : [])
    ).map(normalizeUser);

  const pageNumber = unwrapped?.pageNumber ?? unwrapped?.number ?? unwrapped?.page ?? 0;
  const pageSize = unwrapped?.pageSize ?? unwrapped?.size ?? items.length;
  const totalElements = unwrapped?.totalElements ?? unwrapped?.total ?? items.length;
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

function normalizeUserDetail(payload: unknown): ApiResponse<UserRecord> {
  const unwrapped = unwrapPayload<RawUserRecord>(payload);

  return {
    success: true,
    message: "OK",
    data: normalizeUser(unwrapped ?? {}),
  };
}

export const userManagementService = {
  async listUsers(params: ListUsersParams) {
    const payload = await requestWithAuth<unknown>(
      `/api/users${buildQuery(params)}`,
    );
    return normalizeUserList(payload);
  },

  getUserById(userId: string) {
    return requestWithAuth<unknown>(`/api/users/${userId}`).then(
      normalizeUserDetail,
    );
  },
};
