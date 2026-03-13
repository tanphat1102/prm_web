"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Flame, Layers3, RefreshCcw, Wallet } from "lucide-react";
import Link from "next/link";
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
  dishManagementService,
  type DishRecord,
  type DishStatus,
  type DishStep,
} from "@/lib/services/dish-management";

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

function statusBadgeVariant(
  status: DishStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "RECOMMENDED") return "default";
  if (status === "DISABLE" || status === "INACTIVE") return "destructive";
  if (status === "ACTIVE" || status === "ENABLE") return "secondary";
  return "outline";
}

function initials(value: string) {
  if (!value.trim()) return "D";
  const words = value.trim().split(/\s+/).slice(0, 2);
  return words
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function selectionLabel(step: DishStep) {
  if (step.minSelect === 0 && step.maxSelect === 0) return "Không giới hạn";
  return `${step.minSelect} - ${step.maxSelect}`;
}

export default function DishesPage() {
  const [dishes, setDishes] = useState<DishRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDishId, setSelectedDishId] = useState<number | null>(null);
  const [selectedDish, setSelectedDish] = useState<DishRecord | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFirstPage, setIsFirstPage] = useState(true);
  const [isLastPage, setIsLastPage] = useState(true);

  const safeTotalPages = useMemo(() => Math.max(1, totalPages), [totalPages]);
  const recommendedCount = useMemo(
    () => dishes.filter((dish) => dish.status === "RECOMMENDED").length,
    [dishes],
  );

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dishManagementService.listDishes({ page, size });
      setDishes(response.data.items);
      setTotalElements(response.data.totalElements);
      setTotalPages(response.data.totalPages);
      setIsFirstPage(response.data.first);
      setIsLastPage(response.data.last);

      if (
        selectedDishId !== null &&
        !response.data.items.some((dish) => dish.dishId === selectedDishId)
      ) {
        setSelectedDishId(null);
        setSelectedDish(null);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Không tải được dish";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, selectedDishId, size]);

  const fetchDishDetail = useCallback(async (dishId: number) => {
    setDetailLoading(true);
    setError(null);
    setSelectedDishId(dishId);

    try {
      const response = await dishManagementService.getDishById(dishId);
      setSelectedDish(response.data);
    } catch (detailError) {
      const message =
        detailError instanceof Error
          ? detailError.message
          : "Không tải được chi tiết dish";
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDishes();
  }, [fetchDishes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dish Management</h1>
          <p className="text-muted-foreground">
            Quản lý món ăn và cấu hình bước chọn thành phần.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/dishes/items">Item management</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => void fetchDishes()}
            disabled={loading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Layers3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng dish</p>
                <p className="text-xl font-semibold">{totalElements}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recommended (trang hiện tại)</p>
                <p className="text-xl font-semibold">{recommendedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hiển thị mỗi trang</p>
                <p className="text-xl font-semibold">{size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Danh sách dish</CardTitle>
            <CardDescription>
              Tổng {totalElements} dish • Trang {page + 1}/{safeTotalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Món ăn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead className="text-right">Calories</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dishes.map((dish) => {
                  const isCurrent = selectedDishId === dish.dishId;

                  return (
                    <TableRow key={dish.dishId} data-state={isCurrent ? "selected" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-md">
                            <AvatarImage
                              src={dish.imageUrl || undefined}
                              alt={dish.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-md">
                              {initials(dish.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium">{dish.name || "-"}</p>
                            <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                              {dish.description || "Chưa có mô tả"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(dish.status)}>
                          {dish.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dish.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCalories(dish.calories)}
                      </TableCell>
                      <TableCell>{formatDate(dish.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void fetchDishDetail(dish.dishId)}
                          disabled={detailLoading && isCurrent}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {dishes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {loading ? "Đang tải dish..." : "Không có dish"}
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
            <CardTitle>Chi tiết dish</CardTitle>
            <CardDescription>
              {selectedDish ? selectedDish.name : "Chọn dish để xem thông tin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDishId === null ? (
              <p className="text-sm text-muted-foreground">Chưa chọn dish.</p>
            ) : detailLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải chi tiết...</p>
            ) : !selectedDish ? (
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu chi tiết.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-16 w-16 rounded-lg">
                      <AvatarImage
                        src={selectedDish.imageUrl || undefined}
                        alt={selectedDish.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-lg">
                        {initials(selectedDish.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{selectedDish.name || "-"}</p>
                        <Badge variant={statusBadgeVariant(selectedDish.status)}>
                          {selectedDish.status}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {selectedDish.description || "Chưa có mô tả món ăn."}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Dish ID: {selectedDish.dishId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Giá</p>
                    <p className="font-semibold">{formatCurrency(selectedDish.price)}</p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="font-semibold">{formatCalories(selectedDish.calories)}</p>
                  </div>
                  <div className="rounded-lg border p-2 col-span-2">
                    <p className="text-xs text-muted-foreground">Ngày tạo / Cập nhật</p>
                    <p className="font-medium">
                      {formatDate(selectedDish.createdAt)} / {formatDate(selectedDish.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Steps</p>
                    <Badge variant="outline">
                      {(selectedDish.steps ?? []).length} bước
                    </Badge>
                  </div>

                  {(selectedDish.steps ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Món ăn chưa có step cấu hình.
                    </p>
                  ) : (
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {(selectedDish.steps ?? []).map((step) => (
                        <div key={step.dishStepId || step.stepId} className="rounded-lg border p-2">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              Bước {step.stepOrder || step.stepNumber}: {step.stepName || "-"}
                            </p>
                            <Badge variant="outline">{step.stepStatus}</Badge>
                            {step.isRequired ? (
                              <Badge>Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {step.stepDescription || "Không có mô tả bước."}
                          </p>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <p>Chọn: {selectionLabel(step)}</p>
                            <p>Items: {step.items.length}</p>
                          </div>

                          {step.items.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {step.items.map((item) => (
                                <div
                                  key={item.itemId}
                                  className="flex items-start justify-between gap-2 rounded-md border bg-background p-2"
                                >
                                  <div className="flex min-w-0 items-start gap-2">
                                    <Avatar className="h-8 w-8 rounded-md">
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
                                      <p className="truncate text-sm font-medium">
                                        {item.name || "-"}
                                      </p>
                                      <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                                        {item.description || "Không có mô tả item."}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.baseQuantity} {item.unit}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right text-xs">
                                    <p className="font-medium">{formatCurrency(item.price)}</p>
                                    <p className="text-muted-foreground">
                                      {formatCalories(item.calories)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Không có item trong bước này.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




