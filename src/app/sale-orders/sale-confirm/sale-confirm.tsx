"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Select from "react-select";
import { vndFormatter } from "@/utils/vndFormatter";
import axios from "axios";
import Loading from "@/components/loading";
import {
  FaUser,
  FaMoneyBillWave,
  FaBoxes,
  FaCalendarAlt,
  FaFilter,
} from "react-icons/fa";
import { getItem } from "@/utils/SecureStorage";
import { useDebounce } from 'use-debounce';
import { 
  CustomerOption, 
  PreOrder, 
  GroupedPreOrders,
  StatusOption,
  SnackbarState,
  ConfirmDialogState,
  OrderStatus,
  DateRange 
} from "../../../model/interface/SaleConfirmProps";
import { formatDateToDDMMYYYY } from '@/utils/utils';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const PreOrdersTable: React.FC = () => {
  const [groupedPreOrders, setGroupedPreOrders] = useState<GroupedPreOrders>(
    {}
  );
  const [selectedStatus_donhang, setSelectedStatus_donhang] = useState<
    number | null
  >(null);
  const [selectedStatus_suagia, setSelectedStatus_suagia] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
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
  const statusOptions_donhang = [
    { value: null, label: "Tất cả" },
    { value: 191920000, label: "Chờ xác nhận" },
    { value: 191920001, label: "Đã xác nhận" },
    { value: 191920002, label: "Hủy đơn hàng" },
  ];
  const statusOptions_suagia = useMemo(() => [
    { value: null, label: "Tất cả" },
    { value: 191920000, label: "Chờ xác nhận" },
    { value: 191920001, label: "Đã xác nhận" },
    { value: 191920002, label: "Hủy sửa giá" },
  ], []);
  const handleStatus_donhangChange = (
    selectedOption: { value: number | null; label: string } | null
  ) => {
    setSelectedStatus_donhang(selectedOption ? selectedOption.value : null);
  };
  const handleStatus_suagiaChange = (
    selectedOption: { value: number | null; label: string } | null
  ) => {
    setSelectedStatus_suagia(selectedOption ? selectedOption.value : null);
  };
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const currentDate = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    setFromDate(formatDate(threeMonthsAgo));
    setToDate(formatDate(currentDate));
  }, []);

  const fetchPreOrders = useCallback(async () => {
    const storedId = getItem("id");
    const typelogin = getItem("type");
    const saleName = getItem("userName");
    if (storedId) {
      setLoading(true);
      axios
        .get<PreOrder[]>(
          `/api/getDataDathangSO?id=${storedId}&type=${typelogin}&saleName=${saleName}`
        )
        .then((response) => {
          if (Array.isArray(response.data)) {
            const filteredPreOrders = response.data.filter(
              (preOrder: PreOrder) => {
                const orderDate = new Date(preOrder.crdfd_ngaytao2);
                const startDate = fromDate
                  ? new Date(`${fromDate}T00:00:00`)
                  : null;
                const endDate = toDate ? new Date(`${toDate}T23:59:59`) : null;

                const dateFilter =
                  (!startDate || orderDate >= startDate) &&
                  (!endDate || orderDate <= endDate);

                const customerFilter =
                  !selectedCustomer ||
                  preOrder["_cr1bb_khachhang_value@OData.Community.Display.V1.FormattedValue"] === selectedCustomer.label;

                const status_donhangFilter =
                  selectedStatus_donhang === null ||
                  preOrder.crdfd_trangthaionhang === selectedStatus_donhang;

                const status_suagiaFilter =
                  selectedStatus_suagia === null ||
                  preOrder.cr1bb_trangthaiduyetgia === statusOptions_suagia.find(
                    (option) => option.value === selectedStatus_suagia
                  )?.label;

                return (
                  dateFilter &&
                  customerFilter &&
                  status_donhangFilter &&
                  status_suagiaFilter
                );
              }
            );

            const groupedByDate = filteredPreOrders.reduce(
              (acc: { [key: string]: PreOrder[] }, order: PreOrder) => {
                const customerName = order["_cr1bb_khachhang_value@OData.Community.Display.V1.FormattedValue"] || "Unknown";
                const orderDate = formatOrderDate(order.crdfd_ngaytao2);
                const key = `${customerName}_${orderDate}`;
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push(order);
                return acc;
              },
              {}
            );

            const grouped = Object.entries(groupedByDate).reduce(
              (acc: GroupedPreOrders, [key, orders]: [string, PreOrder[]]) => {
                const lastIndex = key.lastIndexOf("_");
                const customerName = key.substring(0, lastIndex);
                const orderDate = key.substring(lastIndex + 1);

                if (!acc[customerName]) {
                  acc[customerName] = {};
                }
                acc[customerName][orderDate] = orders;

                return acc;
              },
              {}
            );

            setGroupedPreOrders(grouped);
          } else {
            throw new Error(
              "Response data is not an array of PreOrder objects"
            );
          }
        })
        .catch((error) => {
          console.error("Error fetching Orders - fetchPreOrders - line 236: ", error);
          setSnackbar({
            open: true,
            message: "Không thể tải dữ liệu đơn hàng. Vui lòng thử lại sau.",
            severity: "error",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [
    fromDate,
    toDate,
    selectedCustomer,
    selectedStatus_donhang,
    selectedStatus_suagia,
    statusOptions_suagia,
  ]);
  

  const debouncedFetchPreOrders = useDebounce(fetchPreOrders, 300)[0];

  useEffect(() => {
    debouncedFetchPreOrders();
  }, [debouncedFetchPreOrders]);

  const trangthailendon = (trangthailendon: number | null) => {
    switch (trangthailendon) {
      case 191920000:
        return { Value: "Chờ xác nhận", Style: "warning.main" };
      case 191920001:
        return { Value: "Đã xác nhận", Style: "success.main" };
      case 191920002:
        return { Value: "Hủy đơn hàng", Style: "error.main" };
      default:
        return { Value: "Chờ xác nhận", Style: "warning.main" };
    }
  };

  const trangthaiduyetgia = (trangthailendon: number) => {
    switch (trangthailendon) {
      case 191920000:
        return { Value: "Chờ xác nhận", Style: "warning.main" };
      case 191920001:
        return { Value: "Đã xác nhận", Style: "success.main" };
      default:
        return { Value: "Hủy sửa giá", Style: "error.main" };
    }
  };

  const handleCustomerChange = (selectedOption: CustomerOption | null) => {
    setSelectedCustomer(selectedOption);
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
  const formatDateForSO = (order: PreOrder): string => {
    try {
      if (!order.crdfd_ngaytao2) {
        return "NoDate";
      }

      const date = new Date(order.crdfd_ngaytao2);
      if (isNaN(date.getTime())) {
        return "InvalidDate";
      }

      return formatDateToDDMMYYYY(date);
    } catch (error) {
      console.error("Error formatting date - formatDateForSO - line 315: ", error, order.crdfd_ngaytao2);
      return "ErrorDate";
    }
  };

  const formatOrderDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDateToDDMMYYYY(date);
    } catch (error) {
      console.error("Error in formatOrderDate - formatOrderDate - line 329: ", error, dateString);
      return dateString;
    }
  };
  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await axios.patch(`/api/updateTrangThaiDonHang`, {
        id: orderId,
        crdfd_trangthaionhang: 191920002 // Hủy đơn hàng
      });

      if (response.status === 200) {
        // Cập nhật state local
        setGroupedPreOrders(prevState => {
          const newState = { ...prevState };
          Object.keys(newState).forEach(customerName => {
            Object.keys(newState[customerName]).forEach(date => {
              newState[customerName][date] = newState[customerName][date].map(order => {
                if (order.crdfd_athangsoid === orderId) {
                  return {
                    ...order,
                    crdfd_trangthaionhang: 191920002
                  };
                }
                return order;
              });
            });
          });
          return newState;
        });

        setSnackbar({
          open: true,
          message: "Hủy sản phẩm thành công",
          severity: "success"
        });
      }
    } catch (error) {
      console.error("Error canceling order - handleCancelOrder - line 367: ", error);
      setSnackbar({
        open: true,
        message: "Có lỗi xảy ra khi hủy sản phẩm",
        severity: "error"
      });
    }
  };

  const handleCancelAllOrders = async (orders: PreOrder[]) => {
    try {
      // Lưu lại các ID của orders thuộc SO đang được hủy
      const orderIdsToCancel = orders
        .filter(order => order.crdfd_trangthaionhang !== 191920002 && order.crdfd_trangthaionhang !== 191920001)
        .map(order => order.crdfd_athangsoid);

      // Tạo mảng các promise để hủy từng đơn hàng
      const cancelPromises = orderIdsToCancel.map(orderId => 
        axios.patch(`/api/updateTrangThaiDonHang`, {
          id: orderId,
          crdfd_trangthaionhang: 191920002 // Hủy đơn hàng
        })
      );

      // Chờ tất cả các promise hoàn thành
      await Promise.all(cancelPromises);

      // Cập nhật state local
      setGroupedPreOrders(prevState => {
        const newState = { ...prevState };
        Object.keys(newState).forEach(customerName => {
          Object.keys(newState[customerName]).forEach(date => {
            newState[customerName][date] = newState[customerName][date].map(order => {
              if (orderIdsToCancel.includes(order.crdfd_athangsoid)) {
                return {
                  ...order,
                  crdfd_trangthaionhang: 191920002
                };
              }
              return order;
            });
          });
        });
        return newState;
      });

      setSnackbar({
        open: true,
        message: "Hủy đơn hàng thành công",
        severity: "success"
      });
    } catch (error) {
      console.error("Error canceling all orders - handleCancelAllOrders - line 417: ", error);
      setSnackbar({
        open: true,
        message: "Có lỗi xảy ra khi hủy sản phẩm",
        severity: "error"
      });
    }
  };

  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      onConfirm,
    });
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false,
    });
  };

  const handleConfirmCancelOrder = (orderId: string, productName: string) => {
    showConfirmDialog(
      "Xác nhận hủy sản phẩm",
      `Bạn có chắc chắn muốn hủy sản phẩm "${productName}" không?`,
      () => {
        handleCancelOrder(orderId);
        handleCloseConfirmDialog();
      }
    );
  };

  const handleConfirmCancelAllOrders = (orders: PreOrder[]) => {
    showConfirmDialog(
      "Xác nhận hủy đơn hàng",
      "Bạn có chắc chắn muốn hủy đơn hàng này không?",
      () => {
        handleCancelAllOrders(orders);
        handleCloseConfirmDialog();
      }
    );
  };

  const renderOrderDetails = (orders: PreOrder[]) => (
    <Box sx={{ overflowX: "auto", width: "100%" }}>
      <Table aria-label="order details" sx={{ 
        whiteSpace: "nowrap",
        minWidth: isMobile ? "600px" : "100%"
      }}>
        <TableHead>
          <TableRow>
            <TableCell width="20%" sx={{ minWidth: "120px" }}>
              <Typography variant="subtitle2" fontWeight={700} className="text-gray-700" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Tên sản phẩm
              </Typography>
            </TableCell>
            <TableCell width="10%" align="center" sx={{ minWidth: "80px" }}>
              <Typography variant="subtitle2" fontWeight={700} className="text-gray-700" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Số lượng
              </Typography>
            </TableCell>
            <TableCell width="15%" align="right" sx={{ minWidth: "100px" }}>
              <Typography variant="subtitle2" fontWeight={700} className="text-gray-700" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Thành tiền
              </Typography>
            </TableCell>
            <TableCell width="15%" align="center" sx={{ minWidth: "100px" }}>
              <Typography variant="subtitle2" fontWeight={700} className="text-gray-700" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Trạng thái
              </Typography>
            </TableCell>
            <TableCell width="15%" align="center" sx={{ minWidth: "120px" }}>
              <Typography variant="subtitle2" fontWeight={700} className="text-gray-700" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Xác nhận sửa giá
              </Typography>
            </TableCell>
            <TableCell width="10%" align="center" sx={{ minWidth: "80px" }}>
              <Typography variant="subtitle2" fontWeight={700} className="text-gray-700" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Thao tác
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.crdfd_athangsoid}>
            <TableCell>
              <Typography variant="body2" className="text-gray-700">{order.crdfd_sanphamtext}</Typography>
              <Typography variant="caption" color="textSecondary" className="text-gray-700">
                Giá: {vndFormatter.format(order.crdfd_giaexuat)}/{order.crdfd_onvitext}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography variant="body2" className="text-gray-700">{order.crdfd_soluong}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" className="text-gray-700">
                {vndFormatter.format(order.crdfd_giaexuat * order.crdfd_soluong)}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Chip
                sx={{
                  border: `1px solid ${trangthailendon(order.crdfd_trangthaionhang).Style}`,
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '4px 8px',
                  height: 'auto',
                  '& .MuiChip-label': {
                    color: trangthailendon(order.crdfd_trangthaionhang).Style,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0',
                  },
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: `${trangthailendon(order.crdfd_trangthaionhang).Style}0a`,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                  }
                }}
                size="small"
                label={trangthailendon(order.crdfd_trangthaionhang).Value}
              />
            </TableCell>
            <TableCell align="center">
              <Chip
                sx={{
                  border: `1px solid ${order.cr1bb_trangthaiduyetgia === "Hủy sửa giá" 
                    ? '#d32f2f'
                    : order.cr1bb_trangthaiduyetgia === "Đã xác nhận"
                    ? '#2e7d32'
                    : '#ed6c02'}`,
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '4px 8px',
                  height: 'auto',
                  '& .MuiChip-label': {
                    color: order.cr1bb_trangthaiduyetgia === "Hủy sửa giá" 
                      ? '#d32f2f'
                      : order.cr1bb_trangthaiduyetgia === "Đã xác nhận"
                      ? '#2e7d32'
                      : '#ed6c02',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0',
                  },
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: order.cr1bb_trangthaiduyetgia === "Hủy sửa giá" 
                      ? 'rgba(211, 47, 47, 0.04)'
                      : order.cr1bb_trangthaiduyetgia === "Đã xác nhận"
                      ? 'rgba(46, 125, 50, 0.04)'
                      : 'rgba(237, 108, 2, 0.04)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                  }
                }}
                size="small"
                label={order.cr1bb_trangthaiduyetgia}
              />
            </TableCell>
            <TableCell align="center">
              {order.crdfd_trangthaionhang !== 191920002 && order.crdfd_trangthaionhang !== 191920001 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => handleConfirmCancelOrder(order.crdfd_athangsoid, order.crdfd_sanphamtext)}
                  sx={{
                    borderColor: 'error.light',
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: 'error.lighter',
                      borderColor: 'error.main',
                    },
                  }}
                >
                  Hủy
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </Box>
  );

  return (
    <div className="w-full">
      <Box sx={{ p: { xs: 1, sm: 2 }, backgroundColor: "white" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 2,
            mb: 2,
            width: "100%",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <label
              htmlFor="customerSelect"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              <FaUser className="inline mr-2" />
              Chọn khách hàng:
            </label>
            <Select
              id="customerSelect"
              instanceId="customerSelect"
              options={Object.keys(groupedPreOrders).map((customerName) => ({
                value: customerName,
                label: customerName,
              }))}
              value={selectedCustomer}
              onChange={handleCustomerChange}
              isClearable
              isSearchable
              placeholder="Tìm khách hàng..."
              styles={{ container: (base) => ({ ...base, width: "100%" }) }}
            />
          </Box>
          <Box sx={{ flex: 1, width: "100%" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
              <Box sx={{ 
                display: "flex", 
                gap: 2, 
                flexDirection: isMobile ? "column" : "row",
                width: "100%"
              }}>
                <Box sx={{ flex: 1, width: "100%" }}>
                  <label
                    htmlFor="from-date"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    <FaCalendarAlt className="inline mr-2" />
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    id="from-date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border p-2 rounded w-full focus:outline-none focus:border-blue-500"
                  />
                </Box>
                <Box sx={{ flex: 1, width: "100%" }}>
                  <label
                    htmlFor="to-date"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    <FaCalendarAlt className="inline mr-2" />
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    id="to-date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border p-2 rounded w-full focus:outline-none focus:border-blue-500"
                  />
                </Box>
              </Box>
              <Box sx={{ 
                display: "flex", 
                gap: 2, 
                flexDirection: isMobile ? "column" : "row",
                width: "100%"
              }}>
                <Box sx={{ flex: 1, width: "100%" }}>
                  <label
                    htmlFor="statusSelect_donhang"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    <FaFilter className="inline mr-2" />
                    Trạng thái lên đơn
                  </label>
                  <Select
                    id="statusSelect_donhang"
                    instanceId="statusSelect_donhang"
                    options={statusOptions_donhang}
                    value={statusOptions_donhang.find(
                      (option) => option.value === selectedStatus_donhang
                    )}
                    onChange={handleStatus_donhangChange}
                    isClearable
                    isSearchable
                    placeholder="Chọn trạng thái..."
                    styles={{
                      container: (base) => ({ ...base, width: "100%" }),
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, width: "100%" }}>
                  <label
                    htmlFor="statusSelect_suagia"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    <FaFilter className="inline mr-2" />
                    Trạng thái sửa giá
                  </label>
                  <Select
                    id="statusSelect_suagia"
                    options={statusOptions_suagia}
                    value={statusOptions_suagia.find(
                      (option) => option.value === selectedStatus_suagia
                    )}
                    onChange={handleStatus_suagiaChange}
                    isClearable
                    isSearchable
                    placeholder="Chọn trạng thái..."
                    styles={{
                      container: (base) => ({ ...base, width: "100%" }),
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      {loading ? (
        <Loading />
      ) : Object.keys(groupedPreOrders).length > 0 ? (
        <Box sx={{ p: { xs: 1, sm: 2 }, pb: 10, width: "100%" }}>
          {Object.entries(groupedPreOrders).map(
            ([customerName, dateTimeOrders]) => (
              <Accordion key={customerName}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {customerName} ({Object.keys(dateTimeOrders).length} đơn
                    hàng)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(dateTimeOrders).map(
                    ([orderDateTime, orders], index) => (
                      <Accordion key={orderDateTime}>
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            "&:hover": {
                              backgroundColor: "#f5f5f5",
                            },
                          }}
                        >
                          <Grid container spacing={1} alignItems="center" sx={{ width: "100%" }}>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="subtitle2" className="text-gray-700" sx={{ 
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                                wordBreak: "break-word"
                              }}>
                                {(() => {
                                  const order = orders[0];
                                  if (!order) return "Invalid Order";

                                  const nguoiTaoOn = order.crdfd_nguoitao || "Unknown";
                                  const nameKh = order["_cr1bb_khachhang_value@OData.Community.Display.V1.FormattedValue"] || "Unknown";
                                  const formattedDate = formatDateForSO(order);

                                  return `SO_${formattedDate}_${nameKh}_${nguoiTaoOn}`;
                                })()}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="body2" className="text-gray-700" sx={{ 
                                  display: "flex", 
                                  alignItems: "center",
                                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                                }}>
                                <FaMoneyBillWave style={{ marginRight: "4px", fontSize: "0.75rem" }} />
                                {vndFormatter.format(
                                  orders
                                    .filter(order => order.crdfd_trangthaionhang !== 191920002)
                                    .reduce((sum, order) => sum + order.crdfd_giaexuat * order.crdfd_soluong, 0) 
                                )}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="body2" className="text-gray-700" sx={{ 
                                display: "flex", 
                                alignItems: "center",
                                fontSize: { xs: "0.75rem", sm: "0.875rem" }
                              }}>
                                <FaBoxes style={{ marginRight: "4px", fontSize: "0.75rem" }} />
                                {orders.filter(order => order.crdfd_trangthaionhang !== 191920002).length} sản phẩm
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={1} sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "center" } }}>
                              {(() => {
                                // Kiểm tra xem SO này có phải là SO đã bị hủy hoàn toàn không
                                const isFullyCancelled = orders.every(order => order.crdfd_trangthaionhang === 191920002);
                                
                                // Kiểm tra xem SO này có đơn nào có thể hủy không
                                const hasCancellableOrders = orders.some(order => 
                                  order.crdfd_trangthaionhang !== 191920002 && 
                                  order.crdfd_trangthaionhang !== 191920001
                                );

                                if (isFullyCancelled) {
                                  return (
                                    <Box
                                      sx={{
                                        border: '1px solid #d32f2f',
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        padding: '4px 12px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#d32f2f',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        minWidth: 'fit-content',
                                        boxShadow: '0 1px 2px rgba(211, 47, 47, 0.1)',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                          backgroundColor: 'rgba(211, 47, 47, 0.04)',
                                          boxShadow: '0 2px 4px rgba(211, 47, 47, 0.15)',
                                        }
                                      }}
                                    >
                                      Đã hủy đơn
                                    </Box>
                                  );
                                } else if (hasCancellableOrders) {
                                  return (
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmCancelAllOrders(orders);
                                      }}
                                      sx={{
                                        borderColor: 'error.light',
                                        color: 'error.main',
                                        '&:hover': {
                                          backgroundColor: 'error.lighter',
                                          borderColor: 'error.main',
                                        },
                                      }}
                                    >
                                      Hủy đơn
                                    </Button>
                                  );
                                }
                                return null;
                              })()}
                            </Grid>

                          </Grid>
                        </AccordionSummary>
                        <AccordionDetails>
                          {isMobile ? (
                            <Box>
                              {orders.map((order) => (
                                <Paper
                                  key={order.crdfd_athangsoid}
                                  elevation={1}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    "&:hover": {
                                      boxShadow: 3,
                                    },
                                  }}
                                >
                                  <Typography variant="body2" fontWeight={600}>
                                    {order.crdfd_sanphamtext}
                                  </Typography>
                                  <Typography variant="body2">
                                    Giá:{" "}
                                    {vndFormatter.format(order.crdfd_giaexuat)}/
                                    {order.crdfd_onvitext}
                                  </Typography>
                                  <Typography variant="body2">
                                    Số lượng: {order.crdfd_soluong}
                                  </Typography>
                                  <Typography variant="body2">
                                    Thành tiền:{" "}
                                    {vndFormatter.format(order.crdfd_giaexuat * order.crdfd_soluong)}
                                  </Typography>
                                  <Box>
                                    <Typography variant="body2">
                                      Trạng thái lên đơn
                                    </Typography>
                                    <Chip
                                      sx={{
                                        border: `1px solid ${trangthailendon(order.crdfd_trangthaionhang).Style}`,
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        padding: '4px 8px',
                                        height: 'auto',
                                        '& .MuiChip-label': {
                                          color: trangthailendon(order.crdfd_trangthaionhang).Style,
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          padding: '0',
                                        },
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                          backgroundColor: `${trangthailendon(order.crdfd_trangthaionhang).Style}0a`,
                                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                                        }
                                      }}
                                      size="small"
                                      label={trangthailendon(order.crdfd_trangthaionhang).Value}
                                    />
                                    <Typography variant="body2">
                                      Trạng thái duyệt giá
                                    </Typography>
                                    <Chip
                                      sx={{
                                        border: `1px solid ${order.cr1bb_trangthaiduyetgia === "Hủy sửa giá" 
                                          ? '#d32f2f'
                                          : order.cr1bb_trangthaiduyetgia === "Đã xác nhận"
                                          ? '#2e7d32'
                                          : '#ed6c02'}`,
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        padding: '4px 8px',
                                        height: 'auto',
                                        '& .MuiChip-label': {
                                          color: order.cr1bb_trangthaiduyetgia === "Hủy sửa giá" 
                                            ? '#d32f2f'
                                            : order.cr1bb_trangthaiduyetgia === "Đã xác nhận"
                                            ? '#2e7d32'
                                            : '#ed6c02',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          padding: '0',
                                        },
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                          backgroundColor: order.cr1bb_trangthaiduyetgia === "Hủy sửa giá" 
                                            ? 'rgba(211, 47, 47, 0.04)'
                                            : order.cr1bb_trangthaiduyetgia === "Đã xác nhận"
                                            ? 'rgba(46, 125, 50, 0.04)'
                                            : 'rgba(237, 108, 2, 0.04)',
                                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                                        }
                                      }}
                                      size="small"
                                      label={order.cr1bb_trangthaiduyetgia}
                                    />
                                  </Box>
                                  <Typography variant="body2">
                                    Lý do sửa giá:{" "}
                                    {order.cr1bb_trangthaiduyetgia === "Hủy sửa giá" ? "N/A" : order.cr1bb_trangthaiduyetgia}
                                  </Typography>
                                  {order.crdfd_trangthaionhang !== 191920002 && order.crdfd_trangthaionhang !== 191920001 && (
                                    <Box mt={2}>
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        fullWidth
                                        onClick={() => handleConfirmCancelOrder(order.crdfd_athangsoid, order.crdfd_sanphamtext)}
                                        sx={{
                                          borderColor: 'error.light',
                                          color: 'error.main',
                                          '&:hover': {
                                            backgroundColor: 'error.lighter',
                                            borderColor: 'error.main',
                                          },
                                        }}
                                      >
                                        Hủy
                                      </Button>
                                    </Box>
                                  )}
                                </Paper>
                              ))}
                            </Box>
                          ) : (
                            renderOrderDetails(orders)
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )
                  )}
                </AccordionDetails>
              </Accordion>
            )
          )}
        </Box>
      ) : (
        <Box sx={{ p: 15, textAlign: "center" }}>
          <Typography>
            Không có đơn hàng nào trong khoảng thời gian này!
          </Typography>
        </Box>
      )}
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
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" className="text-gray-700">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography className="text-gray-700">{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="inherit">
            Hủy bỏ
          </Button>
          <Button
            onClick={() => {
              confirmDialog.onConfirm();
            }}
            color="error"
            variant="contained"
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PreOrdersTable;
