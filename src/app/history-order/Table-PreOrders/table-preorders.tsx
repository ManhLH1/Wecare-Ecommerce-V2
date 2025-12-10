import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Typography,
  Box,
  Table,
  TableBody as MuiTableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  Paper,
  Grid,
  IconButton,
  Collapse,
} from "@mui/material";
import { vndFormatter } from "@/utils/vndFormatter";
import axios from "axios";
import { getItem } from "@/utils/SecureStorage";
import { useDebounce } from "use-debounce";
import { EmptyState } from "@/components/ui/empty-state";
import Pagination from "@/app/product-list/_components/paging";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { formatDateToDDMMYYYY } from '@/utils/utils';

interface HistoryPreOrder {
  crdfd_athangsoid: string;
  crdfd_idkhachhang: string;
  crdfd_idonvi: string;
  crdfd_idsanpham: string;
  crdfd_name: string;
  crdfd_onvitext: string;
  crdfd_sanphamtext: string;
  crdfd_chieckhau: number;
  crdfd_ctkm: boolean;
  crdfd_soluong: number;
  crdfd_nguoitao: string;
  crdfd_ngaytao2: string;
  crdfd_giagoc: number;
  crdfd_giaexuat: number;
  crdfd_duyetgia: any;
  cr1bb_trangthaiduyetgia: string;
  statecode: number;
  crdfd_trangthaionhang: number;
  _cr1bb_khachhang_value: string;
  _cr1bb_onvi_value: string;
  _cr1bb_sanpham_value: string;
  cr1bb_onvichietkhau: string;
}

interface PreOrdersTableProps {
  items: HistoryPreOrder[];
  totalPagesPreOders: number;
  fromDate: string;
  toDate: string;
  showPrices?: boolean;
}

