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
import {
  promotionManagementService,
  type PromotionRecord,
  type PromotionStatus,
} from "@/lib/services/promotion-management";

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("vi-VN");
}

function formatDiscount(discountType: string, discountValue: number) {
  if (discountType === "PERCENT") return `${discountValue}%`;
  return `${discountValue.toLocaleString("vi-VN")}₫`;
}

function statusBadgeVariant(
  status: PromotionStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "EXPIRED") return "destructive";
  if (status === "INACTIVE") return "secondary";
  return "outline";
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(
    null,
  );
  const [selectedPromotion, setSelectedPromotion] =
    useState<PromotionRecord | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFirstPage, setIsFirstPage] = useState(true);
  const [isLastPage, setIsLastPage] = useState(true);

  const safeTotalPages = useMemo(() => Math.max(1, totalPages), [totalPages]);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await promotionManagementService.listPromotions({
        page,
        size,
      });
      setPromotions(response.data.items);
      setTotalElements(response.data.totalElements);
      setTotalPages(response.data.totalPages);
      setIsFirstPage(response.data.first);
      setIsLastPage(response.data.last);

      if (
        selectedPromotionId !== null &&
        !response.data.items.some(
          (item) => item.promotionId === selectedPromotionId,
        )
      ) {
        setSelectedPromotionId(null);
        setSelectedPromotion(null);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Không tải được promotion";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, selectedPromotionId, size]);

  const fetchPromotionDetail = useCallback(async (promotionId: number) => {
    setDetailLoading(true);
    setError(null);
    setSelectedPromotionId(promotionId);

    try {
      const response =
        await promotionManagementService.getPromotionById(promotionId);
      setSelectedPromotion(response.data);
    } catch (detailError) {
      const message =
        detailError instanceof Error
          ? detailError.message
          : "Không tải được chi tiết promotion";
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPromotions();
  }, [fetchPromotions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Promotion Management
          </h1>
          <p className="text-muted-foreground">
            Quản lý khuyến mãi và theo dõi trạng thái phát hành.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchPromotions()}
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
            <CardTitle>Danh sách promotion</CardTitle>
            <CardDescription>
              Tổng {totalElements} promotion • Trang {page + 1}/{safeTotalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Giảm giá</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promotion) => {
                  const isCurrent =
                    selectedPromotionId === promotion.promotionId;

                  return (
                    <TableRow
                      key={promotion.promotionId}
                      data-state={isCurrent ? "selected" : undefined}
                    >
                      <TableCell className="font-medium">
                        {promotion.name || "-"}
                      </TableCell>
                      <TableCell>{promotion.code || "-"}</TableCell>
                      <TableCell>
                        {formatDiscount(
                          promotion.discountType,
                          promotion.discountValue,
                        )}
                      </TableCell>
                      <TableCell>{promotion.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(promotion.status)}>
                          {promotion.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(promotion.endDate)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void fetchPromotionDetail(promotion.promotionId)
                          }
                          disabled={detailLoading && isCurrent}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      {loading ? "Đang tải promotion..." : "Không có promotion"}
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
            <CardTitle>Chi tiết promotion</CardTitle>
            <CardDescription>
              {selectedPromotion
                ? selectedPromotion.name
                : "Chọn promotion để xem thông tin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPromotionId === null ? (
              <p className="text-sm text-muted-foreground">
                Chưa chọn promotion.
              </p>
            ) : detailLoading ? (
              <p className="text-sm text-muted-foreground">
                Đang tải chi tiết...
              </p>
            ) : !selectedPromotion ? (
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu chi tiết.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border p-3 space-y-1">
                  <p>
                    <span className="font-medium">Promotion ID:</span>{" "}
                    {selectedPromotion.promotionId}
                  </p>
                  <p>
                    <span className="font-medium">Tên:</span>{" "}
                    {selectedPromotion.name || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Code:</span>{" "}
                    {selectedPromotion.code || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Mô tả:</span>{" "}
                    {selectedPromotion.description || "-"}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p>
                    <span className="font-medium">Loại giảm giá:</span>{" "}
                    {selectedPromotion.discountType}
                  </p>
                  <p>
                    <span className="font-medium">Giá trị:</span>{" "}
                    {formatDiscount(
                      selectedPromotion.discountType,
                      selectedPromotion.discountValue,
                    )}
                  </p>
                  <p>
                    <span className="font-medium">Số lượng:</span>{" "}
                    {selectedPromotion.quantity}
                  </p>
                  <p>
                    <span className="font-medium">Trạng thái:</span>{" "}
                    {selectedPromotion.status}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p>
                    <span className="font-medium">Bắt đầu:</span>{" "}
                    {formatDate(selectedPromotion.startDate)}
                  </p>
                  <p>
                    <span className="font-medium">Kết thúc:</span>{" "}
                    {formatDate(selectedPromotion.endDate)}
                  </p>
                  <p>
                    <span className="font-medium">Tạo lúc:</span>{" "}
                    {formatDate(selectedPromotion.createdAt)}
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

