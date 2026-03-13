"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FlaskConical, RefreshCcw, Scale } from "lucide-react";
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
  nutrientManagementService,
  type NutrientRecord,
} from "@/lib/services/nutrient-management";

function unitBadgeVariant(
  unit: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (unit === "G" || unit === "ML") return "default";
  if (unit === "KG" || unit === "L") return "secondary";
  return "outline";
}

export default function NutrientsPage() {
  const [nutrients, setNutrients] = useState<NutrientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedNutrientId, setSelectedNutrientId] = useState<number | null>(
    null,
  );
  const [selectedNutrient, setSelectedNutrient] =
    useState<NutrientRecord | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFirstPage, setIsFirstPage] = useState(true);
  const [isLastPage, setIsLastPage] = useState(true);

  const safeTotalPages = useMemo(() => Math.max(1, totalPages), [totalPages]);
  const uniqueUnits = useMemo(
    () => new Set(nutrients.map((nutrient) => nutrient.unit || "-")).size,
    [nutrients],
  );

  const fetchNutrients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await nutrientManagementService.listNutrients({
        page,
        size,
      });
      setNutrients(response.data.items);
      setTotalElements(response.data.totalElements);
      setTotalPages(response.data.totalPages);
      setIsFirstPage(response.data.first);
      setIsLastPage(response.data.last);

      if (
        selectedNutrientId !== null &&
        !response.data.items.some((item) => item.nutrientId === selectedNutrientId)
      ) {
        setSelectedNutrientId(null);
        setSelectedNutrient(null);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Không tải được nutrient";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, selectedNutrientId, size]);

  const fetchNutrientDetail = useCallback(async (nutrientId: number) => {
    setDetailLoading(true);
    setError(null);
    setSelectedNutrientId(nutrientId);

    try {
      const response =
        await nutrientManagementService.getNutrientById(nutrientId);
      setSelectedNutrient(response.data);
    } catch (detailError) {
      const message =
        detailError instanceof Error
          ? detailError.message
          : "Không tải được chi tiết nutrient";
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNutrients();
  }, [fetchNutrients]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nutrient Management</h1>
          <p className="text-muted-foreground">
            Quản lý danh mục dinh dưỡng và đơn vị đo lường.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchNutrients()}
          disabled={loading}
        >
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
                <FlaskConical className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng nutrient</p>
                <p className="text-xl font-semibold">{totalElements}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đơn vị khác nhau</p>
                <p className="text-xl font-semibold">{uniqueUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
                <FlaskConical className="h-4 w-4" />
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
            <CardTitle>Danh sách nutrient</CardTitle>
            <CardDescription>
              Tổng {totalElements} nutrient • Trang {page + 1}/{safeTotalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên dinh dưỡng</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nutrients.map((nutrient) => {
                  const isCurrent = selectedNutrientId === nutrient.nutrientId;

                  return (
                    <TableRow
                      key={nutrient.nutrientId}
                      data-state={isCurrent ? "selected" : undefined}
                    >
                      <TableCell className="font-medium">
                        {nutrient.name || "-"}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[320px] truncate text-sm text-muted-foreground">
                          {nutrient.description || "Chưa có mô tả"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={unitBadgeVariant(nutrient.unit)}>
                          {nutrient.unit || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void fetchNutrientDetail(nutrient.nutrientId)}
                          disabled={detailLoading && isCurrent}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {nutrients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      {loading ? "Đang tải nutrient..." : "Không có nutrient"}
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
            <CardTitle>Chi tiết nutrient</CardTitle>
            <CardDescription>
              {selectedNutrient
                ? selectedNutrient.name
                : "Chọn nutrient để xem thông tin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedNutrientId === null ? (
              <p className="text-sm text-muted-foreground">
                Chưa chọn nutrient.
              </p>
            ) : detailLoading ? (
              <p className="text-sm text-muted-foreground">
                Đang tải chi tiết...
              </p>
            ) : !selectedNutrient ? (
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu chi tiết.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="font-semibold">{selectedNutrient.name || "-"}</p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedNutrient.description || "Chưa có mô tả nutrient."}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p>
                    <span className="font-medium">Nutrient ID:</span>{" "}
                    {selectedNutrient.nutrientId}
                  </p>
                  <p>
                    <span className="font-medium">Tên:</span>{" "}
                    {selectedNutrient.name || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Đơn vị:</span>{" "}
                    {selectedNutrient.unit || "-"}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Mô tả chi tiết</p>
                  <p className="mt-1">{selectedNutrient.description || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

