"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCcw, Scale, Leaf } from "lucide-react";
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
  itemManagementService,
  type ItemRecord,
  type ItemStatus,
} from "@/lib/services/item-management";

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("vi-VN");
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")}₫`;
}

function formatCalories(value: number) {
  return `${value.toLocaleString("vi-VN")} kcal`;
}

function initials(value: string) {
  if (!value.trim()) return "I";
  const words = value.trim().split(/\s+/).slice(0, 2);
  return words
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function statusBadgeVariant(
  status: ItemStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ENABLE") return "default";
  if (status === "DISABLE") return "destructive";
  return "outline";
}

export default function DishItemsPage() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFirstPage, setIsFirstPage] = useState(true);
  const [isLastPage, setIsLastPage] = useState(true);

  const safeTotalPages = useMemo(() => Math.max(1, totalPages), [totalPages]);
  const enabledCount = useMemo(
    () => items.filter((item) => item.status === "ENABLE").length,
    [items],
  );
  const uniqueSteps = useMemo(
    () => new Set(items.map((item) => item.stepId)).size,
    [items],
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await itemManagementService.listItems({ page, size });
      setItems(response.data.items);
      setTotalElements(response.data.totalElements);
      setTotalPages(response.data.totalPages);
      setIsFirstPage(response.data.first);
      setIsLastPage(response.data.last);

      if (
        selectedItemId !== null &&
        !response.data.items.some((item) => item.itemId === selectedItemId)
      ) {
        setSelectedItemId(null);
        setSelectedItem(null);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Không tải được item";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, selectedItemId, size]);

  const fetchItemDetail = useCallback(async (itemId: number) => {
    setDetailLoading(true);
    setError(null);
    setSelectedItemId(itemId);

    try {
      const response = await itemManagementService.getItemById(itemId);
      setSelectedItem(response.data);
    } catch (detailError) {
      const message =
        detailError instanceof Error
          ? detailError.message
          : "Không tải được chi tiết item";
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Item Management</h1>
          <p className="text-muted-foreground">
            Quản lý item theo từng step và thành phần dinh dưỡng.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchItems()} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng item</p>
                <p className="text-xl font-semibold">{totalElements}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Leaf className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ENABLE (trang hiện tại)</p>
                <p className="text-xl font-semibold">{enabledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Số step đang dùng</p>
                <p className="text-xl font-semibold">{uniqueSteps}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Danh sách item</CardTitle>
            <CardDescription>
              Tổng {totalElements} item • Trang {page + 1}/{safeTotalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Calories</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isCurrent = selectedItemId === item.itemId;

                  return (
                    <TableRow
                      key={item.itemId}
                      data-state={isCurrent ? "selected" : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 rounded-md">
                            <AvatarImage
                              src={item.imageUrl || undefined}
                              alt={item.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-md">
                              {initials(item.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium">{item.name || "-"}</p>
                            <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                              {item.description || "Chưa có mô tả"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{item.stepName || "-"}</p>
                        <p className="text-xs text-muted-foreground">ID: {item.stepId}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{formatCalories(item.calories)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void fetchItemDetail(item.itemId)}
                          disabled={detailLoading && isCurrent}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {loading ? "Đang tải item..." : "Không có item"}
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
            <CardTitle>Chi tiết item</CardTitle>
            <CardDescription>
              {selectedItem ? selectedItem.name : "Chọn item để xem thông tin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedItemId === null ? (
              <p className="text-sm text-muted-foreground">Chưa chọn item.</p>
            ) : detailLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải chi tiết...</p>
            ) : !selectedItem ? (
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu chi tiết.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-16 w-16 rounded-lg">
                      <AvatarImage
                        src={selectedItem.imageUrl || undefined}
                        alt={selectedItem.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-lg">
                        {initials(selectedItem.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{selectedItem.name || "-"}</p>
                        <Badge variant={statusBadgeVariant(selectedItem.status)}>
                          {selectedItem.status}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {selectedItem.description || "Chưa có mô tả item."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-semibold">{formatCurrency(selectedItem.price)}</p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Unit</p>
                    <p className="font-semibold">{selectedItem.unit || "-"}</p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Base Qty</p>
                    <p className="font-semibold">{selectedItem.baseQuantity}</p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Calories / Unit</p>
                    <p className="font-semibold">{selectedItem.caloriesPerUnit}</p>
                  </div>
                  <div className="rounded-lg border p-2 col-span-2">
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="font-semibold">{formatCalories(selectedItem.calories)}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p>
                    <span className="font-medium">Item ID:</span> {selectedItem.itemId}
                  </p>
                  <p>
                    <span className="font-medium">Step:</span> {selectedItem.stepName || "-"} (ID: {selectedItem.stepId})
                  </p>
                  <p>
                    <span className="font-medium">Note:</span> {selectedItem.note || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span> {formatDate(selectedItem.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium">Updated:</span> {formatDate(selectedItem.updatedAt)}
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
