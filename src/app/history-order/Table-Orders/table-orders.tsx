import React, { useState, useCallback } from "react";
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
  Paper,
  IconButton,
  Collapse,
  Stack,
} from "@mui/material";
import { Grid } from "@mui/material";
import { vndFormatter } from "@/utils/vndFormatter";
import Pagination from "@/app/product-list/_components/paging";
import SaleOrder from "@/model/saleOder";
import OrderDetailPopup from "../OrderDetail-Popup/OrderDetailPopup";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { formatDateToDDMMYYYY } from '@/utils/utils';
import { EmptyState } from "@/components/ui/empty-state";

interface SaleOrderTableProps {
  items: SaleOrder[];
  totalPagesSaleOrder: number;
}

const SaleOrderTable: React.FC<SaleOrderTableProps> = ({
  items,
  totalPagesSaleOrder,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [popupRowIndex, setPopupRowIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDateToDDMMYYYY(date);
  };

  //click open popup
  const handleAddClick = useCallback((index: number) => {
    setPopupRowIndex(index);
  }, []);
  const handleCloseClick = useCallback(() => {
    setPopupRowIndex(null);
  }, []);
  const handleRowClick = useCallback(
    (index: number) => {
      if (popupRowIndex === index) {
        handleCloseClick();
      } else {
        handleAddClick(index);
      }
    },
    [popupRowIndex, handleCloseClick, handleAddClick]
  );

  const toggleRowExpansion = (orderId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(orderId)) {
      newExpandedRows.delete(orderId);
    } else {
      newExpandedRows.add(orderId);
    }
    setExpandedRows(newExpandedRows);
  };

  const trangthaigiaohang = (trangthaigiaohang: number) => {
    switch (trangthaigiaohang) {
      case 191920000:
        return { Value: "Chưa giao", Style: "warning.main" };
      case 191920001:
        return { Value: "Giao dở dang", Style: "info.main" };
      default:
        return { Value: "Đã giao", Style: "success.main" };
    }
  }; 
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);
  const itemsPerPage = 10; // Số item mỗi trang
  // Lấy các item của trang hiện tại
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSaleOrder = items.slice(startIndex, startIndex + itemsPerPage);

  const renderMobileView = (order: SaleOrder, index: number) => {
    const isExpanded = expandedRows.has(order.crdfd_so_code);
    
    return (
      <Paper 
        key={order.crdfd_so_code}
        onClick={() => handleRowClick(index)}
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
              {order.crdfd_so_code}
            </Typography>
            <Chip
              sx={{
                border: `1px solid ${trangthaigiaohang(order.crdfd_trangthaigiaonhan1).Style}`,
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "4px 8px",
                height: "auto",
                mt: 1,
                "& .MuiChip-label": {
                  color: trangthaigiaohang(order.crdfd_trangthaigiaonhan1).Style,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0",
                },
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
              }}
              size="small"
              label={trangthaigiaohang(order.crdfd_trangthaigiaonhan1).Value}
            />
          </Box>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation(); // Ngăn sự kiện click lan truyền lên Paper
              handleRowClick(index);
            }}
          >
            {popupRowIndex === index ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        <Collapse in={popupRowIndex === index}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Ngày đặt đơn:</Typography>
                <Typography variant="body2">{formatDate(order.crdfd_ngaytaoonhang)}</Typography>
              </Box>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">GTGT:</Typography>
                <Typography variant="body2">{order.crdfd_gtgtnew}</Typography>
              </Box>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Tổng tiền:</Typography>
                <Typography variant="body2">{vndFormatter.format(order.crdfd_tongtien)}</Typography>
              </Box>
            </Box>
            <Box>
              <OrderDetailPopup
                details={order.crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O}
              />
            </Box>
          </Stack>
        </Collapse>
      </Paper>
    );
  };

  return (
    <div>
      {/* Hiển thị nội dung của đơn đã đặt */}
      {/* Table view for larger screens */}
      {currentSaleOrder && currentSaleOrder.length > 0 ? (
        <>
          {isMobile ? (
            <Box sx={{ p: 2 }}>
              {currentSaleOrder.map((order, index) => renderMobileView(order, index))}
            </Box>
          ) : (
            <Box sx={{ overflow: "auto", width: { xs: "400px", sm: "auto" } }}>
              <Table aria-label="simple table" sx={{ whiteSpace: "nowrap", mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ fontSize: "16px" }}
                      >
                        Mã đơn hàng
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ fontSize: "16px" }}
                      >
                        Ngày đặt đơn
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ fontSize: "16px" }}
                      >
                        Trạng thái
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ fontSize: "16px" }}
                      >
                        GTGT
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ fontSize: "16px" }}
                      >
                        Tổng tiền
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentSaleOrder.map((Order, index) => (
                    <React.Fragment key={index}>
                      <TableRow key={index} onClick={() => handleRowClick(index)}>
                        <TableCell>
                          <Typography>{Order.crdfd_so_code}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={500}>
                            {formatDate(Order.crdfd_ngaytaoonhang)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            sx={{
                              border: `1px solid ${
                                trangthaigiaohang(Order.crdfd_trangthaigiaonhan1)
                                  .Style
                              }`,
                              backgroundColor: "white",
                              borderRadius: "16px",
                              padding: "4px 8px",
                              height: "auto",
                              width: "120px",
                              "& .MuiChip-label": {
                                color: trangthaigiaohang(
                                  Order.crdfd_trangthaigiaonhan1
                                ).Style,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                padding: "0",
                              },
                              boxShadow: "0 1px 2px rgba(183, 50, 50, 0.1)",
                              transition: "all 0.2s ease-in-out",
                              "&:hover": {
                                backgroundColor: `${
                                  trangthaigiaohang(Order.crdfd_trangthaigiaonhan1)
                                    .Style
                                }0a`,
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                              },
                            }}
                            size="small"
                            label={
                              trangthaigiaohang(Order.crdfd_trangthaigiaonhan1)
                                .Value
                            }
                          ></Chip>
                        </TableCell>
                        <TableCell>
                          <Typography>{Order.crdfd_gtgtnew}</Typography>
                        </TableCell>
                        <TableCell align="left">
                          <Typography>
                            {vndFormatter.format(Order.crdfd_tongtien)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {popupRowIndex === index && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6">
                            <OrderDetailPopup
                              details={
                                Order.crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesSaleOrder}
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
          <EmptyState
            title="Không có đơn hàng"
            description="Không có đơn hàng nào trong khoảng thời gian này."
          />
        </Box>
      )}
    </div>
  );
};

export default SaleOrderTable;
