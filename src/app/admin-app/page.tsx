"use client";
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Paper,
  Grid,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import axios from "axios";
import { getItem, setItem } from "@/utils/SecureStorage";
import { X } from "lucide-react";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";

type AdminRow = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  surcharge: number; // ví dụ 0.03 = 3%
  discount: number; // ví dụ 0.03 = 3%
  vat: number; // %
  expectedDate: string;
  approver?: string;
  warehouse?: string;
  shift?: string;
  discountPolicy?: string;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", { minimumFractionDigits: 0 });

// Helper function to get actual price from product
const getActualPrice = (product: any): number => {
  if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
    const activePrice = product.cr1bb_json_gia.find(
      (item: any) => item.crdfd_trangthaihieulucname === "Còn hiệu lực" || item.crdfd_trangthaihieuluc === 191920000
    );
    if (activePrice && activePrice.crdfd_gia) return parseFloat(activePrice.crdfd_gia);
    if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia) {
      return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
    }
    return 0;
  }
  if (product.crdfd_gia && product.crdfd_gia > 0) return product.crdfd_gia;
  if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) return product.crdfd_giatheovc;
  return 0;
};

// Helper function to get VAT from product
const getVAT = (product: any): number => {
  if (product.crdfd_gtgt_value !== undefined && product.crdfd_gtgt_value !== null) {
    return product.crdfd_gtgt_value;
  }
  if (product.crdfd_gtgt !== undefined && product.crdfd_gtgt !== null) {
    return product.crdfd_gtgt;
  }
  return 8; // Default VAT
};

