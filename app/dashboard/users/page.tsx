"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  userManagementService,
  type UserRecord,
} from "@/lib/services/user-management";

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("vi-VN");
}

function formatMoney(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0₫";
  return `${value.toLocaleString("vi-VN")}₫`;
}

function initials(name: string) {
  if (!name.trim()) return "U";
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFirstPage, setIsFirstPage] = useState(true);
  const [isLastPage, setIsLastPage] = useState(true);

  const safeTotalPages = useMemo(() => Math.max(1, totalPages), [totalPages]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await userManagementService.listUsers({ page, size });
      setUsers(response.data.items);
      setTotalElements(response.data.totalElements);
      setTotalPages(response.data.totalPages);
      setIsFirstPage(response.data.first);
      setIsLastPage(response.data.last);

      if (
        selectedUserId &&
        !response.data.items.some((user) => user.userId === selectedUserId)
      ) {
        setSelectedUserId(null);
        setSelectedUser(null);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Không tải được user";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, selectedUserId, size]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    setError(null);
    setSelectedUserId(userId);

    try {
      const response = await userManagementService.getUserById(userId);
      setSelectedUser(response.data);
    } catch (detailError) {
      const message =
        detailError instanceof Error
          ? detailError.message
          : "Không tải được chi tiết user";
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Theo dõi thông tin tài khoản và ví người dùng.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchUsers()}
          disabled={loading}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Danh sách user</CardTitle>
            <CardDescription>
              Tổng {totalElements} user • Trang {page + 1}/{safeTotalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Số dư ví</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrent = selectedUserId === user.userId;

                  return (
                    <TableRow key={user.userId} data-state={isCurrent ? "selected" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.imageUrl || undefined} alt={user.displayName} />
                            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.displayName || "Unknown User"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role || "USER"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(user.wallet?.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void fetchUserDetail(user.userId)}
                          disabled={detailLoading && isCurrent}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      {loading ? "Đang tải user..." : "Không có user"}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={isFirstPage || loading}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                disabled={isLastPage || loading}
                onClick={() =>
                  setPage((current) => Math.min(safeTotalPages - 1, current + 1))
                }
              >
                Trang sau
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi tiết user</CardTitle>
            <CardDescription>
              {selectedUser ? selectedUser.displayName : "Chọn user để xem thông tin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedUserId ? (
              <p className="text-sm text-muted-foreground">Chưa chọn user.</p>
            ) : detailLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải chi tiết...</p>
            ) : !selectedUser ? (
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu chi tiết.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={selectedUser.imageUrl || undefined}
                      alt={selectedUser.displayName}
                    />
                    <AvatarFallback>{initials(selectedUser.displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.displayName}</p>
                    <p className="text-muted-foreground">{selectedUser.email || "-"}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p>
                    <span className="font-medium">User ID:</span>{" "}
                    {selectedUser.userId || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Role:</span>{" "}
                    {selectedUser.role || "USER"}
                  </p>
                  <p>
                    <span className="font-medium">Trạng thái:</span>{" "}
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </p>
                  <p>
                    <span className="font-medium">Ngày tạo:</span>{" "}
                    {formatDate(selectedUser.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium">Cập nhật:</span>{" "}
                    {formatDate(selectedUser.updatedAt)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-medium">Wallet</p>
                  <p>
                    <span className="font-medium">Wallet ID:</span>{" "}
                    {selectedUser.wallet?.walletId ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium">Balance:</span>{" "}
                    {formatMoney(selectedUser.wallet?.balance)}
                  </p>
                  <p>
                    <span className="font-medium">Updated At:</span>{" "}
                    {formatDate(selectedUser.wallet?.updatedAt ?? "")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
