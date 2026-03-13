"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  managerOrderManagementService,
  type ListOrdersParams,
  type ManagerOrder,
  type OrderStatus,
} from "@/lib/services/manager-order-management";

type OrderFilterStatus = OrderStatus | "ALL";

const statusOptions: OrderFilterStatus[] = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PREPARING",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

const statusActionOptions: OrderStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PREPARING",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

function statusBadgeVariant(
  status: OrderStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "DELIVERED") return "default";
  if (status === "CANCELLED" || status === "REJECTED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0₫";
  }

  return `${value.toLocaleString("vi-VN")}₫`;
}

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ManagerOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<OrderFilterStatus>("ALL");
  const [keyword, setKeyword] = useState("");
  const [reason, setReason] = useState("");
  const [shipperId, setShipperId] = useState("");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / size)),
    [total, size],
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ListOrdersParams = {
        page,
        size,
        status,
        keyword: keyword.trim() || undefined,
      };
      const response = await managerOrderManagementService.listOrders(params);
      setOrders(response.data.items);
      setTotal(response.data.total);

      if (response.data.items.length > 0 && !selectedOrder) {
        setSelectedOrder(response.data.items[0]);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Không tải được đơn hàng";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, selectedOrder, size, status]);

  async function refreshOrderDetail(orderId: string) {
    const detail = await managerOrderManagementService.getOrderById(orderId);
    setSelectedOrder(detail.data);
  }

  async function runAction(action: () => Promise<unknown>) {
    setActionLoading(true);
    setError(null);

    try {
      await action();
      await fetchOrders();
      if (selectedOrder) {
        await refreshOrderDetail(selectedOrder.id);
      }
      setReason("");
      setShipperId("");
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Thao tác thất bại";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manager Order Management
          </h1>
          <p className="text-muted-foreground">
            Duyệt và cập nhật trạng thái đơn hàng.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchOrders()}
          disabled={loading}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc đơn hàng</CardTitle>
          <CardDescription>
            Tìm kiếm theo mã/tên khách và lọc trạng thái.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="pl-8"
              placeholder="Nhập mã đơn hoặc tên khách"
            />
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as OrderFilterStatus);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="md:col-span-3"
            onClick={() => void fetchOrders()}
            disabled={loading}
          >
            Áp dụng bộ lọc
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Danh sách đơn hàng</CardTitle>
            <CardDescription>
              Tổng {total} đơn hàng • Trang {page + 1}/{totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.code}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refreshOrderDetail(order.id)}
                      >
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      {loading ? "Đang tải..." : "Không có đơn hàng"}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={page <= 0 || loading}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Trang sau
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duyệt đơn hàng</CardTitle>
            <CardDescription>
              {selectedOrder
                ? `Đơn ${selectedOrder.code}`
                : "Chọn một đơn để thao tác"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {!selectedOrder ? (
              <p className="text-sm text-muted-foreground">
                Chưa chọn đơn hàng.
              </p>
            ) : (
              <>
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <p>
                    <span className="font-medium">Khách:</span>{" "}
                    {selectedOrder.customerName}
                  </p>
                  <p>
                    <span className="font-medium">SĐT:</span>{" "}
                    {selectedOrder.customerPhone || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Địa chỉ:</span>{" "}
                    {selectedOrder.shippingAddress || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Trạng thái:</span>{" "}
                    {selectedOrder.status}
                  </p>
                </div>

                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Lý do từ chối/hủy"
                />

                <Input
                  value={shipperId}
                  onChange={(event) => setShipperId(event.target.value)}
                  placeholder="Shipper ID"
                />

                <Select
                  onValueChange={(value) => {
                    void runAction(() =>
                      managerOrderManagementService.updateOrderStatus(
                        selectedOrder.id,
                        value as OrderStatus,
                      ),
                    );
                  }}
                  disabled={actionLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cập nhật trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusActionOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    disabled={actionLoading}
                    onClick={() =>
                      void runAction(() =>
                        managerOrderManagementService.approveOrder(
                          selectedOrder.id,
                        ),
                      )
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Duyệt
                  </Button>

                  <Button
                    variant="destructive"
                    disabled={actionLoading || !reason.trim()}
                    onClick={() =>
                      void runAction(() =>
                        managerOrderManagementService.rejectOrder(
                          selectedOrder.id,
                          reason.trim(),
                        ),
                      )
                    }
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Từ chối
                  </Button>

                  <Button
                    variant="outline"
                    disabled={actionLoading || !shipperId.trim()}
                    onClick={() =>
                      void runAction(() =>
                        managerOrderManagementService.assignShipper(
                          selectedOrder.id,
                          shipperId.trim(),
                        ),
                      )
                    }
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Gán shipper
                  </Button>

                  <Button
                    variant="destructive"
                    disabled={actionLoading || !reason.trim()}
                    onClick={() =>
                      void runAction(() =>
                        managerOrderManagementService.cancelOrder(
                          selectedOrder.id,
                          reason.trim(),
                        ),
                      )
                    }
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Hủy đơn
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