const PreOrdersTable: React.FC<PreOrdersTableProps> = ({
  items,
  totalPagesPreOders,
  fromDate,
  toDate,
  showPrices = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentPage, setCurrentPage] = useState(1);
  const [currentItems, setCurrentItems] = useState(items);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(true);
  const [historyPreOrders, setHistoryPreOrders] = useState<HistoryPreOrder[]>();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchPreOrders = useCallback(async () => {
    const storedId = getItem("id");
    const typelogin = getItem("type");
    if (storedId) {
      try {
        setLoading(true);
        const response = await axios.get(
          `/api/getDataDathangSOAll?id=${storedId}`
        );

        // Lọc dữ liệu theo ngày tạo (crdfd_ngaytao2)
        const filteredPreOders = response.data.filter(
          (PreOder: { crdfd_ngaytao2: string }) => {
            const orderDate = new Date(PreOder.crdfd_ngaytao2);
            const startDate = fromDate
              ? new Date(`${fromDate}T00:00:00`)
              : null;
            const endDate = toDate ? new Date(`${toDate}T23:59:59`) : null;

            return (
              (!startDate || orderDate >= startDate) &&
              (!endDate || orderDate <= endDate)
            );
          }
        );

        // Cập nhật state với dữ liệu đã lọc
        setHistoryPreOrders(filteredPreOders);
        setCurrentItems(filteredPreOders);
      } catch (error) {
        console.error("Error fetching Orders:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [fromDate, toDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDateToDDMMYYYY(date);
  };

  const calculateTotalPrice = (
    giagoc: number,
    chietkhau: number,
    soluong: number,
    giaexuat: number
  ) => {
    const totalPrice = giaexuat * soluong;
    return totalPrice;
  };

  const trangthailendon = (trangthailendon: number) => {
    switch (trangthailendon) {
      case 191920000:
        return { Value: "Chờ xác nhận", Style: "#0ea5e9" };
      case 191920001:
        return { Value: "Đã hủy", Style: "#ef4444" };
      default:
        return { Value: "Đã hủy", Style: "#ef4444" };
    }
  };

  useEffect(() => {
    if (historyPreOrders) {
      setCurrentItems(historyPreOrders);
    }
  }, [historyPreOrders]);

  const handleConfirmCancelOrder = (orderId: string, productName: string) => {
    showConfirmDialog(
      "Xác nhận hủy đơn",
      `Bạn có chắc chắn muốn hủy đơn hàng "${productName}" không?`,
      () => {
        handleCancelOrder(orderId);
        handleCloseConfirmDialog();
      }
    );
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false,
    });
  };
  const showConfirmDialog = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      onConfirm,
    });
  };

  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await axios.patch(`/api/updateHistoryPreOrderStatus`, {
        crdfd_athangsoid: orderId,
        crdfd_trangthaionhang: 191920002, // Hủy đơn hàng
      });

      if (response.status === 200) {
        // Cập nhật state ngay lập tức
        const updatedItems = currentItems.map((order) => {
          if (order.crdfd_athangsoid === orderId) {
            return {
              ...order,
              crdfd_trangthaionhang: 191920002,
            };
          }
          return order;
        });

        setCurrentItems(updatedItems);

        setSnackbar({
          open: true,
          message: "Hủy đơn hàng thành công",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error canceling order:", error);
      setSnackbar({
        open: true,
        message: "Có lỗi xảy ra khi hủy đơn hàng",
        severity: "error",
      });
    }
  };
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);
  const itemsPerPage = 10;
  const currentPreOrders = useMemo(() => {
    if (!currentItems || currentItems.length === 0) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return currentItems.slice(startIndex, startIndex + itemsPerPage);
  }, [currentItems, currentPage]);

  const debouncedFetchPreOrders = useDebounce(fetchPreOrders, 300)[0];

  useEffect(() => {
    fetchPreOrders();
  }, [fromDate, toDate, fetchPreOrders]);

  // Tính toán số trang
  const totalPages = Math.ceil((currentItems?.length || 0) / itemsPerPage);

  const toggleRowExpansion = (orderId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(orderId)) {
      newExpandedRows.delete(orderId);
    } else {
      newExpandedRows.add(orderId);
    }
    setExpandedRows(newExpandedRows);
  };

  const formatPrice = useCallback(
    (price: number | string | null | undefined): string => {
      if (!showPrices) {
        return "Liên hệ CSKH";
      }
      if (
        price === null ||
        price === undefined ||
        price === 0 ||
        price === ""
      ) {
        return "Liên hệ để được báo giá";
      }
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      return isNaN(numPrice)
        ? "Liên hệ để được báo giá"
        : `${numPrice.toLocaleString()} đ`;
    },
    [showPrices]
  );

  const renderMobileView = (order: HistoryPreOrder) => {
    const isExpanded = expandedRows.has(order.crdfd_athangsoid);
    
    return (
      <Paper 
        key={order.crdfd_athangsoid}
        onClick={() => toggleRowExpansion(order.crdfd_athangsoid)}
        sx={{ 
          mb: 2, 
          p: 2,
          borderRadius: 2,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {order.crdfd_sanphamtext}
            </Typography>
            <Chip
              sx={{
                border: `1px solid ${trangthailendon(order.crdfd_trangthaionhang).Style}`,
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "4px 8px",
                height: "auto",
                mt: 1,
                "& .MuiChip-label": {
                  color: trangthailendon(order.crdfd_trangthaionhang).Style,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0",
                },
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
              }}
              size="small"
              label={trangthailendon(order.crdfd_trangthaionhang).Value}
            />
          </Box>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              toggleRowExpansion(order.crdfd_athangsoid);
            }}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        <Collapse in={isExpanded}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Đơn vị:</Typography>
                <Typography variant="body2">{order.crdfd_onvitext}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Số lượng:</Typography>
                <Typography variant="body2">{order.crdfd_soluong}</Typography>
              </Box>
            </Grid>
            {showPrices && (
              <>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Giá gốc:</Typography>
                    <Typography variant="body2">{vndFormatter.format(order.crdfd_giagoc)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Giá sau chiết khấu:</Typography>
                    <Typography variant="body2">{vndFormatter.format(order.crdfd_giaexuat)}</Typography>
                  </Box>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Chiết khấu:</Typography>
                <Typography variant="body2">{order.crdfd_chieckhau}{order.cr1bb_onvichietkhau}/{order.crdfd_onvitext}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Người tạo:</Typography>
                <Typography variant="body2">{order.crdfd_nguoitao}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Ngày tạo:</Typography>
                <Typography variant="body2">{formatDate(order.crdfd_ngaytao2)}</Typography>
              </Box>
            </Grid>
            {order.crdfd_ctkm && (
              <Grid item xs={12}>
                <Chip
                  label="Chương trình khuyến mãi"
                  size="small"
                  sx={{
                    height: "24px",
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    fontWeight: 600,
                    fontSize: "12px",
                    "& .MuiChip-label": {
                      px: 1.5,
                    },
                    border: "1px solid #a7f3d0",
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                {order.crdfd_trangthaionhang !== 191920002 && order.crdfd_trangthaionhang !== 191920001 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmCancelOrder(order.crdfd_athangsoid, order.crdfd_sanphamtext);
                    }}
                    sx={{
                      minWidth: "80px",
                      height: "32px",
                      px: 2,
                      borderColor: "error.light",
                      color: "error.main",
                      fontSize: "13px",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "error.lighter",
                        borderColor: "error.main",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    Hủy
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      {loading ? (
        <EmptyState isLoading description="Đang tải dữ liệu..." />
      ) : currentPreOrders && currentPreOrders.length > 0 ? (
        <>
          {isMobile ? (
            <Box sx={{ p: 2 }}>
              {currentPreOrders.map((order) => renderMobileView(order))}
            </Box>
          ) : (
            <Table aria-label="simple table" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell width="23%" sx={{ py: 2.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                      className="text-gray-700"
                    >
                      Thông tin sản phẩm
                    </Typography>
                  </TableCell>
                  <TableCell width="10%" sx={{ py: 2.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                      className="text-gray-700"
                    >
                      Số lượng
                    </Typography>
                  </TableCell>
                  <TableCell width="10%" sx={{ py: 2.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                      className="text-gray-700"
                    >
                      Thành tiền
                    </Typography>
                  </TableCell>
                  <TableCell width="10%" sx={{ py: 2.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                      className="text-gray-700"
                    >
                      Trạng thái
                    </Typography>
                  </TableCell>
                  <TableCell width="20%" align="left" sx={{ py: 2.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                      className="text-gray-700"
                    ></Typography>
                  </TableCell>
                  <TableCell width="5%" align="center" sx={{ py: 2.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        marginRight: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                      className="text-gray-700"
                    >
                      Thao tác
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <MuiTableBody>
                {currentPreOrders.map((PreOders: HistoryPreOrder) => (
                  <TableRow
                    key={PreOders.crdfd_athangsoid}
                    sx={{
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.02)",
                        transition: "background-color 0.2s ease-in-out",
                      },
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <TableCell sx={{ py: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            className="text-gray-700 font-semibold mb-2"
                            sx={{
                              fontSize: "14px",
                              lineHeight: "1.5",
                              color: "#334155",
                              fontWeight: 600,
                            }}
                          >
                            {PreOders.crdfd_sanphamtext}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 3,
                              flexWrap: "wrap",
                              "& > *": {
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              },
                            }}
                          >
                            <Box>
                              <Typography
                                sx={{ fontSize: "13px", color: "#6B7280" }}
                                className="text-gray-700"
                              >
                                Đơn vị:
                              </Typography>
                              <Typography
                                sx={{ fontSize: "13px" }}
                                className="text-gray-700 font-medium"
                              >
                                {PreOders.crdfd_onvitext}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                sx={{ fontSize: "13px", color: "#6B7280" }}
                                className="text-gray-700"
                              >
                                Giá gốc:
                              </Typography>
                              <Typography
                                sx={{ fontSize: "13px" }}
                                className="text-gray-700 font-medium"
                              >
                                {vndFormatter.format(PreOders.crdfd_giagoc)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                sx={{ fontSize: "13px", color: "#6B7280" }}
                                className="text-gray-700"
                              >
                                Giá sau chiết khấu:
                              </Typography>
                              <Typography
                                sx={{ fontSize: "13px" }}
                                className="text-gray-700 font-medium"
                              >
                                {vndFormatter.format(PreOders.crdfd_giaexuat)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                sx={{ fontSize: "13px", color: "#6B7280" }}
                                className="text-gray-700"
                              >
                                Chiết khấu:
                              </Typography>
                              <Typography
                                sx={{ fontSize: "13px" }}
                                className="text-gray-700 font-medium"
                              >
                                {PreOders.crdfd_chieckhau}{PreOders.cr1bb_onvichietkhau}/{PreOders.crdfd_onvitext}
                              </Typography>
                            </Box>
                          </Box>
                          {PreOders.crdfd_ctkm && (
                            <Chip
                              label="Chương trình khuyến mãi"
                              size="small"
                              sx={{
                                mt: 1.5,
                                height: "24px",
                                backgroundColor: "#ecfdf5",
                                color: "#059669",
                                fontWeight: 600,
                                fontSize: "12px",
                                "& .MuiChip-label": {
                                  px: 1.5,
                                },
                                border: "1px solid #a7f3d0",
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        fontWeight={500}
                        className="text-gray-700"
                        sx={{ fontSize: "14px" }}
                      >
                        {PreOders.crdfd_soluong}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        className="text-gray-700 font-medium"
                        sx={{ fontSize: "14px" }}
                      >
                        {vndFormatter.format(
                          calculateTotalPrice(
                            PreOders.crdfd_giagoc,
                            PreOders.crdfd_chieckhau,
                            PreOders.crdfd_soluong,
                            PreOders.crdfd_giaexuat
                          )
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        sx={{
                          border: `1px solid ${
                            trangthailendon(PreOders.crdfd_trangthaionhang).Style
                          }`,
                          backgroundColor: "white",
                          borderRadius: "16px",
                          padding: "4px 8px",
                          height: "auto",
                          width: "120px",
                          "& .MuiChip-label": {
                            color: trangthailendon(PreOders.crdfd_trangthaionhang)
                              .Style,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "0",
                          },
                          boxShadow: "0 1px 2px rgba(183, 50, 50, 0.1)",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            backgroundColor: `${
                              trangthailendon(PreOders.crdfd_trangthaionhang).Style
                            }0a`,
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                          },
                        }}
                        size="small"
                        label={
                          trangthailendon(PreOders.crdfd_trangthaionhang).Value
                        }
                      />
                    </TableCell>
                    <TableCell align="left">
                      <Box
                        sx={{
                          display: "flex",
                          marginRight: 8,
                          flexDirection: "column",
                          gap: 0.5,
                          "& > *": {
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontSize: "13px",
                          },
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{ color: "#6B7280" }}
                            className="text-gray-700"
                          >
                            Người tạo:
                          </Typography>
                          <Typography className="text-gray-700 font-medium">
                            {PreOders.crdfd_nguoitao}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            sx={{ color: "#6B7280" }}
                            className="text-gray-700"
                          >
                            Ngày tạo:
                          </Typography>
                          <Typography className="text-gray-700 font-medium">
                            {formatDate(PreOders.crdfd_ngaytao2)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {PreOders.crdfd_trangthaionhang !== 191920002 &&
                        PreOders.crdfd_trangthaionhang !== 191920001 && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmCancelOrder(
                                PreOders.crdfd_athangsoid,
                                PreOders.crdfd_sanphamtext
                              );
                            }}
                            sx={{
                              minWidth: "80px",
                              marginRight: 8,
                              height: "32px",
                              px: 2,
                              borderColor: "error.light",
                              color: "error.main",
                              fontSize: "13px",
                              fontWeight: 600,
                              "&:hover": {
                                backgroundColor: "error.lighter",
                                borderColor: "error.main",
                              },
                              transition: "all 0.2s ease-in-out",
                            }}
                          >
                            Hủy
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </MuiTableBody>
            </Table>
          )}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              p: 2,
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onLoadMore={function (): void {
                throw new Error("Function not implemented.");
              }}
              isLoading={false}
            />
          </Box>
        </>
      ) : (
        <Box sx={{ p: 3 }}>
          <EmptyState title="Không có dữ liệu" description="Không có đơn đặt hàng trước trong khoảng thời gian này." />
        </Box>
      )}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
          },
        }}
      >
        <DialogTitle
          id="alert-dialog-title"
          className="text-gray-700"
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#1e293b",
          }}
        >
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography className="text-gray-700" sx={{ color: "#475569" }}>
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button
            onClick={handleCloseConfirmDialog}
            sx={{
              color: "#64748b",
              "&:hover": {
                backgroundColor: "#f8fafc",
              },
            }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={() => {
              confirmDialog.onConfirm();
            }}
            color="error"
            variant="contained"
            sx={{
              boxShadow: "none",
              "&:hover": {
                boxShadow: "none",
                backgroundColor: "error.dark",
              },
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PreOrdersTable;
