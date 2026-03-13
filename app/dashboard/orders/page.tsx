"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, ChevronRight, RefreshCcw } from "lucide-react";
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
  type OrderFilterStatus,
  type OrderStatus,
} from "@/lib/services/manager-order-management";

type FilterStatus = OrderFilterStatus | "ALL";

const statusOptions: FilterStatus[] = [
  "ALL",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "COMPLETED",
];

function statusBadgeVariant(
  status: OrderStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "CANCELLED") return "destructive";
  if (status === "CONFIRMED") return "secondary";
  return "outline";
}

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0₫";
  return `${value.toLocaleString("vi-VN")}₫`;
}

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("vi-VN");
}

function shortId(value: string) {
  if (!value) return "-";
  return value.length <= 10 ? value : `${value.slice(0, 8)}...`;
}

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingOrderId, setActionLoadingOrderId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [status, setStatus] = useState<FilterStatus>("ALL");
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFirstPage, setIsFirstPage] = useState(true);
  const [isLastPage, setIsLastPage] = useState(true);

  const safeTotalPages = useMemo(() => Math.max(1, totalPages), [totalPages]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ListOrdersParams = {
        page,
        size,
        status,
      };

      const response = await managerOrderManagementService.listOrders(params);
      setOrders(response.data.items);
      setTotalElements(response.data.totalElements);
      setTotalPages(response.data.totalPages);
      setIsFirstPage(response.data.first);
      setIsLastPage(response.data.last);

      if (response.data.items.length === 0) {
        setSelectedOrderId(null);
      } else if (
        !selectedOrderId ||
        !response.data.items.some((item) => item.orderId === selectedOrderId)
      ) {
        setSelectedOrderId(response.data.items[0].orderId);
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
  }, [page, selectedOrderId, size, status]);

  const runAction = useCallback(
    async (orderId: string, action: () => Promise<unknown>) => {
      setActionLoadingOrderId(orderId);
      setError(null);

      try {
        await action();
        await fetchOrders();
      } catch (actionError) {
        const message =
          actionError instanceof Error
            ? actionError.message
            : "Thao tác thất bại";
        setError(message);
      } finally {
        setActionLoadingOrderId(null);
      }
    },
    [fetchOrders],
  );

  const handleNextStatus = useCallback(
    (orderId: string) => {
      void runAction(orderId, () =>
        managerOrderManagementService.nextStatus(orderId),
      );
    },
    [runAction],
  );

  const handleCancelOrder = useCallback(
    (orderId: string) => {
      void runAction(orderId, () => managerOrderManagementService.cancelOrder(orderId));
    },
    [runAction],
  );

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
            Quản lý trạng thái đơn theo quy trình: Confirmed -&gt; Processing -&gt;
            Ready -&gt; Completed.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchOrders()} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc đơn hàng</CardTitle>
          <CardDescription>
            Lọc theo 4 trạng thái vận hành chính của hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as FilterStatus);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full md:col-span-2">
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

          <Button onClick={() => void fetchOrders()} disabled={loading}>
            Áp dụng bộ lọc
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Danh sách đơn hàng</CardTitle>
            <CardDescription>
              Tổng {totalElements} đơn hàng - Trang {page + 1}/{safeTotalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead className="text-right">Final Amount</TableHead>
                  <TableHead className="text-right">Món</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const isCurrent = selectedOrderId === order.orderId;
                  const isActionLoading =
                    actionLoadingOrderId === order.orderId || loading;
                  const showMainActions = order.status !== "COMPLETED";

                  return (
                    <TableRow
                      key={order.orderId}
                      data-state={isCurrent ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedOrderId(order.orderId)}
                    >
                      <TableCell className="font-medium">
                        {shortId(order.orderId)}
                      </TableCell>
                      <TableCell>{shortId(order.userId)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.pickupAt)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.finalAmount)}
                      </TableCell>
                      <TableCell className="text-right">{order.dishes.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {showMainActions ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isActionLoading}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleNextStatus(order.orderId);
                                }}
                              >
                                <ChevronRight className="mr-1 h-4 w-4" />
                                Next status
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isActionLoading}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCancelOrder(order.orderId);
                                }}
                              >
                                <Ban className="mr-1 h-4 w-4" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Badge>Completed</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
            <CardTitle>Chi tiết đơn</CardTitle>
            <CardDescription>
              {selectedOrder
                ? `Đơn ${shortId(selectedOrder.orderId)}`
                : "Chọn một đơn để xem chi tiết"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedOrder ? (
              <p className="text-sm text-muted-foreground">Chưa chọn đơn hàng.</p>
            ) : (
              <>
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <p>
                    <span className="font-medium">Order ID:</span>{" "}
                    {selectedOrder.orderId}
                  </p>
                  <p>
                    <span className="font-medium">User ID:</span>{" "}
                    {selectedOrder.userId}
                  </p>
                  <p>
                    <span className="font-medium">Trạng thái:</span>{" "}
                    {selectedOrder.status}
                  </p>
                  <p>
                    <span className="font-medium">Tạo lúc:</span>{" "}
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium">Pickup lúc:</span>{" "}
                    {formatDate(selectedOrder.pickupAt)}
                  </p>
                  <p>
                    <span className="font-medium">Ghi chú:</span>{" "}
                    {selectedOrder.note || "-"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-medium">
                      {formatCurrency(selectedOrder.totalPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Discount</p>
                    <p className="font-medium">
                      {formatCurrency(selectedOrder.discountAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Final</p>
                    <p className="font-medium">
                      {formatCurrency(selectedOrder.finalAmount)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Danh sách món</p>
                    <Badge variant="outline">{selectedOrder.dishes.length} món</Badge>
                  </div>

                  {selectedOrder.dishes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Không có món trong đơn.</p>
                  ) : (
                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                      {selectedOrder.dishes.map((dish) => (
                        <div key={dish.orderDishId} className="rounded-md border p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{dish.dishName || "-"}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {dish.quantity} - Calories: {dish.dishCalories}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{dish.dishStatus || "-"}</Badge>
                              <p className="text-xs font-medium mt-1">
                                {formatCurrency(dish.lineTotal)}
                              </p>
                            </div>
                          </div>

                          {dish.customItems.length > 0 ? (
                            <div className="mt-2 border-t pt-2 space-y-1">
                              {dish.customItems.map((item) => (
                                <div
                                  key={item.orderDishItemId}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <p className="truncate">
                                    {item.itemName} ({item.quantity} {item.unit})
                                  </p>
                                  <p className="font-medium">
                                    {formatCurrency(item.price)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