// Custom Infinite Scroll Select Component - copied from sale-order
const InfiniteScrollSelect = ({ 
  loadOptions, 
  value, 
  onChange, 
  placeholder 
}: {
  loadOptions: (inputValue: string, pageSize: number) => Promise<any[]>;
  value: any;
  onChange: (option: any) => void;
  placeholder: string;
}) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [inputValue, setInputValue] = useState(value?.label || '');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async (searchValue: string = '', currentPageSize: number = 10) => {
    try {
      setLoading(true);
      const newOptions = await loadOptions(searchValue, currentPageSize);
      const uniqueOptionsMap = new Map<string, any>();
      for (const opt of newOptions) {
        uniqueOptionsMap.set(opt.value, opt);
      }
      setOptions(Array.from(uniqueOptionsMap.values()));
      
      setHasMore(newOptions.length === currentPageSize);
      setPageSize(currentPageSize);
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoading(false);
    }
  }, [loadOptions]);

  useEffect(() => {
    loadMore('', 10);
  }, [loadMore]);

  useEffect(() => {
    setInputValue(value?.label || '');
  }, [value]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loading && hasMore) {
      loadMore(inputValue, pageSize + 10);
    }
  }, [loading, hasMore, inputValue, pageSize, loadMore]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setPageSize(10);
    setHasMore(true);
    if (value.trim() === '') {
      loadMore('', 10);
    } else {
      loadMore(value, 10);
    }
    setIsOpen(true);
  }, [loadMore]);

  const handleSelect = useCallback((option: any) => {
    onChange(option);
    setIsOpen(false);
    setInputValue(option.label);
  }, [onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Box position="relative">
      <TextField
        fullWidth
        size="small"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        InputProps={{
          endAdornment: inputValue && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => {
                  setInputValue('');
                  onChange(null);
                  loadMore('', 10);
                  setIsOpen(true);
                }}
              >
                <X size={16} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      {isOpen && options.length > 0 && (
        <Paper
          ref={containerRef}
          sx={{
            position: 'absolute',
            zIndex: 1300,
            width: '100%',
            mt: 0.5,
            maxHeight: 240,
            overflow: 'auto',
            boxShadow: 3,
          }}
          onScroll={handleScroll}
        >
          {options.map((option) => (
            <Box
              key={option.value}
              sx={{
                px: 2,
                py: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </Box>
          ))}
          
          {loading && (
            <Box sx={{ px: 2, py: 1, textAlign: 'center', color: 'text.secondary' }}>
              Loading...
            </Box>
          )}
          
          {!hasMore && options.length > 0 && (
            <Box sx={{ px: 2, py: 1, textAlign: 'center', color: 'text.secondary' }}>
              No more results
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

const AdminAppPage: React.FC = () => {
  // State for API data
  const [availableProducts, setAvailableProducts] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  
  // State for order management
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [orderCode, setOrderCode] = useState("");
  const [orderType, setOrderType] = useState<"SO" | "BO">("SO");
  const [orderVat, setOrderVat] = useState<"Có VAT" | "Không VAT">("Có VAT");
  const [note, setNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState<"Ca sáng" | "Ca chiều">("Ca sáng");
  const [approvePrice, setApprovePrice] = useState(false);
  const [approveSupPrice, setApproveSupPrice] = useState(false);
  const [urgentOrder, setUrgentOrder] = useState(false);
  const [cartItemsCount] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [inputQuantity, setInputQuantity] = useState<number>(0);
  const [inputPrice, setInputPrice] = useState<number>(0);
  const [inputVat, setInputVat] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [nextId, setNextId] = useState<number>(100);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [stockDiscardPurchase, setStockDiscardPurchase] = useState<number>(0);
  const [stockAccountingLT, setStockAccountingLT] = useState<number>(0);
  const [suggestedWarehouse, setSuggestedWarehouse] = useState<string>("");
  const [selectedDiscountPolicy, setSelectedDiscountPolicy] = useState<string>("");
  const [discountPercent1, setDiscountPercent1] = useState<number>(3);
  const [discountPercent2, setDiscountPercent2] = useState<number>(0);
  const [southernPrice, setSouthernPrice] = useState<number>(0);

  // Hàm load options async với pageSize
  const loadCustomerOptions = useCallback(async (inputValue: string, pageSize: number = 10) => {
    try {
      const saleName = getItem("saleName");
      const customerId = getItem("id");
      const searchParam = inputValue ? `&search=${encodeURIComponent(inputValue)}` : '';
      
      const res = await axios.get(`/api/getCustomerDataLazyLoad?customerId=${customerId}&saleName=${saleName}${searchParam}&page=1&pageSize=${pageSize}`);
      
      if (res.data?.data) {
        const dataArray = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
        const options = dataArray.map((customer: any) => ({
          value: customer.crdfd_customerid,
          label: `${customer.crdfd_name}${
            customer.cr1bb_ngunggiaodich !== null
              ? ` (Công nợ: ${customer.debtInfo?.cr1bb_tongcongno?.toLocaleString("vi-VN")} VNĐ)`
              : ""
          }`,
          isBlocked: customer.cr1bb_ngunggiaodich !== null,
        }));
        return options;
      }
      return [];
    } catch (error) {
      console.error('Error loading customer options:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    const testLoad = async () => {
      const saleName = getItem("saleName");
      const customerId = getItem("id");
      try {
        const res = await axios.get(`/api/getCustomerDataLazyLoad?customerId=${customerId}&saleName=${saleName}&page=1&pageSize=10`);
        if (res.data?.error) {
          setCustomerError("Không tìm thấy khách hàng");
        } else {
          setCustomerError(null);
        }
      } catch (error) {
        setCustomerError("Không tìm thấy khách hàng");
      }
    };
    testLoad();
  }, []);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/getProductsOnly', {
          params: {
            page: 1,
            pageSize: 100,
            all: false
          }
        });

        if (response.data && response.data.data) {
          const products: AdminRow[] = [];
          const groupedData = response.data.data;
          
          Object.keys(groupedData).forEach((category) => {
            const categoryProducts = groupedData[category].products || [];
            categoryProducts.forEach((product: any, index: number) => {
              const price = getActualPrice(product);
              const vat = getVAT(product);
              
              products.push({
                id: parseInt(product.crdfd_productsid?.replace(/-/g, '').substring(0, 10) || `${Date.now()}${index}`, 16) % 1000000,
                name: product.crdfd_fullname || product.crdfd_name || '',
                unit: product.crdfd_unitname || product.crdfd_onvichuantext || '',
                quantity: 1,
                price: price,
                surcharge: 0.03,
                discount: 0.03,
                vat: vat,
                expectedDate: new Date().toISOString().split("T")[0],
              });
            });
          });
          
          setAvailableProducts(products);
          
          if (products.length > 0 && selectedProductId === null) {
            setSelectedProductId(products[0].id);
            setInputQuantity(products[0].quantity);
            setInputPrice(products[0].price);
            setInputVat(products[0].vat);
          }
        }
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback((term: string) => {
    console.debug("admin-app search", term);
  }, []);

  const handleCartClick = useCallback(() => {
    console.debug("admin-app cart click");
  }, []);

  const handleCustomerChange = useCallback((
    selectedOption: {
      value: string;
      label: string;
    } | null
  ) => {
    setSelectedCustomer(selectedOption);
    
    if (selectedOption) {
      const customerId = selectedOption.value;
      setItem("selectedCustomerId", customerId);
    }
  }, []);

  useEffect(() => {
    const product = availableProducts.find((p) => p.id === selectedProductId);
    if (product) {
      setInputQuantity(product.quantity || 1);
      setInputPrice(product.price);
      setSouthernPrice(product.price);
      setInputVat(product.vat);
      setStockQuantity(0);
      setStockDiscardPurchase(0);
      setStockAccountingLT(0);
      setSuggestedWarehouse("");
    }
  }, [selectedProductId, availableProducts]);

  const totals = useMemo(() => {
    const detail = rows.map((row) => {
      const priceAfterDiscount = Math.round(
        row.price * (1 - row.discount + row.surcharge)
      );
      const lineTotal = priceAfterDiscount * row.quantity;
      const vatAmount = Math.round((lineTotal * row.vat) / 100);
      return { ...row, priceAfterDiscount, lineTotal, vatAmount };
    });

    const grandTotal = detail.reduce(
      (acc, row) => acc + row.lineTotal + row.vatAmount,
      0
    );
    return { detail, grandTotal };
  }, [rows]);

  const selectedProduct = useMemo(
    () =>
      availableProducts.find((r) => r.id === selectedProductId) ??
      (availableProducts.length > 0 ? availableProducts[0] : null),
    [selectedProductId, availableProducts]
  );

  const selectedPriceAfterDiscount = useMemo(() => {
    if (!selectedProduct) return 0;
    const totalDiscount = (discountPercent1 + discountPercent2) / 100;
    const surcharge = selectedProduct.surcharge || 0;
    return Math.round(
      inputPrice * (1 - totalDiscount + surcharge)
    );
  }, [inputPrice, selectedProduct, discountPercent1, discountPercent2]);

  const selectedLineTotal = useMemo(() => {
    const baseTotal = selectedPriceAfterDiscount * inputQuantity;
    const vatAmount = Math.round((baseTotal * inputVat) / 100);
    return { baseTotal, vatAmount, grand: baseTotal + vatAmount };
  }, [selectedPriceAfterDiscount, inputQuantity, inputVat]);

  const handleAddProduct = useCallback(() => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm");
      return;
    }
    
    if (inputQuantity <= 0) {
      alert("Vui lòng nhập số lượng lớn hơn 0");
      return;
    }

    const totalDiscount = (discountPercent1 + discountPercent2) / 100;

    const newRow: AdminRow = {
      id: nextId,
      name: selectedProduct.name,
      unit: selectedProduct.unit,
      quantity: inputQuantity,
      price: inputPrice,
      surcharge: selectedProduct.surcharge || 0,
      discount: totalDiscount,
      vat: inputVat,
      expectedDate: deliveryDate,
      warehouse: selectedWarehouse || suggestedWarehouse,
      shift: shift,
      discountPolicy: selectedDiscountPolicy,
    };

    setRows((prev) => [...prev, newRow]);
    setNextId((prev) => prev + 1);

    setInputQuantity(selectedProduct.quantity || 1);
    setInputPrice(selectedProduct.price);
    setInputVat(selectedProduct.vat);
    setSouthernPrice(selectedProduct.price);
  }, [
    inputQuantity,
    inputPrice,
    inputVat,
    selectedProduct,
    nextId,
    discountPercent1,
    discountPercent2,
    deliveryDate,
    selectedWarehouse,
    suggestedWarehouse,
    shift,
    selectedDiscountPolicy,
  ]);

  const handleDeleteProduct = useCallback(
    (id: number) => {
      setRows((prev) => prev.filter((row) => row.id !== id));
    },
    []
  );

  const handleUpdateQuantity = useCallback(
    (id: number, newQuantity: number) => {
      if (newQuantity <= 0) return;
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, quantity: newQuantity } : row
        )
      );
    },
    []
  );

  const handleUpdatePrice = useCallback(
    (id: number, newPrice: number) => {
      if (newPrice < 0) return;
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, price: newPrice } : row))
      );
    },
    []
  );

  const handleRefresh = useCallback(() => {
    setRows([]);
    setNextId(100);
  }, []);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2, color: 'text.secondary' }}>Loading data...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      <JDStyleHeader
        cartItemsCount={cartItemsCount}
        onSearch={handleSearch}
        onCartClick={handleCartClick}
        hideSearch
      />

      <Box component="main" sx={{ px: { xs: 2, sm: 4 }, pt: 20, pb: 10 }}>
        <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 2, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                sx={{ bgcolor: 'primary.50', color: 'primary.main', borderColor: 'primary.100' }}
              >
                Bán hàng thường
              </Button>
              <IconButton>
                <RefreshIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" fontWeight="bold">Loại đơn</Typography>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as "SO" | "BO")}
                >
                  <MenuItem value="SO">SO</MenuItem>
                  <MenuItem value="BO">BO</MenuItem>
                </Select>
              </FormControl>
              <Chip label={orderType} size="small" />
            </Box>
          </Box>

          {/* Header với Khách hàng và Đơn hàng */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>
                  Khách hàng
                </Typography>
                {customerError ? (
                  <Alert severity="warning" sx={{ mt: 1 }}>{customerError}</Alert>
                ) : (
                  <InfiniteScrollSelect
                    loadOptions={loadCustomerOptions}
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                    placeholder="Khách hàng"
                  />
                )}
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>
                  Đơn hàng {orderVat}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    value={orderCode || orderType}
                    onChange={(e) => setOrderCode(e.target.value)}
                    placeholder={orderType}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Có VAT</InputLabel>
                    <Select
                      value={orderVat}
                      onChange={(e) => setOrderVat(e.target.value as "Có VAT" | "Không VAT")}
                      label="Có VAT"
                    >
                      <MenuItem value="Có VAT">Có VAT</MenuItem>
                      <MenuItem value="Không VAT">Không VAT</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <InputLabel>Loại</InputLabel>
                    <Select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as "SO" | "BO")}
                      label="Loại"
                    >
                      <MenuItem value="SO">SO</MenuItem>
                      <MenuItem value="BO">BO</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">V2.93.86</Typography>
          </Box>

          {/* Product Input Section */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6} lg={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>{orderVat === "Có VAT" ? "Sản phẩm có VAT" : "Sản phẩm không VAT"}</InputLabel>
                  <Select
                    value={selectedProductId || ''}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                    disabled={availableProducts.length === 0}
                    label={orderVat === "Có VAT" ? "Sản phẩm có VAT" : "Sản phẩm không VAT"}
                  >
                    <MenuItem value="">Chọn sản phẩm</MenuItem>
                    {availableProducts.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Đơn vị</InputLabel>
                  <Select
                    value={selectedProduct?.unit || ''}
                    disabled={!selectedProduct}
                    label="Đơn vị"
                  >
                    <MenuItem value={selectedProduct?.unit || ''}>{selectedProduct?.unit || 'Chọn đơn vị'}</MenuItem>
                    <MenuItem value="Con">Con</MenuItem>
                    <MenuItem value="Kg">Kg</MenuItem>
                    <MenuItem value="Bịch 95-100 con">Bịch 95-100 con</MenuItem>
                    <MenuItem value="Bịch 100 con">Bịch 100 con</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Số lượng"
                  type="number"
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(Number(e.target.value) || 0)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton size="small" onClick={() => setInputQuantity(prev => prev + 1)}>
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setInputQuantity(prev => Math.max(0, prev - 1))}>
                            <ArrowDownward fontSize="small" />
                          </IconButton>
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Giá Miền Nam"
                  type="number"
                  value={southernPrice || inputPrice}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setSouthernPrice(val);
                    setInputPrice(val);
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton size="small" onClick={() => {
                            setSouthernPrice(prev => prev + 1000);
                            setInputPrice(prev => prev + 1000);
                          }}>
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => {
                            setSouthernPrice(prev => Math.max(0, prev - 1000));
                            setInputPrice(prev => Math.max(0, prev - 1000));
                          }}>
                            <ArrowDownward fontSize="small" />
                          </IconButton>
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Giá đã giảm"
                  value={formatCurrency(selectedPriceAfterDiscount)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Thành tiền"
                  value={formatCurrency(selectedLineTotal.baseTotal)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="VAT (%)"
                  type="number"
                  value={inputVat}
                  onChange={(e) => setInputVat(Number(e.target.value) || 0)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton size="small" onClick={() => setInputVat(prev => Math.min(100, prev + 1))}>
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setInputVat(prev => Math.max(0, prev - 1))}>
                            <ArrowDownward fontSize="small" />
                          </IconButton>
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="GTGT"
                  value={formatCurrency(selectedLineTotal.vatAmount)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Tổng tiền"
                  value={formatCurrency(selectedLineTotal.grand)}
                  InputProps={{ readOnly: true }}
                  sx={{ '& .MuiInputBase-input': { fontWeight: 'bold' } }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Kho</InputLabel>
                  <Select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    label="Kho"
                  >
                    <MenuItem value="">Chọn kho</MenuItem>
                    <MenuItem value="Kho Tp. Hồ Chí Minh">Kho Tp. Hồ Chí Minh</MenuItem>
                    <MenuItem value="Kho Hà Nội">Kho Hà Nội</MenuItem>
                    <MenuItem value="Kho Đà Nẵng">Kho Đà Nẵng</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Chính sách giảm giá</InputLabel>
                  <Select
                    value={selectedDiscountPolicy}
                    onChange={(e) => setSelectedDiscountPolicy(e.target.value)}
                    label="Chính sách giảm giá"
                  >
                    <MenuItem value="">Chọn chính sách giảm giá</MenuItem>
                    <MenuItem value="[MIỀN NAM] GIẢM GIÁ NHÓM SẢN PHẨM MỚI_V1">[MIỀN NAM] GIẢM GIÁ NHÓM SẢN PHẨM MỚI_V1</MenuItem>
                    <MenuItem value="[MIỀN BẮC] GIẢM GIÁ NHÓM SẢN PHẨM MỚI_V1">[MIỀN BẮC] GIẢM GIÁ NHÓM SẢN PHẨM MỚI_V1</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>
                  Giảm
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    size="small"
                    type="number"
                    value={discountPercent1}
                    onChange={(e) => setDiscountPercent1(Number(e.target.value) || 0)}
                    sx={{ width: 80 }}
                  />
                  <Typography>% +</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={discountPercent2}
                    onChange={(e) => setDiscountPercent2(Number(e.target.value) || 0)}
                    sx={{ width: 80 }}
                  />
                  <Typography>%</Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Warehouse and Stock Information */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6} lg={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tồn kho (bỏ mua)"
                    value={`${stockDiscardPurchase.toFixed(2)} ${selectedProduct?.unit || ''}`}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tồn LT kế toán"
                    value={`${stockAccountingLT.toFixed(2)} ${selectedProduct?.unit || ''}`}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="SL theo kho"
                    value={`${stockQuantity.toFixed(2)} ${selectedProduct?.unit || ''}`}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Kho đề xuất"
                    value={suggestedWarehouse || "Chưa có đề xuất"}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Checkbox checked={approvePrice} onChange={(e) => setApprovePrice(e.target.checked)} />}
                label="Duyệt giá"
              />
              <FormControlLabel
                control={<Checkbox checked={approveSupPrice} onChange={(e) => setApproveSupPrice(e.target.checked)} />}
                label="Duyệt giá SUP"
              />
              <FormControlLabel
                control={<Checkbox checked={urgentOrder} onChange={(e) => setUrgentOrder(e.target.checked)} />}
                label="Đơn hàng gấp"
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Ngày giao NM"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Ca</InputLabel>
                <Select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as "Ca sáng" | "Ca chiều")}
                  label="Ca"
                >
                  <MenuItem value="Ca sáng">Ca sáng</MenuItem>
                  <MenuItem value="Ca chiều">Ca chiều</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Ghi chú"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton color="primary" onClick={handleAddProduct} title="Thêm">
                  <AddIcon />
                </IconButton>
                <IconButton color="success" title="Lưu">
                  <SaveIcon />
                </IconButton>
                <IconButton onClick={handleRefresh} title="Làm mới">
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>

          {/* Bảng dữ liệu */}
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold', width: 60 }}>STT</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold', minWidth: 220 }}>Tên sản phẩm</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Đơn vị</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Số lượng</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Giá</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Phụ phí</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Chiết khấu</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Giá đã CK</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>VAT</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Tổng tiền</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Người duyệt</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Ngày giao</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Ca</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold' }}>Kho đáp ứng</TableCell>
                  <TableCell sx={{ bgcolor: '#2b8c8c', color: 'white', fontWeight: 'bold', width: 80 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Chưa có đơn hàng
                    </TableCell>
                  </TableRow>
                ) : (
                  totals.detail.map((row, index) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={row.quantity}
                          onChange={(e) => handleUpdateQuantity(row.id, Number(e.target.value) || 1)}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={row.price}
                          onChange={(e) => handleUpdatePrice(row.id, Number(e.target.value) || 0)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>{(row.surcharge * 100).toFixed(0)}%</TableCell>
                      <TableCell>{row.discount.toFixed(2)}</TableCell>
                      <TableCell>{formatCurrency(row.priceAfterDiscount)}</TableCell>
                      <TableCell>{row.vat}%</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{formatCurrency(row.lineTotal + row.vatAmount)}</TableCell>
                      <TableCell>{row.approver || "-"}</TableCell>
                      <TableCell>{row.expectedDate.split("-").reverse().join("/")}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={row.shift || shift}
                          onChange={(e) => {
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, shift: e.target.value as "Ca sáng" | "Ca chiều" } : r
                              )
                            );
                          }}
                          sx={{ minWidth: 100 }}
                        >
                          <MenuItem value="Ca sáng">Ca sáng</MenuItem>
                          <MenuItem value="Ca chiều">Ca chiều</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>{row.warehouse || "-"}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleDeleteProduct(row.id)} title="Xóa sản phẩm">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell colSpan={10} align="right" sx={{ fontWeight: 'bold' }}>
                    Tổng tiền
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                    {formatCurrency(totals.grandTotal)}
                  </TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <Toolbar />
      <Footer />
    </Box>
  );
};

export default AdminAppPage;
