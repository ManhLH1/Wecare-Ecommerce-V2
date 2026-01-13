'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { computeDeliveryDate } from '../../../utils/computeDeliveryDate';
import Dropdown from './Dropdown';
import { useProducts, useUnits, useWarehouses } from '../_hooks/useDropdownData';
import {
  fetchProductPrice,
  fetchProductPromotions,
  fetchInventory,
  fetchAccountingStock,
  fetchPromotionOrders,
  getDistrictLeadtime,
  Promotion,
  Product,
} from '../_api/adminApi';
import { showToast } from '../../../components/ToastManager';

// Map option set value of crdfd_gtgt/crdfd_gtgtnew to VAT percentage
const VAT_OPTION_MAP: Record<number, number> = {
  191920000: 0,  // 0%
  191920001: 5,  // 5%
  191920002: 8,  // 8%
  191920003: 10, // 10%
};

// Payment terms OptionSet mapping (value -> label) - keep in sync with server/frontend mappings
const PAYMENT_TERMS_MAP_CLIENT: Record<string, string> = {
  '0': 'Thanh toán sau khi nhận hàng',
  '14': 'Thanh toán 2 lần vào ngày 10 và 25',
  '30': 'Thanh toán vào ngày 5 hàng tháng',
  '283640000': 'Tiền mặt',
  '283640001': 'Công nợ 7 ngày',
  '191920001': 'Công nợ 20 ngày',
  '283640002': 'Công nợ 30 ngày',
  '283640003': 'Công nợ 45 ngày',
  '283640004': 'Công nợ 60 ngày',
  '283640005': 'Thanh toán trước khi nhận hàng',
  // note: some keys may differ in server, include common ones if needed
};

const getPaymentTermLabelClient = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return 'Không ràng buộc';
  const key = String(value).trim();
  if (PAYMENT_TERMS_MAP_CLIENT[key]) return PAYMENT_TERMS_MAP_CLIENT[key];
  // try numeric extraction
  const digits = key.replace(/\D/g, '');
  if (digits && PAYMENT_TERMS_MAP_CLIENT[digits]) return PAYMENT_TERMS_MAP_CLIENT[digits];
  return key;
};

// Product groups that bypass inventory checks and allow free ordering (PowerApps: item.'Mã nhóm SP' = ...)
const INVENTORY_BYPASS_PRODUCT_GROUP_CODES = [
  'NSP-00027',
  'NSP-000872',
  'NSP-000409',
  'NSP-000474',
  'NSP-000873',
] as const;

interface ProductEntryFormProps {
  isAdding?: boolean;
  isSaving?: boolean;
  isLoadingDetails?: boolean;
  showInlineActions?: boolean;
  hasUnsavedProducts?: boolean; // Có sản phẩm mới chưa lưu trong danh sách
  product: string;
  setProduct: (value: string) => void;
  productCode: string;
  setProductCode: (value: string) => void;
  unit: string;
  setUnit: (value: string) => void;
  warehouse: string;
  setWarehouse: (value: string) => void;
  customerId?: string;
  customerCode?: string;
  customerIndustry?: number | null;
  customerName?: string;
  customerDistrictKey?: string;
  customerRegion?: string;
  customerWecareRewards?: string | null;
  paymentTerms?: string | number | null;
  soId?: string;
  orderType?: number | null; // Loại đơn hàng OptionSet value (optional)
  vatText?: string; // VAT text từ SO ("Có VAT" hoặc "Không VAT")
  quantity: number;
  setQuantity: (value: number) => void;
  price: string;
  setPrice: (value: string) => void;
  subtotal: number;
  setSubtotal: (value: number) => void;
  vatPercent: number;
  setVatPercent: (value: number) => void;
  vatAmount: number;
  setVatAmount: (value: number) => void;
  totalAmount: number;
  setTotalAmount: (value: number) => void;
  stockQuantity: number;
  setStockQuantity: (value: number) => void;
  approvePrice: boolean;
  setApprovePrice: (value: boolean) => void;
  approveSupPrice: boolean;
  setApproveSupPrice: (value: boolean) => void;
  urgentOrder: boolean;
  setUrgentOrder: (value: boolean) => void;
  deliveryDate: string;
  setDeliveryDate: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  approver: string;
  setApprover: (value: string) => void;
  priceEntryMethod?: 'Nhập thủ công' | 'Theo chiết khấu';
  setPriceEntryMethod?: (value: 'Nhập thủ công' | 'Theo chiết khấu') => void;
  discountRate?: string;
  setDiscountRate?: (value: string) => void;
  discountPercent: number;
  setDiscountPercent: (value: number) => void;
  discountAmount: number;
  setDiscountAmount: (value: number) => void;
  promotionText: string;
  promotionId: string;
  setPromotionId: (value: string) => void;
  setPromotionText: (value: string) => void;
  onAdd: (overrides?: { promotionId?: string, discountPercent?: number, discountAmount?: number, discountRate?: number }) => void;
  onSave: () => void;
  onRefresh: () => void;
  onInventoryReserved?: () => void; // Callback khi inventory được reserve để trigger reload
  onProductGroupCodeChange?: (code: string) => void; // Callback khi productGroupCode thay đổi
  disableInventoryReserve?: boolean; // Tắt tính năng giữ hàng tự động (dùng cho SOBG)
  orderTotal?: number; // Tổng tiền toàn đơn (dùng để check Promotion Order & phân bổ chiết khấu VNĐ)
  onOpenSpecialPromotions?: () => Promise<void> | void;
  enablePromotionAutoFetch?: boolean;
}

function ProductEntryForm({
  isAdding = false,
  isSaving = false,
  isLoadingDetails = false,
  showInlineActions = true,
  hasUnsavedProducts = false,
  product,
  setProduct,
  productCode,
  setProductCode,
  unit,
  setUnit,
  warehouse,
  setWarehouse,
  customerIndustry,
  customerId,
  customerCode,
  customerName,
  customerDistrictKey,
  customerRegion,
  customerWecareRewards,
  paymentTerms,
  soId,
  orderType,
  vatText,
  quantity,
  setQuantity,
  price,
  setPrice,
  subtotal,
  setSubtotal,
  vatPercent,
  setVatPercent,
  vatAmount,
  setVatAmount,
  totalAmount,
  setTotalAmount,
  stockQuantity,
  setStockQuantity,
  approvePrice,
  setApprovePrice,
  approveSupPrice,
  setApproveSupPrice,
  urgentOrder,
  setUrgentOrder,
  deliveryDate,
  setDeliveryDate,
  note,
  setNote,
  approver,
  setApprover,
  priceEntryMethod: priceEntryMethodProp,
  setPriceEntryMethod: setPriceEntryMethodProp,
  discountRate: discountRateProp,
  setDiscountRate: setDiscountRateProp,
  discountPercent,
  setDiscountPercent,
  discountAmount,
  setDiscountAmount,
  promotionText,
  promotionId,
  setPromotionId,
  setPromotionText,
  onAdd,
  onSave,
  onRefresh,
  onInventoryReserved,
  onProductGroupCodeChange,
  disableInventoryReserve = false,
  orderTotal,
  onOpenSpecialPromotions,
  enablePromotionAutoFetch = false,
}: ProductEntryFormProps) {

  // Disable form if customer or SO is not selected
  // Check for both null/undefined and empty string
  const isFormDisabled = !customerId || customerId === '' || !soId || soId === '';

  const [productSearch, setProductSearch] = useState('');
  // Helpers to convert between dd/mm/yyyy (app format) and yyyy-mm-dd (input[type="date"] format)
  const formatDdMmYyyyToIso = (d?: string) => {
    if (!d) return '';
    const parts = d.split('/');
    if (parts.length !== 3) return '';
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy) return '';
    return `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  };
  const formatIsoToDdMmYyyy = (iso?: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return '';
    const [yyyy, mm, dd] = parts;
    if (!dd || !mm || !yyyy) return '';
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy.padStart(4, '0')}`;
  };
  const [productId, setProductId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [unitChangeTrigger, setUnitChangeTrigger] = useState(0);
  const [availableUnitsFromPrices, setAvailableUnitsFromPrices] = useState<any[]>([]);
  const [pricesFromApi, setPricesFromApi] = useState<any[]>([]);
  const [selectedPriceFromApi, setSelectedPriceFromApi] = useState<any | null>(null);
  // Debug: monitor unit changes
  useEffect(() => {
    try {
      console.debug('[UnitDebug] state unitId/unit changed', { unitId, unit, userSelectedUnit: userSelectedUnitRef.current, availableUnitsFromPricesCount: availableUnitsFromPrices.length, pricesFromApiCount: pricesFromApi.length });
    } catch (e) {}
  }, [unitId, unit, availableUnitsFromPrices.length, pricesFromApi.length]);
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedProductCode, setSelectedProductCode] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inventoryTheoretical, setInventoryTheoretical] = useState<number>(0);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(false);
  const [inventoryMessage, setInventoryMessage] = useState<string>('Tồn kho (inventory): 0');
  const [bypassWarningMessage, setBypassWarningMessage] = useState<string>(''); // Cảnh báo bỏ qua kiểm tra tồn kho
  const [inventoryInventoryMessage, setInventoryInventoryMessage] = useState<string>(''); // Tồn kho Inventory
  const [khoBinhDinhMessage, setKhoBinhDinhMessage] = useState<string>(''); // Tồn kho Kho Bình Định
  const [isUsingInventory, setIsUsingInventory] = useState<boolean>(false); // Đang dùng Inventory hay Kho Bình Định
  const [inventoryColor, setInventoryColor] = useState<string | undefined>(undefined);
  const [reservedQuantity, setReservedQuantity] = useState<number>(0); // Số lượng đang giữ đơn
  const [availableToSell, setAvailableToSell] = useState<number | undefined>(undefined); // Số lượng khả dụng
  const [districtLeadtime, setDistrictLeadtime] = useState<number>(0); // Leadtime quận/huyện
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState<number>(0); // Key để trigger reload inventory
  const [accountingStock, setAccountingStock] = useState<number | null>(null);
  const [accountingStockLoading, setAccountingStockLoading] = useState<boolean>(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>('');
  const [priceGroupText, setPriceGroupText] = useState<string>('');
  const [priceEntryMethodInternal, setPriceEntryMethodInternal] = useState<'Nhập thủ công' | 'Theo chiết khấu'>('Nhập thủ công');
  const [discountRateInternal, setDiscountRateInternal] = useState<string>('1');

  // Use props if provided, otherwise use internal state
  const priceEntryMethod = priceEntryMethodProp ?? priceEntryMethodInternal;
  const setPriceEntryMethod = setPriceEntryMethodProp ?? setPriceEntryMethodInternal;
  const discountRate = discountRateProp ?? discountRateInternal;
  const setDiscountRate = setDiscountRateProp ?? setDiscountRateInternal;
  const [basePriceForDiscount, setBasePriceForDiscount] = useState<number>(0);
  const [promotionDiscountPercent, setPromotionDiscountPercent] = useState<number>(0);
  const [orderPromotionInfo, setOrderPromotionInfo] = useState<{ vndOrPercent?: string; value?: number; chietKhau2?: boolean } | null>(null);
  const [promotionWarning, setPromotionWarning] = useState<string | null>(null);
  const [apiPrice, setApiPrice] = useState<number | null>(null); // Giá từ API để check warning
  const [shouldReloadPrice, setShouldReloadPrice] = useState<number>(0); // Counter to trigger reload
  const [isProcessingAdd, setIsProcessingAdd] = useState<boolean>(false); // Flag để ngăn bấm liên tục
  const hasSetUnitFromApiRef = useRef<boolean>(false); // Track nếu đã set đơn vị từ API để không reset lại
  const userSelectedUnitRef = useRef<boolean>(false); // Track nếu người dùng đã chọn đơn vị thủ công
  const userHasManuallySelectedUnitRef = useRef<boolean>(false); // Persistent until product changes
  const lastPriceFetchKeyRef = useRef<string | null>(null); // Dedupe key for price fetches

  const isVatSo = useMemo(() => {
    const vatTextLower = (vatText || '').toLowerCase();
    return vatTextLower.includes('có vat');
  }, [vatText]);

  const hasSelectedProduct = useMemo(() => {
    return Boolean(productId || selectedProductCode);
  }, [productId, selectedProductCode]);

  // Compute discount percent to show next to price group badge (e.g., "Diamond (-4%)")
  const priceGroupDiscountPct = useMemo(() => {
    const group = (priceGroupText || '').trim();
    if (!group) return null;

    // Local normalizer (avoid using normalizeText before it's declared)
    const localNormalize = (v: string | undefined | null) =>
      (v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    const normGroup = localNormalize(group);

    // Prefer selectedPriceFromApi if it matches the group
    const sel = selectedPriceFromApi as any;
    let matched: any = null;
    try {
      if (sel) {
        const selGroup = (sel.priceGroupText || sel.crdfd_nhomoituongtext || '').trim();
        if (selGroup && localNormalize(selGroup) === normGroup) {
          matched = sel;
        }
      }
      if (!matched && Array.isArray(pricesFromApi)) {
        matched = pricesFromApi.find((p: any) => {
          const pg = (p.priceGroupText || p.crdfd_nhomoituongtext || '').trim();
          if (!pg) return false;
          return localNormalize(pg) === normGroup;
        });
      }
    } catch (e) {
      matched = null;
    }

    const raw = matched ? (matched.discountRate ?? matched.crdfd_discount_rate ?? null) : null;
    if (raw === null || raw === undefined) return null;
    const num = Number(raw);
    if (isNaN(num)) return null;
    // Normalize API discount numbers which may come in different formats:
    // - Small fractions (e.g., 0.027) should be shown as percent (2.7)
    // - Larger decimals (e.g., 0.94) likely represent a percent with decimals and should be shown as 0.94
    // - Values > 1 are already percent-like (e.g., 4 or 4.5 -> 4.0 or 4.5)
    let pctNumber: number;
    if (num > 0 && num <= 1) {
      if (num < 0.05) {
        // Very small fractions: 0.027 -> 2.7 (one decimal)
        pctNumber = Math.round(num * 1000) / 10;
      } else {
        // Larger decimals likely already represent percent with decimals: 0.94 -> 0.94 (two decimals)
        pctNumber = Math.round(num * 100) / 100;
      }
    } else {
      // Assume already percent-like, keep one decimal precision
      pctNumber = Math.round(num * 10) / 10;
    }
    return pctNumber;
  }, [priceGroupText, selectedPriceFromApi, pricesFromApi]);

  // Compute discount percent for customerWecareRewards badge (show percent next to rewards)
  const customerRewardDiscountPct = useMemo(() => {
    const group = (customerWecareRewards || '').trim();
    if (!group) return null;

    const localNormalize = (v: string | undefined | null) =>
      (v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    const normGroup = localNormalize(group);

    const sel = selectedPriceFromApi as any;
    let matched: any = null;
    try {
      // Prefer selectedPriceFromApi.discountRate when it exists
      if (sel && sel.discountRate !== undefined && sel.discountRate !== null) {
        matched = sel;
      }
      // Otherwise try to find a price entry that matches the customer reward group
      if (!matched && Array.isArray(pricesFromApi)) {
        matched = pricesFromApi.find((p: any) => {
          const pg = (p.priceGroupText || p.crdfd_nhomoituongtext || '').trim();
          if (pg && localNormalize(pg) === normGroup) return true;
          return false;
        }) || null;
      }
      // Fallback: use first entry that has discountRate defined
      if (!matched && Array.isArray(pricesFromApi)) {
        matched = pricesFromApi.find((p: any) => p.discountRate !== undefined && p.discountRate !== null) || null;
      }
    } catch (e) {
      matched = null;
    }

    const raw = matched ? (matched.discountRate ?? matched.crdfd_discount_rate ?? null) : null;
    if (raw === null || raw === undefined) return null;
    const num = Number(raw);
    if (isNaN(num)) return null;
    let pctNumber: number;
    if (num > 0 && num < 0.05) {
      // Very small fractions: 0.027 -> 2.7
      pctNumber = Math.round(num * 1000) / 10;
    } else if (num > 0 && num <= 1) {
      // Larger decimals likely represent percent-with-decimals: 0.94 -> 0.94
      pctNumber = Math.round(num * 100) / 100;
    } else {
      // Values > 1 are percent-like, keep one decimal
      pctNumber = Math.round(num * 10) / 10;
    }
    return pctNumber;
  }, [customerWecareRewards, selectedPriceFromApi, pricesFromApi]);

  const normalizePriceInput = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Remove thousand separators to keep numeric parsing consistent
    return str.replace(/,/g, '').trim();
  };

  // Warning message for price based on PowerApps logic (var_warning_gia)
  const priceWarningMessage = useMemo(() => {
    // --- Bỏ qua kiểm tra tồn kho (không chặn khi hết tồn kho) ---
    // Vẫn hiển thị tồn kho nhưng không chặn

    // --- Điều kiện kiểm tra VAT & GTGT không khớp ---
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;
    const isNonVatOrder = vatTextLower.includes('không vat') || vatPercent === 0;

    const vatOptionValue = selectedProduct?.crdfd_gtgt_option ?? selectedProduct?.crdfd_gtgt;
    const productVatPercent = vatOptionValue !== undefined ? VAT_OPTION_MAP[Number(vatOptionValue)] : undefined;

    const productVatIsZero = productVatPercent === 0 || productVatPercent === undefined;
    const productVatGreaterZero = productVatPercent !== undefined && productVatPercent > 0;

    const soIsNonVat = isNonVatOrder;
    const soIsVat = isVatOrder;

    if (
      (soIsNonVat && productVatGreaterZero) ||
      (soIsVat && productVatIsZero)
    ) {
      return 'SO và sản phẩm không khớp GTGT';
    }

    // --- Nếu không rơi vào 2 TH trên thì giữ message cũ ---
    // Check cả giá từ input và giá từ API
    const normalizedPrice = Number(normalizePriceInput(price));
    const hasPriceInInput = !isNaN(normalizedPrice) && normalizedPrice > 0;
    const hasPriceFromApi = apiPrice !== null && apiPrice !== undefined && apiPrice > 0;
    const hasPrice = hasPriceInInput || hasPriceFromApi;

    if (hasPrice) {
      return 'Giá bình thường';
    }

    const unitText = unit || 'đơn vị này';
    const warningMsg = `Sản phẩm chưa báo giá cho đơn vị ${unitText} !!`;
    return warningMsg;
  }, [vatText, vatPercent, warehouse, inventoryTheoretical, selectedProduct, price, unit, apiPrice]);

  // Danh sách người duyệt
  const approversList = [
    'Bùi Tuấn Dũng',
    'Lê Sinh Thông',
    'Lê Thị Ngọc Anh',
    'Nguyễn Quốc Chinh',
    'Phạm Quốc Hưng',
    'Huỳnh Minh Trung',
    'Bùi Thị Mỹ Trang',
    'Hà Bông',
    'Vũ Thành Minh',
    'Phạm Thị Mỹ Hương',
    'La Hoài Phương',
    'Trần Thái Huy',
    'Phạm Thị Ngọc Nữ',
    'Trần Thanh Phong',
    'Nguyễn Quốc Hào',
    'Đỗ Nguyễn Hoàng Nhân',
    'Hoàng Thị Mỹ Linh',
  ];

  // Tỉ lệ chiết khấu
  const discountRates = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20'];

  const normalizePromotionId = (id: any) => {
    if (id === null || id === undefined) return '';
    return String(id).trim();
  };

  const copyToClipboard = async (text: string) => {
    const trimmed = (text || '').toString().trim();
    if (!trimmed) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
        return true;
      }
    } catch {
      // fall back below
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = trimmed;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  // Fetch data for dropdowns
  const { products, loading: productsLoading } = useProducts(productSearch);
  const { units, loading: unitsLoading } = useUnits(selectedProductCode);
  const { warehouses, loading: warehousesLoading } = useWarehouses(customerId);

  // Get warehouse code from selected warehouse
  const selectedWarehouseData = warehouses.find(w => w.crdfd_name === warehouse);
  const warehouseCode = selectedWarehouseData?.crdfd_makho;

  // Fetch accounting stock (Tồn LT kế toán)
  useEffect(() => {
    const loadAccountingStock = async () => {
      if (!selectedProductCode) {
        setAccountingStock(null);
        return;
      }
      try {
        setAccountingStockLoading(true);
        const vatTextLower = (vatText || '').toLowerCase();
        const isVatOrder = vatTextLower.includes('có vat');
        const result = await fetchAccountingStock(selectedProductCode, isVatOrder);
        setAccountingStock(result?.accountingStock ?? null);
      } catch (err) {
        console.error('Error loading accounting stock', err);
        setAccountingStock(null);
      } finally {
        setAccountingStockLoading(false);
      }
    };

    loadAccountingStock();
  }, [selectedProductCode, vatText]);

  // Lấy tên đơn vị chuẩn từ unit conversion (theo PowerApps logic)
  const getBaseUnitName = () => {

    // Ưu tiên lấy từ unit hiện tại (dp_Don_vi.Selected.'Đơn vị chuẩn') - theo dữ liệu từ API units
    const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
    if (currentUnit) {
      const unitBaseUnit = (currentUnit as any)?.crdfd_onvichuan;
      if (unitBaseUnit) {
        return unitBaseUnit;
      }
    }

    // Fallback: Theo PowerApps: cb_san_pham.Selected.'Đơn vị chuẩn text'
    // Ưu tiên lấy từ selectedProduct
    if (selectedProduct?.crdfd_onvichuantext) {
      return selectedProduct.crdfd_onvichuantext;
    }

    // Fallback: tìm từ products list
    const productFromList = products.find((p) => p.crdfd_masanpham === selectedProductCode);
    if (productFromList?.crdfd_onvichuantext) {
      return productFromList.crdfd_onvichuantext;
    }

    // Fallback: lấy từ unit hiện tại với tên trường khác
    if (currentUnit) {
      const unitBaseUnit = (currentUnit as any)?.crdfd_onvichuantext;
      return unitBaseUnit || 'đơn vị chuẩn';
    }

    return 'đơn vị chuẩn';
  };

  // Label "SL theo kho" = Số lượng * Giá trị chuyển đổi, hiển thị theo đơn vị chuẩn
  // Công thức PowerApps: "SL theo kho: " & Text(IfError(Value(txt_So_luong.Text) * dp_Don_vi.Selected.'Giá trị chuyển đổi', 0), "#,##0.##") & " " & cb_san_pham.Selected.'Đơn vị chuẩn text'
  const warehouseQuantityLabel = useMemo(() => {
    // Nếu không có số lượng hoặc số lượng <= 0, không hiển thị
    if (!quantity || quantity <= 0) return '';

    try {
      // Lấy giá trị chuyển đổi ưu tiên từ API price (nếu API trả về crdfd_giatrichuyenoi)
      const apiFactorRaw =
        (selectedPriceFromApi as any)?.crdfd_giatrichuyenoi ??
        (selectedPriceFromApi as any)?.crdfd_onvi?.crdfd_giatrichuyenoi ??
        null;

      // Lấy giá trị chuyển đổi từ đơn vị đã chọn (fallback)
      const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
      const unitFactorRaw = (currentUnit as any)?.crdfd_giatrichuyenoi ?? null;

      // Nếu cả hai đều không có, fallback về 1
      let conversionFactor = 1;
      const chosenRaw = apiFactorRaw ?? unitFactorRaw;
      if (chosenRaw !== null && chosenRaw !== undefined) {
        const factorNum = Number(chosenRaw);
        conversionFactor = !isNaN(factorNum) && factorNum > 0 ? factorNum : 1;
      }

      // Tính số lượng theo kho: quantity * conversionFactor
      const converted = quantity * conversionFactor;

      // Format theo "#,##0.##" (tối đa 2 chữ số thập phân, có dấu phẩy phân cách hàng nghìn)
      const formatted = converted.toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: true,
      });

      // Lấy đơn vị chuẩn từ sản phẩm (cb_san_pham.Selected.'Đơn vị chuẩn text')
      const baseUnitText = getBaseUnitName();

      const result = `SL theo kho: ${formatted} ${baseUnitText}`;

      return result;
    } catch (error) {
      console.error('[SL theo kho] Error:', error);
      // Nếu có lỗi, trả về chuỗi rỗng
      return '';
    }
  }, [quantity, units, unitId, selectedProduct, selectedProductCode, products, selectedPriceFromApi, unitChangeTrigger]);

  const getConversionFactor = () => {
    const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
    // Chỉ sử dụng crdfd_giatrichuyenoi
    const rawFactor = (currentUnit as any)?.crdfd_giatrichuyenoi ?? 1;
    const factorNum = Number(rawFactor);
    return !isNaN(factorNum) && factorNum > 0 ? factorNum : 1;
  };

  const getRequestedBaseQuantity = () => {
    const conversionFactor = getConversionFactor();
    return (quantity || 0) * conversionFactor;
  };

  const normalizeText = (value: string | undefined | null) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const getInventorySourceText = (isVatOrder: boolean) => {
    // Theo rule hiện tại:
    // - VAT   -> Kho Bình Định (bỏ mua)
    // - NonVAT -> Inventory Weshops
    return isVatOrder ? 'Kho Bình Định' : 'Inventory';
  };

  const selectedProductGroupCode = useMemo(() => {
    const fromState = (selectedProduct as any)?.crdfd_manhomsp as string | undefined;
    if (fromState) return fromState;

    const fromId = products.find((p) => p.crdfd_productsid === productId)?.crdfd_manhomsp;
    if (fromId) return fromId;

    const fromCode =
      selectedProductCode
        ? products.find((p) => p.crdfd_masanpham === selectedProductCode)?.crdfd_manhomsp
        : undefined;
    return fromCode || '';
  }, [selectedProduct, products, productId, selectedProductCode]);

  // Gọi callback khi productGroupCode thay đổi
  useEffect(() => {
    if (onProductGroupCodeChange) {
      onProductGroupCodeChange(selectedProductGroupCode);
    }
  }, [selectedProductGroupCode, onProductGroupCodeChange]);

  const shouldBypassInventoryCheck = useMemo(() => {
    if (!selectedProductGroupCode) return false;
    return (INVENTORY_BYPASS_PRODUCT_GROUP_CODES as readonly string[]).includes(selectedProductGroupCode);
  }, [selectedProductGroupCode]);

  const syncInventoryState = (theoretical: number, reserved: number, available: number | undefined, isVatOrder: boolean) => {

    setInventoryTheoretical(theoretical);
    setReservedQuantity(reserved);
    const finalAvailable = available !== undefined ? available : (theoretical - reserved);
    setAvailableToSell(finalAvailable);

    const stockToUse = finalAvailable;
    setStockQuantity(stockToUse);

    const sourceText = getInventorySourceText(isVatOrder);
    const labelPrefix = `Tồn kho (${sourceText}):`;
    // Format: Tồn kho: X | Đang giữ: Y | Khả dụng: Z
    const message = `${labelPrefix} ${theoretical.toLocaleString('vi-VN')} | Đang giữ: ${reserved.toLocaleString('vi-VN')} | Khả dụng: ${finalAvailable.toLocaleString('vi-VN')}`;

    setBypassWarningMessage(''); // Reset cảnh báo khi sync state
    setInventoryMessage(message);
    setInventoryColor(stockToUse <= 0 ? 'red' : undefined);
  };

  const checkInventoryBeforeAction = async () => {
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;

    // Đơn VAT: không cần check tồn kho - cho phép lên đơn tự do
    if (isVatOrder) {
      return true;
    }

    // Bỏ qua kiểm tra tồn kho cho các nhóm SP đặc thù hoặc khách hàng đặc biệt
    if (shouldBypassInventoryCheck) {
      return true;
    }

    // Bỏ qua kiểm tra tồn kho cho khách hàng đặc biệt (cho phép lên đơn tự do)
    const customerNameNorm = normalizeText(customerName);
    const isAllowedCustomer =
      customerNameNorm === 'kho wecare' || customerNameNorm === 'kho wecare (ho chi minh)';
    if (isAllowedCustomer) {
      return true;
    }

    if (!selectedProductCode) {
      showToast.warning('Vui lòng chọn sản phẩm trước khi thực hiện.');
      return false;
    }
    if (!warehouse) {
      showToast.warning('Vui lòng chọn vị trí kho trước khi thực hiện.');
      return false;
    }
    if (!quantity || quantity <= 0) {
      showToast.warning('Số lượng phải lớn hơn 0.');
      return false;
    }

    try {
      setInventoryLoading(true);
      const latest = await fetchInventory(selectedProductCode, warehouse, isVatOrder);
      if (!latest) {
        showToast.error('Không lấy được thông tin tồn kho. Vui lòng thử lại.');
        return false;
      }

      const latestStock = latest.theoreticalStock ?? 0;
      const latestReserved = latest.reservedQuantity ?? 0;
      const latestAvailable = latest.availableToSell ?? undefined;
      syncInventoryState(latestStock, latestReserved, latestAvailable, isVatOrder);

      const requestedQty = getRequestedBaseQuantity();
      const baseUnitName = getBaseUnitName();
      // Sử dụng availableToSell nếu có, nếu không thì dùng theoreticalStock
      // Lưu ý: Đơn VAT đã return true ở trên, không đến được đoạn này
      const stockToCheck = latestAvailable !== undefined ? latestAvailable : latestStock;
      if (stockToCheck < requestedQty) {
        showToast.warning(
          `Tồn kho đã thay đổi, chỉ còn ${stockToCheck.toLocaleString(
            'vi-VN'
          )} ${baseUnitName} - không đủ cho số lượng yêu cầu ${requestedQty.toLocaleString('vi-VN')} ${baseUnitName}. Vui lòng điều chỉnh.`,
          { autoClose: 5000 }
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('Inventory re-check failed', err);
      showToast.error('Kiểm tra tồn kho thất bại. Vui lòng thử lại.');
      return false;
    } finally {
      setInventoryLoading(false);
    }
  };

  // Disable logic for Add/Save buttons mapped from the provided PowerApps expression
  const buttonsDisabled = useMemo(() => {
    if (isFormDisabled) {
      return true;
    }

    // Duyệt giá => bắt buộc chọn Người duyệt
    if (approvePrice && !approver) {
      return true;
    }

    // Kiểm tra số lượng: bắt buộc phải > 0 cho tất cả các trường hợp
    if (!quantity || quantity <= 0) {
      return true;
    }

    // Kiểm tra giá: phải có giá > 0 (bắt buộc, kể cả khi bật "Duyệt giá")
    const priceNum = parseFloat(price || '0') || 0;
    if (priceNum <= 0) {
      return true;
    }

    // Kiểm tra đơn VAT trước - đơn VAT không cho thêm sản phẩm không VAT
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;

    // Đơn VAT: không cho thêm sản phẩm không VAT
    if (isVatOrder && selectedProduct) {
      const vatOptionValue = selectedProduct?.crdfd_gtgt_option ?? selectedProduct?.crdfd_gtgt;
      const productVatPercent = vatOptionValue !== undefined ? VAT_OPTION_MAP[Number(vatOptionValue)] : undefined;
      const productVatIsZero = productVatPercent === 0 || productVatPercent === undefined;

      // Nếu SO có VAT và sản phẩm không VAT thì chặn
      if (productVatIsZero) {
        return true; // Disable button
      }
    }

    // Đơn VAT với sản phẩm có VAT: cho phép lên đơn tự do - không ràng buộc gì (trừ duyệt giá cần người duyệt và số lượng > 0)
    if (isVatOrder) {
      return false;
    }

    // Allowed product groups or special customers → always enabled
    const productGroupCode = selectedProductGroupCode || '';
    const customerNameNorm = normalizeText(customerName);
    const isAllowedGroup = (INVENTORY_BYPASS_PRODUCT_GROUP_CODES as readonly string[]).includes(productGroupCode);
    const isAllowedCustomer =
      customerNameNorm === 'kho wecare' || customerNameNorm === 'kho wecare (ho chi minh)';

    if (isAllowedGroup || isAllowedCustomer) {
      // Cho phép lên đơn tự do - không ràng buộc gì (nhưng vẫn cần số lượng > 0)
      return false;
    }

    // Đơn hàng khuyến mãi → enabled (OptionSet value for "Đơn hàng khuyến mãi")
    const PROMO_ORDER_OPTION = 191920002; // TODO: confirm actual OptionSet value
    const isPromoOrder =
      orderType === PROMO_ORDER_OPTION ||
      normalizeText(String(orderType)) === 'don hang khuyen mai' ||
      normalizeText(String(orderType)) === 'đon hang khuyen mai';

    if (isPromoOrder) {
      return false;
    }

    // Price warning equivalent of var_warning_gia
    // Ngoại lệ: "SO và sản phẩm không khớp GTGT" chỉ cảnh báo, không disable button
    const isVatMismatchWarning = priceWarningMessage === 'SO và sản phẩm không khớp GTGT';
    const hasPriceWarning =
      priceWarningMessage &&
      priceWarningMessage !== 'Giá bình thường' &&
      !isVatMismatchWarning;

    const warehouseNameNorm = normalizeText(warehouse);
    const isKhoBinhDinh =
      warehouseNameNorm === 'kho binh dinh' || warehouseNameNorm.includes('kho binh dinh');

    const requestedQty = getRequestedBaseQuantity();
    const inv = inventoryTheoretical ?? 0;
    // Bỏ qua kiểm tra tồn kho - không chặn khi hết tồn kho
    // Vẫn hiển thị tồn kho nhưng cho phép add sản phẩm

    // Kiểm tra giá (vẫn giữ logic cảnh báo giá)
    if (hasPriceWarning) {
      return true;
    }

    return false;
  }, [
    isFormDisabled,
    approvePrice,
    approver,
    quantity,
    price,
    selectedProduct,
    selectedProductGroupCode,
    customerName,
    orderType,
    priceWarningMessage,
    vatText,
    vatPercent,
    warehouse,
    inventoryTheoretical,
    getRequestedBaseQuantity,
    priceLoading, // Thêm priceLoading vào dependency để đảm bảo buttonsDisabled được tính lại khi đang load giá
  ]);

  const addButtonDisabledReason = useMemo(() => {
    if (!buttonsDisabled) {
      return '';
    }

    if (isFormDisabled) {
      const reason = 'Chọn KH và SO trước';
      return reason;
    }

    // Duyệt giá => bắt buộc chọn Người duyệt
    if (approvePrice && !approver) {
      const reason = 'Vui lòng chọn Người duyệt';
      return reason;
    }

    // Kiểm tra số lượng: bắt buộc phải > 0 cho tất cả các trường hợp
    if (!quantity || quantity <= 0) {
      const reason = 'Số lượng phải > 0';
      return reason;
    }

    // Kiểm tra giá: phải có giá > 0 (bắt buộc, kể cả khi bật "Duyệt giá")
    const priceNum = parseFloat(price || '0') || 0;
    if (priceNum <= 0) {
      const reason = 'Vui lòng nhập giá';
      return reason;
    }

    // Kiểm tra đơn VAT trước - đơn VAT không cho thêm sản phẩm không VAT
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;

    // Đơn VAT: không cho thêm sản phẩm không VAT
    if (isVatOrder && selectedProduct) {
      const vatOptionValue = selectedProduct?.crdfd_gtgt_option ?? selectedProduct?.crdfd_gtgt;
      const productVatPercent = vatOptionValue !== undefined ? VAT_OPTION_MAP[Number(vatOptionValue)] : undefined;
      const productVatIsZero = productVatPercent === 0 || productVatPercent === undefined;

      // Nếu SO có VAT và sản phẩm không VAT thì chặn
      if (productVatIsZero) {
        const reason = 'Đơn SO có VAT không được thêm sản phẩm không VAT';
        return reason;
      }
    }

    // Đơn VAT với sản phẩm có VAT: cho phép lên đơn tự do - không ràng buộc gì (trừ duyệt giá cần người duyệt và số lượng > 0)
    if (isVatOrder) {
      return '';
    }

    // Allowed product groups or special customers → bypass all validations
    const productGroupCode = selectedProductGroupCode || '';
    const customerNameNorm = normalizeText(customerName);
    const isAllowedGroup = (INVENTORY_BYPASS_PRODUCT_GROUP_CODES as readonly string[]).includes(productGroupCode);
    const isAllowedCustomer =
      customerNameNorm === 'kho wecare' || customerNameNorm === 'kho wecare (ho chi minh)';

    if (isAllowedGroup || isAllowedCustomer) {
      // Cho phép lên đơn tự do - không ràng buộc gì (nhưng vẫn cần số lượng > 0)
      return '';
    }

    // Các điều kiện cơ bản để thêm sản phẩm (chỉ cho đơn Không VAT)
    if (!selectedProductCode) {
      const reason = 'Vui lòng chọn sản phẩm';
      return reason;
    }
    if (!warehouse) {
      const reason = 'Vui lòng chọn kho';
      return reason;
    }

    // Cảnh báo giá (trừ mismatch GTGT - chỉ cảnh báo, không disable theo logic gốc)
    const isVatMismatchWarning = priceWarningMessage === 'SO và sản phẩm không khớp GTGT';
    const hasPriceWarning =
      priceWarningMessage && priceWarningMessage !== 'Giá bình thường' && !isVatMismatchWarning;
    if (hasPriceWarning) {
      return priceWarningMessage;
    }

    // Bỏ qua kiểm tra tồn kho - không chặn khi hết tồn kho
    // Vẫn hiển thị tồn kho nhưng cho phép add sản phẩm
    // Vẫn sử dụng "Kho Bình Định" để tính số giữ hàng

    const reason = 'Không đủ điều kiện';
    return reason;
  }, [
    buttonsDisabled,
    isFormDisabled,
    approvePrice,
    approver,
    selectedProductCode,
    selectedProductGroupCode,
    customerName,
    warehouse,
    quantity,
    priceWarningMessage,
    vatText,
    vatPercent,
    inventoryTheoretical,
    getRequestedBaseQuantity,
  ]);

  const accountingStockLabel = useMemo(() => {
    if (accountingStock === null || accountingStock === undefined) return '';

    // Lấy đơn vị chuẩn từ sản phẩm
    const baseUnitText = getBaseUnitName();

    const formatted = accountingStock.toLocaleString('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return `Tồn LT kế toán: ${formatted} ${baseUnitText}`;
  }, [accountingStock, selectedProduct, selectedProductCode, products, units, unitId]);

  // Function to load inventory
  const loadInventory = async () => {
    // Xác định nguồn tồn kho:
    // - Case đặc biệt (shouldBypassInventoryCheck) → luôn lấy từ "Kho Bình Định" (isVatOrder = true)
    // - Case thường: theo VAT của Sales Order:
    //   - "Có VAT"  → Kho Bình Định
    //   - "Không VAT" (hoặc còn lại) → Inventory Weshops
    const vatTextLower = (vatText || '').toLowerCase();
    // Case đặc biệt: luôn lấy từ Kho Bình Định
    const isVatOrder = shouldBypassInventoryCheck ? true : vatTextLower.includes('có vat');
    const sourceText = getInventorySourceText(isVatOrder);
    const labelPrefix = `Tồn kho (${sourceText}):`;

    // Vẫn load tồn kho cho các case đặc biệt, nhưng hiển thị cảnh báo
    const bypassWarning = shouldBypassInventoryCheck
      ? `⚠️ Bỏ qua kiểm tra tồn kho (nhóm SP: ${selectedProductGroupCode || '—'})`
      : '';

    if (!selectedProductCode || !warehouse) {
      const message = selectedProductCode && !warehouse
        ? 'Chọn kho để xem tồn kho'
        : !selectedProductCode && warehouse
          ? 'Chọn sản phẩm để xem tồn kho'
          : `${labelPrefix} 0`;
      setInventoryTheoretical(0);
      setStockQuantity(0);
      setBypassWarningMessage(''); // Reset cảnh báo
      setInventoryInventoryMessage(''); // Reset
      setKhoBinhDinhMessage(''); // Reset
      setIsUsingInventory(false); // Reset
      setInventoryMessage(message);
      setInventoryColor(undefined);
      return;
    }

    try {
      setInventoryLoading(true);

      // Load cả hai tồn kho: Inventory và Kho Bình Định
      const [inventoryResult, khoBinhDinhResult] = await Promise.all([
        fetchInventory(selectedProductCode, warehouse, false), // Inventory (không VAT)
        fetchInventory(selectedProductCode, warehouse, true),  // Kho Bình Định (có VAT)
      ]);

      // Xử lý tồn kho Inventory
      const inventoryTheoretical = inventoryResult?.theoreticalStock ?? 0;
      const inventoryReserved = inventoryResult?.reservedQuantity ?? 0;
      const inventoryAvailable = inventoryResult?.availableToSell ?? (inventoryTheoretical - inventoryReserved);

      // Xử lý tồn kho Kho Bình Định
      const khoBinhDinhTheoretical = khoBinhDinhResult?.theoreticalStock ?? 0;
      const khoBinhDinhReserved = khoBinhDinhResult?.reservedQuantity ?? 0;
      const khoBinhDinhAvailable = khoBinhDinhResult?.availableToSell ?? (khoBinhDinhTheoretical - khoBinhDinhReserved);

      // Cập nhật state với tồn kho chính (theo logic hiện tại)
      const theoretical = isVatOrder ? khoBinhDinhTheoretical : inventoryTheoretical;
      const reserved = isVatOrder ? khoBinhDinhReserved : inventoryReserved;
      const available = isVatOrder ? khoBinhDinhAvailable : inventoryAvailable;

      setInventoryTheoretical(theoretical);
      setReservedQuantity(reserved);
      setAvailableToSell(available);

      // Tách cảnh báo và thông tin tồn kho thành 2 dòng riêng
      const bypassWarning = shouldBypassInventoryCheck
        ? `⚠️ Bỏ qua kiểm tra tồn kho (nhóm SP: ${selectedProductGroupCode || '—'})`
        : '';

      // Tách thành 2 message riêng cho 2 dòng tồn kho
      const inventoryInfo = `Tồn kho (Inventory): ${inventoryTheoretical.toLocaleString('vi-VN')} | Đang giữ: ${inventoryReserved.toLocaleString('vi-VN')} | Khả dụng: ${inventoryAvailable.toLocaleString('vi-VN')}`;
      const khoBinhDinhInfo = `Tồn kho (Kho Bình Định): ${khoBinhDinhTheoretical.toLocaleString('vi-VN')} | Đang giữ: ${khoBinhDinhReserved.toLocaleString('vi-VN')} | Khả dụng: ${khoBinhDinhAvailable.toLocaleString('vi-VN')}`;

      // Xác định dòng nào đang được tính (dựa vào isVatOrder)
      // isVatOrder = false → dùng Inventory (bình thường), Kho Bình Định (nghiêng)
      // isVatOrder = true → dùng Kho Bình Định (bình thường), Inventory (nghiêng)
      const usingInventory = !isVatOrder;

      // Sử dụng availableToSell nếu có, nếu không thì dùng theoretical
      const stockToUse = available;
      setStockQuantity(stockToUse);
      setBypassWarningMessage(bypassWarning);
      setInventoryInventoryMessage(inventoryInfo);
      setKhoBinhDinhMessage(khoBinhDinhInfo);
      setIsUsingInventory(usingInventory);
      // Giữ inventoryMessage cho backward compatibility
      setInventoryMessage(`${inventoryInfo}\n${khoBinhDinhInfo}`);

      // Màu sắc: đỏ nếu không có tồn kho hoặc không đủ khả dụng
      const hasStock = stockToUse > 0;
      setInventoryColor(hasStock ? undefined : 'red');
    } catch (e) {
      console.error('❌ [Load Inventory] Error:', e);
      const message = `Lỗi khi tải tồn kho: ${e instanceof Error ? e.message : 'Unknown error'}`;
      setInventoryTheoretical(0);
      setStockQuantity(0);
      setBypassWarningMessage(''); // Reset cảnh báo
      setInventoryInventoryMessage(''); // Reset
      setKhoBinhDinhMessage(''); // Reset
      setIsUsingInventory(false); // Reset
      setInventoryMessage(message);
      setInventoryColor('red');
    } finally {
      // Use state variables (safe outside try) instead of local try-scoped variables
      setInventoryLoading(false);
    }
  };

  // Load inventory when product code & warehouse change, or when refresh key changes
  useEffect(() => {
    loadInventory();
  }, [selectedProductCode, warehouse, vatText, vatPercent, setStockQuantity, shouldBypassInventoryCheck, selectedProductGroupCode, inventoryRefreshKey]);

  // Expose reload function to parent via window object (temporary solution)
  useEffect(() => {
    if (onInventoryReserved) {
      // Store reload function in window object so parent can call it
      (window as any).__reloadInventory = () => {
        setInventoryRefreshKey(prev => prev + 1); // Trigger reload by changing key
      };
    }
    return () => {
      // Cleanup
      if ((window as any).__reloadInventory) {
        delete (window as any).__reloadInventory;
      }
    };
  }, [onInventoryReserved]);

  // Function to reload inventory manually
  const handleReloadInventory = async () => {
    if (shouldBypassInventoryCheck) {
      return;
    }
    if (!selectedProductCode || !warehouse) {
      showToast.warning('Vui lòng chọn sản phẩm và kho trước');
      return;
    }
    await loadInventory();
  };

  // Sync product and unit with parent state
  useEffect(() => {
    if (product && !productId) {
      // If product is set from parent but productId is not, try to find it
      const found = products.find((p) => p.crdfd_name === product);
      if (found) {
        setProductId(found.crdfd_productsid);
        setSelectedProduct(found as any);
        setSelectedProductCode(found.crdfd_masanpham);
        const gtgtVal = found.crdfd_gtgt_option ?? found.crdfd_gtgt;
        const vatFromOption = gtgtVal !== undefined ? VAT_OPTION_MAP[gtgtVal] : undefined;
        if (vatFromOption !== undefined) {
          handleVatChange(vatFromOption);
        }
      }
    }
  }, [product, productId, products]);

  useEffect(() => {
    const unitIdIsEmpty = unitId === '' || unitId === null || unitId === undefined;
    const currentUnitExists =
      (units || []).some((u) => u.crdfd_unitsid === unitId) ||
      (availableUnitsFromPrices || []).some((u) => u.crdfd_unitsid === unitId);

    // Nếu đã có unitId được chọn và unitId vẫn tồn tại trong danh sách units/availableUnitsFromPrices, KHÔNG làm gì cả
    // Chỉ xử lý khi unitId trống hoặc unitId không còn tồn tại
    if (!unitIdIsEmpty && currentUnitExists) {
      // Người dùng đã chọn đơn vị và đơn vị vẫn hợp lệ, giữ nguyên
      return;
    }

    if (unit && unitIdIsEmpty && !userSelectedUnitRef.current) {
      // If unit is set from parent but unitId is not, try to find it; otherwise fallback to first
      // CHỈ chạy nếu người dùng chưa chọn đơn vị thủ công
      const found = units.find((u) => u.crdfd_name === unit);
      if (found) {
        try { console.debug('[UnitDebug] auto-mapping unit from parent unit name ->', unit, 'found id', found.crdfd_unitsid); } catch(e) {}
        setUnitId(found.crdfd_unitsid);
      } else if ((availableUnitsFromPrices && availableUnitsFromPrices.length > 0)) {
        try { console.debug('[UnitDebug] auto-select first availableUnitsFromPrices ->', availableUnitsFromPrices[0].crdfd_name); } catch(e) {}
        setUnitId(availableUnitsFromPrices[0].crdfd_unitsid);
        setUnit(availableUnitsFromPrices[0].crdfd_name);
      } else if (units.length > 0) {
        try { console.debug('[UnitDebug] fallback select first CRM unit ->', units[0].crdfd_name); } catch(e) {}
        setUnitId(units[0].crdfd_unitsid);
        setUnit(units[0].crdfd_name);
      }
      return;
    }

    if (!unit && unitIdIsEmpty && (availableUnitsFromPrices && availableUnitsFromPrices.length > 0) && !userHasManuallySelectedUnitRef.current) {
      // Auto-select first unit from availableUnitsFromPrices when available (prefers price-derived units)
      try { console.debug('[UnitDebug] auto-select unitsFromPrices first ->', availableUnitsFromPrices[0].crdfd_name); } catch(e) {}
      setUnitId(availableUnitsFromPrices[0].crdfd_unitsid);
      setUnit(availableUnitsFromPrices[0].crdfd_name);
      return;
    }

    if (!unitIdIsEmpty && !currentUnitExists && (availableUnitsFromPrices && availableUnitsFromPrices.length > 0)) {
      // If current unitId is no longer in list, fallback to first availableUnitsFromPrices
      try { console.debug('[UnitDebug] current unitId not exists -> fallback to availableUnitsFromPrices[0]'); } catch(e) {}
      setUnitId(availableUnitsFromPrices[0].crdfd_unitsid);
      setUnit(availableUnitsFromPrices[0].crdfd_name);
    } else if (!unitIdIsEmpty && !currentUnitExists && units.length > 0) {
      // Fallback to real units list
      try { console.debug('[UnitDebug] current unitId not exists -> fallback to CRM units[0]'); } catch(e) {}
      setUnitId(units[0].crdfd_unitsid);
      setUnit(units[0].crdfd_name);
    }
  }, [unit, unitId, units, availableUnitsFromPrices]);

  useEffect(() => {
    if (warehouse && !warehouseId) {
      // If warehouse is set from parent but warehouseId is not, try to find it
      const found = warehouses.find((w) => w.crdfd_name === warehouse);
      if (found) {
        setWarehouseId(found.crdfd_khowecareid);
      }
    } else if (!warehouse && !warehouseId && warehouses.length > 0) {
      // Auto-select first warehouse when available
      setWarehouseId(warehouses[0].crdfd_khowecareid);
      setWarehouse(warehouses[0].crdfd_name);
    }
  }, [warehouse, warehouseId, warehouses]);

  // Auto-fetch price from crdfd_baogiachitiets by product code
  // Chỉ load giá khi đã chọn sản phẩm (có selectedProductCode và product)
  useEffect(() => {
    const loadPrice = async () => {
      // Chỉ load giá khi đã chọn sản phẩm đầy đủ
      if (!selectedProductCode || !product) {
        setApiPrice(null); // Reset khi không có sản phẩm
        setPriceLoading(false);
        hasSetUnitFromApiRef.current = false; // Reset flag khi không có sản phẩm
        userSelectedUnitRef.current = false; // Reset flag khi không có sản phẩm
        userHasManuallySelectedUnitRef.current = false;
        // Reset last fetch key when product cleared
        lastPriceFetchKeyRef.current = null;
        // Clear giá khi không có sản phẩm (trừ khi đang ở chế độ nhập thủ công với duyệt giá)
        if (!(approvePrice && priceEntryMethod === 'Nhập thủ công')) {
          handlePriceChange('');
          setBasePriceForDiscount(0);
        }
        return;
      }

      // Build a simple dedupe key to avoid consecutive identical fetches
      // Do NOT include unitId here — changing unit should NOT trigger a network call.
      // Keep customerRegion so region changes still refetch prices.
      const fetchKey = `${selectedProductCode}::${customerCode || ''}::${vatPercent || 0}::${vatText || ''}::${shouldReloadPrice || 0}::${customerRegion || ''}`;
      if (lastPriceFetchKeyRef.current === fetchKey) {
        // Skip duplicate fetch
        // console.debug('[Price] Skipping duplicate fetch for', fetchKey);
        return;
      }
      // Mark this key as in-flight / last fetched
      lastPriceFetchKeyRef.current = fetchKey;

      // QUAN TRỌNG: Clear giá ngay khi chọn sản phẩm mới (trước khi load giá mới)
      // Để tránh hiển thị giá của sản phẩm trước trong khi đang load giá mới
      // Chỉ clear nếu không đang ở chế độ nhập thủ công với duyệt giá
      if (!(approvePrice && priceEntryMethod === 'Nhập thủ công')) {
        handlePriceChange('');
        setBasePriceForDiscount(0);
      }

      setPriceLoading(true);
      setApiPrice(null); // Reset trước khi load giá mới

      // Lưu productCode hiện tại để kiểm tra sau khi load xong
      const currentProductCode = selectedProductCode;

      try {
        // Determine if this is a VAT order
        const isVatOrder = vatPercent > 0 || (vatText?.toLowerCase().includes('có vat') ?? false);

        // API không cần unitId và isVatOrder - sẽ trả về tất cả giá
        // Pass customerRegion so backend can prefer regional prices (e.g., "Miền Nam")
        const result = await fetchProductPrice(
          selectedProductCode,
          customerCode,
          undefined, // Không truyền unitId
          customerRegion || undefined, // Pass region from parent if available
          undefined  // Không truyền isVatOrder
        );

        // API trả về TẤT CẢ giá cho tất cả đơn vị
        const allPrices = (result as any)?.prices || [];

        // Lấy đơn vị hiện tại để lọc giá.
        // Nếu unit được tạo từ API prices (synthetic unit), ưu tiên dùng `availableUnitsFromPrices`.
        const fromPricesUnit = availableUnitsFromPrices.find((u) => u.crdfd_unitsid === unitId);
        const currentUnit = fromPricesUnit || units.find((u) => u.crdfd_unitsid === unitId);
        const currentUnitName = fromPricesUnit?.crdfd_name || currentUnit?.crdfd_name || unit;
        // Lấy đơn vị chuẩn (crdfd_onvichuan) từ unit đã chọn để map chính xác
        const currentUnitOnvichuan =
          (fromPricesUnit as any)?.crdfd_onvichuan || (currentUnit as any)?.crdfd_onvichuan || undefined;

        // Tìm giá theo khu vực (customerRegion) trước nếu có — ưu tiên chọn giá theo vùng miền khách hàng
        let selectedPrice: any = null;
        if (allPrices.length > 0 && (customerRegion || '').trim() !== '') {
          try {
            const regionNorm = normalizeText(customerRegion || '');
            // Exact match (normalized)
            selectedPrice = allPrices.find((p: any) => {
              const pg = (p.priceGroupText || p.crdfd_nhomoituongtext || '') as string;
              return normalizeText(pg) === regionNorm;
            });

            // Exact "<region> Không VAT"
            if (!selectedPrice) {
              selectedPrice = allPrices.find((p: any) => {
                const pg = (p.priceGroupText || p.crdfd_nhomoituongtext || '') as string;
                return normalizeText(pg) === `${regionNorm} không vat`;
              });
            }

            // Loose substring match (no diacritics)
            if (!selectedPrice) {
              selectedPrice = allPrices.find((p: any) => {
                const pg = (p.priceGroupText || p.crdfd_nhomoituongtext || '') as string;
                return normalizeText(pg).includes(regionNorm);
              });
            }
          } catch (e) {
            // ignore and continue to unit-based selection
            selectedPrice = null;
          }
        }

        // Tìm giá theo đơn vị đã chọn (nếu có)
        // Ưu tiên map theo unitName từ API (đã được lấy từ crdfd_onvi lookup)
        // Sau đó mới map theo crdfd_onvichuan
        // Build list of available units based on prices returned by API.
        // Strategy:
        // 1) Extract unit names from API prices (prefer crdfd_onvichuan, fallback to unitName)
        // 2) Try to find matching real `units` entries by normalized `crdfd_onvichuan` or `crdfd_name`
        // 3) If no real unit found, create a synthetic unit entry so the dropdown still shows the option
        const unitsFromPrices: any[] = [];
        const seenUnitNames = new Set<string>();
        for (const p of allPrices) {
          const rawName = (p.crdfd_onvichuan || p.unitName || '').trim();
          if (!rawName) continue;
          const normName = normalizeText(rawName);
          if (seenUnitNames.has(normName)) continue;
          seenUnitNames.add(normName);

          // Always create a unit entry from the price payload itself (do NOT mix with CRM `units`).
          // This ensures dropdown shows exactly the units returned by `prices` (e.g., "Bịch 1000 con", "Kg").
          unitsFromPrices.push({
            crdfd_unitsid: `price-unit-${normName}`,
            crdfd_name: rawName,
            crdfd_onvichuan: rawName,
          });
        }
        setAvailableUnitsFromPrices(unitsFromPrices);
        // Save API prices and selected price for other UI (SL theo kho) to consume
        setPricesFromApi(allPrices);
        if (!selectedPrice && allPrices.length > 0 && currentUnitName) {
          // Bước 1: Tìm theo unitName từ API (đã được lấy từ crdfd_onvi lookup) - chính xác nhất
          selectedPrice = allPrices.find((p: any) => {
            if (!p.unitName) return false;
            // So sánh không phân biệt hoa thường và normalize
            const apiUnitName = normalizeText(p.unitName);
            const selectedUnitName = normalizeText(currentUnitName);
            return apiUnitName === selectedUnitName;
          });

          // Bước 2: Nếu không tìm thấy theo unitName, thử tìm theo crdfd_onvichuan
          if (!selectedPrice && currentUnitOnvichuan) {
            selectedPrice = allPrices.find((p: any) => {
              if (!p.crdfd_onvichuan) return false;
              const apiOnvichuan = normalizeText(p.crdfd_onvichuan);
              const selectedOnvichuan = normalizeText(currentUnitOnvichuan);
              return apiOnvichuan === selectedOnvichuan;
            });
          }
        }

        // Nếu không tìm thấy giá theo đơn vị đã chọn, lấy giá đầu tiên (backward compatibility)
        if (!selectedPrice && allPrices.length > 0) {
          selectedPrice = allPrices[0];
        }
        setSelectedPriceFromApi(selectedPrice || null);

        // Fallback về format cũ nếu API chưa có prices array
        const priceWithVat = selectedPrice?.price ?? result?.price ?? null;
        const priceNoVat = selectedPrice?.priceNoVat ?? (result as any)?.priceNoVat ?? null;
        const finalPrice = selectedPrice?.finalPrice ?? (result as any)?.finalPrice ?? null;
        const discountRate = selectedPrice?.discountRate ?? (result as any)?.discountRate ?? null;
        const apiUnitName = selectedPrice?.unitName ?? result?.unitName ?? undefined;
        const apiPriceGroupText = selectedPrice?.priceGroupText ?? result?.priceGroupText ?? undefined;

        // After building the units list from prices, automatically select the unit
        // based on the canonical `crdfd_onvichuan` value returned in the API if the
        // user hasn't manually chosen a unit.
        if (!userHasManuallySelectedUnitRef.current && unitsFromPrices.length > 0) {
          // Prefer API's unitName first, then crdfd_onvichuan
          const preferredRaw =
            (selectedPrice && (selectedPrice.unitName || selectedPrice.crdfd_onvichuan)) ||
            result?.unitName ||
            (result as any)?.crdfd_onvichuan ||
            '';
          const prefNorm = normalizeText(preferredRaw || '');

          // Try direct match against unitsFromPrices
          let found = null;
          if (prefNorm) {
            found = unitsFromPrices.find((u) => {
              const n1 = normalizeText((u as any)?.crdfd_onvichuan || '');
              const n2 = normalizeText((u as any)?.crdfd_onvichuantext || '');
              const n3 = normalizeText((u as any)?.crdfd_name || '');
              return n1 === prefNorm || n2 === prefNorm || n3 === prefNorm;
            });
          }

          // Fallback: try to find a matching price entry then map to unitsFromPrices
          if (!found && prefNorm && Array.isArray(allPrices)) {
            const matchedPriceEntry = allPrices.find((p: any) => {
              const nA = normalizeText(p.unitName || '');
              const nB = normalizeText(p.crdfd_onvichuan || '');
              return nA === prefNorm || nB === prefNorm;
            });
            if (matchedPriceEntry) {
              const rawName = (matchedPriceEntry.crdfd_onvichuan || matchedPriceEntry.unitName || '').trim();
              const rawNorm = normalizeText(rawName);
              found = unitsFromPrices.find((u) => {
                const n1 = normalizeText((u as any)?.crdfd_onvichuan || '');
                const n2 = normalizeText((u as any)?.crdfd_onvichuantext || '');
                const n3 = normalizeText((u as any)?.crdfd_name || '');
                return n1 === rawNorm || n2 === rawNorm || n3 === rawNorm;
              });
            }
          }

          if (found) {
            try { console.debug('[UnitDebug] setUnitId from unitsFromPrices found ->', found.crdfd_name, found.crdfd_unitsid); } catch(e) {}
            setUnitId(found.crdfd_unitsid);
            setUnit(found.crdfd_name);
            hasSetUnitFromApiRef.current = true;
          }
        }

        // Ưu tiên dùng finalPrice (đã áp dụng discount rate) nếu có
        // Nếu không có finalPrice, fallback về logic cũ
        let basePrice: number | null = null;

        if (finalPrice !== null && finalPrice !== undefined) {
          // Có finalPrice từ API (priceNoVat x discountRate) - ưu tiên dùng
          basePrice = finalPrice;
        } else {
          // Fallback về logic cũ nếu không có finalPrice
          // Chọn giá dựa vào VAT của SO và SẢN PHẨM
          // Logic:
          // 1. SO có VAT + Sản phẩm có VAT → dùng priceNoVat
          // 2. SO có VAT + Sản phẩm không VAT → dùng price
          // 3. SO không VAT + Sản phẩm có VAT → dùng price
          // 4. SO không VAT + Sản phẩm không VAT → dùng price

        // Xác định SO có VAT hay không
          const vatTextLower = (vatText || '').toLowerCase();
          const soIsVat = vatTextLower.includes('có vat') || vatPercent > 0;

          // Xác định sản phẩm có VAT hay không (dựa vào crdfd_gtgt)
          // Tìm sản phẩm từ selectedProduct hoặc từ products list
          const currentProduct = selectedProduct || (selectedProductCode ? products.find((p) => p.crdfd_masanpham === selectedProductCode) : null);
          const productVatOptionValue = currentProduct?.crdfd_gtgt_option ?? currentProduct?.crdfd_gtgt;
          const productVatPercent = productVatOptionValue !== undefined ? VAT_OPTION_MAP[Number(productVatOptionValue)] : undefined;
          const productIsVat = productVatPercent !== undefined && productVatPercent > 0;

          // Áp dụng logic chọn giá (đơn giản hoá để tránh mapping nhầm giữa giá có VAT / không VAT)
          // - Nếu SO có VAT và SP có VAT => dùng priceNoVat (giá chưa VAT)
          // - Các trường hợp khác => dùng priceWithVat (giá từ API hoặc fallback)
          if (soIsVat && productIsVat) {
            // SO có VAT + SP có VAT: ưu tiên dùng giá chưa VAT (priceNoVat)
            basePrice = priceNoVat ?? null;
          } else {
            // Các trường hợp khác dùng priceWithVat (fallback sang result.price nếu cần)
            basePrice = priceWithVat ?? result?.price ?? null;
          }
        }

        // Làm tròn & format giống PowerApps Text(..., "#,###")
        // Round to 2 decimal places to preserve fractional part (cents)
        const roundedBase =
          basePrice !== null && basePrice !== undefined
            ? Math.round(Number(basePrice) * 100) / 100
            : null;

        // If API provided finalPrice (already applied customer-specific discount),
        // prefer it for display; but keep roundedBase (pre-final) as canonical base.
        const displayPrice =
          result?.giaFormat ??
          result?.priceFormatted ??
          (finalPrice !== null && finalPrice !== undefined ? Math.round(Number(finalPrice) * 100) / 100 : roundedBase);

        const priceStr = normalizePriceInput(displayPrice);

        // QUAN TRỌNG: Kiểm tra xem sản phẩm có còn là sản phẩm hiện tại không
        // Nếu user đã chọn sản phẩm khác trong khi đang load giá, không set giá này vào
        if (currentProductCode !== selectedProductCode) {
          return; // Không set giá nếu sản phẩm đã thay đổi
        }

        // Lưu giá từ API để check warning (dù có set vào input hay không)
        if (roundedBase !== null && roundedBase !== undefined && roundedBase > 0) {
          setApiPrice(roundedBase);
        } else {
          setApiPrice(null);
        }

        if (priceStr !== '' && roundedBase !== null && roundedBase > 0) {
          // Lưu basePrice để tính chiết khấu
          // Prefer original price (priceNoVat or priceWithVat) as base for client-side promotions.
          const baseForDiscount = (priceNoVat ?? priceWithVat ?? finalPrice ?? roundedBase);
          const roundedBasePrice = Math.round(Number(baseForDiscount) * 100) / 100;
          console.log('💵 Setting basePriceForDiscount:', roundedBasePrice);
          setBasePriceForDiscount(roundedBasePrice);
          // Set giá từ API, trừ khi đang ở chế độ "Theo chiết khấu" và đã bật "Duyệt giá"
          // (trong trường hợp đó, giá sẽ được tính từ chiết khấu)
          if (priceEntryMethod !== 'Theo chiết khấu' || !approvePrice) {
            handlePriceChange(priceStr);
          }
        } else {
          // API trả về null hoặc giá = 0 - clear giá cũ nếu không đang ở chế độ nhập thủ công với duyệt giá
          // Nếu đang nhập thủ công và đã bật duyệt giá, giữ giá cũ (người dùng đang nhập)
          if (!(approvePrice && priceEntryMethod === 'Nhập thủ công')) {
            handlePriceChange('');
            setBasePriceForDiscount(0);
          }
        }
        setPriceGroupText(
          apiPriceGroupText ||
          result?.priceGroupText ||
          result?.priceGroupName ||
          result?.priceGroup ||
          ''
        );
      } catch (error) {
        console.error('Error loading price:', error);
        // Giữ giá cũ nếu có lỗi, không clear
      } finally {
        setPriceLoading(false);
      }
    };

    loadPrice();
  }, [selectedProductCode, product, customerCode, vatPercent, vatText, shouldReloadPrice, customerRegion]);

  // Update selectedPriceFromApi when user changes selected unit or when API prices change
  useEffect(() => {
    if (!unitId) {
      setSelectedPriceFromApi(null);
      return;
    }

    // Try to get unit name from availableUnitsFromPrices (units created from API prices)
    const fromPricesUnit = availableUnitsFromPrices.find((u) => u.crdfd_unitsid === unitId);
    let selectedUnitRawName = fromPricesUnit?.crdfd_name;

    // Fallback to CRM units list
    if (!selectedUnitRawName) {
      const fromUnits = units.find((u) => u.crdfd_unitsid === unitId);
      selectedUnitRawName = fromUnits?.crdfd_name || fromUnits?.crdfd_onvichuantext || fromUnits?.crdfd_onvichuan;
    }

    if (!selectedUnitRawName) {
      setSelectedPriceFromApi(null);
      return;
    }

    const prefNorm = normalizeText(selectedUnitRawName);
    const matched = (pricesFromApi || []).find((p: any) => {
      const n1 = normalizeText(p.unitName || '');
      const n2 = normalizeText(p.crdfd_onvichuan || '');
      return n1 === prefNorm || n2 === prefNorm;
    });

    setSelectedPriceFromApi(matched || null);
  }, [unitId, pricesFromApi, availableUnitsFromPrices, units]);
 
  // When user explicitly changes unit (userSelectedUnitRef), apply selectedPriceFromApi to UI price
  useEffect(() => {
    if (!selectedPriceFromApi) return;

    // Only react when user explicitly selected a unit
    if (!userSelectedUnitRef.current) return;

    try {
      // Prefer finalPrice from API (already applied customer-specific discounts) when available.
      const finalVal = selectedPriceFromApi.finalPrice ?? selectedPriceFromApi.final_price ?? null;
      const priceVal = selectedPriceFromApi.price ?? selectedPriceFromApi.crdfd_gia ?? selectedPriceFromApi.crdfd_giatheovc ?? null;
      const priceNoVatVal = selectedPriceFromApi.priceNoVat ?? selectedPriceFromApi.cr1bb_giakhongvat ?? null;

      let chosen: number | null = null;
      if (finalVal !== null && finalVal !== undefined) {
        chosen = Number(finalVal);
      } else {
        // Determine which price to use based on SO VAT (fallback behavior)
        const useNoVat = isVatSo; // if SO has VAT, prefer priceNoVat when available
        if (useNoVat && priceNoVatVal !== null && priceNoVatVal !== undefined) {
          chosen = Number(priceNoVatVal);
        } else if (priceVal !== null && priceVal !== undefined) {
          chosen = Number(priceVal);
        } else if (priceNoVatVal !== null && priceNoVatVal !== undefined) {
          chosen = Number(priceNoVatVal);
        }
      }

      if (chosen !== null && !isNaN(chosen)) {
        const rounded = Math.round(chosen * 100) / 100;
        setApiPrice(rounded);
        handlePriceChange(String(rounded));
        setPriceGroupText(selectedPriceFromApi.priceGroupText || selectedPriceFromApi.crdfd_nhomoituongtext || '');
      }
    } finally {
      // Reset user selection flag after applying
      userSelectedUnitRef.current = false;
      userHasManuallySelectedUnitRef.current = false;
    }
  }, [selectedPriceFromApi, unitId, isVatSo]);

  // Fetch promotions based on product code and customer code
  useEffect(() => {
    const loadPromotions = async () => {
      if (!selectedProductCode || !customerCode) {
        setPromotions([]);
        setSelectedPromotionId('');
        return;
      }

      setPromotionLoading(true);
      setPromotionError(null);
      try {
        // Extract region from customerName if available
        // Format: "... - Miền Trung" or "... - Miền Nam"
        let region: string | undefined = undefined;
        if (customerName) {
          const customerNameLower = customerName.toLowerCase();
          if (customerNameLower.includes('miền trung')) {
            region = 'Miền Trung';
          } else if (customerNameLower.includes('miền nam')) {
            region = 'Miền Nam';
          }
        }

        const data = await fetchProductPromotions(selectedProductCode, customerCode, region, String(paymentTerms || ''));

        // Filter promotions dựa trên saleInventoryOnly và loại đơn hàng
        // Nếu saleInventoryOnly = true → chỉ áp dụng cho đơn Không VAT
        const vatTextLower = (vatText || '').toLowerCase();
        const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;
        const filteredPromotions = data.filter((promo) => {
          const saleInventoryOnly = promo.saleInventoryOnly;
          // Kiểm tra saleInventoryOnly: có thể là boolean true, string "true", hoặc số 1
          const isSaleInventoryOnly = saleInventoryOnly === true ||
            saleInventoryOnly === 'true' ||
            saleInventoryOnly === 1 ||
            saleInventoryOnly === '1';
          // Nếu saleInventoryOnly = true và đơn là VAT → loại bỏ
          if (isSaleInventoryOnly && isVatOrder) {
            return false;
          }
          // Các trường hợp khác: giữ lại
          return true;
        });

        setPromotions(filteredPromotions);
        // Auto-select the first promotion returned (PowerApps First(ListPromotion))
        const firstId = normalizePromotionId(filteredPromotions[0]?.id);
        setSelectedPromotionId(firstId);
      } catch (err: any) {
        console.error('Error loading promotions:', err);
        setPromotionError('Không tải được khuyến mãi');
        setPromotions([]);
        setSelectedPromotionId('');
      } finally {
        setPromotionLoading(false);
      }
    };

    loadPromotions();
  }, [selectedProductCode, customerCode, vatText, vatPercent]);

  // Ensure a promotion is always selected when data is available
  useEffect(() => {
    if (promotions.length === 0) return;
    const prevNorm = normalizePromotionId(selectedPromotionId);
    const exists = prevNorm !== '' && promotions.some((promo) => normalizePromotionId(promo.id) === prevNorm);
    if (!exists) {
      const firstId = normalizePromotionId(promotions[0]?.id);
      if (firstId) {
        setSelectedPromotionId(firstId);
        try { if (setPromotionId) setPromotionId(firstId); } catch (err) { /* ignore */ }
      }
    }
  }, [promotions]);

  // Sync external prop `promotionId` into local selectedPromotionId and notify parent when promotions auto-select
  useEffect(() => {
    if (promotionId && normalizePromotionId(promotionId) !== normalizePromotionId(selectedPromotionId)) {
      setSelectedPromotionId(normalizePromotionId(promotionId));
    } else if (!promotionId && promotions.length > 0 && selectedPromotionId === '') {
      // If parent didn't provide promotionId but we auto-selected the first promotion, inform parent
      const firstId = normalizePromotionId(promotions[0]?.id);
      if (firstId && setPromotionId) {
        setPromotionId(firstId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotionId, promotions]);

  const effectivePromotionId = normalizePromotionId(
    selectedPromotionId || normalizePromotionId(promotions[0]?.id)
  );
  const selectedPromotion = promotions.find(
    (p) => normalizePromotionId(p.id) === effectivePromotionId
  ) || promotions[0];

  // Tính giá theo chiết khấu khi chọn "Theo chiết khấu"
  // Use `discountPercent` prop (numeric) as source of truth for discount value,
  // allowing parent to provide either selected preset or a custom "Khác" value.
  useEffect(() => {
    console.log('🔄 Discount calculation useEffect triggered:', {
      approvePrice,
      priceEntryMethod,
      discountPercent,
      basePriceForDiscount,
      discountRate
    });

    if (approvePrice && priceEntryMethod === 'Theo chiết khấu' && basePriceForDiscount > 0) {
      const pct = Number(discountPercent) || 0;
      const discountedPrice = basePriceForDiscount - (basePriceForDiscount * pct / 100);
      const roundedPrice = Math.round(discountedPrice * 100) / 100;
      console.log('💰 Calculating discounted price:', {
        basePrice: basePriceForDiscount,
        discountPercent: pct,
        discountedPrice: roundedPrice
      });
      handlePriceChange(String(roundedPrice));
    } else {
      console.log('❌ Discount calculation skipped:', {
        approvePrice,
        priceEntryMethod,
        hasBasePrice: basePriceForDiscount > 0
      });
    }
  }, [approvePrice, priceEntryMethod, discountPercent, basePriceForDiscount, discountRate]);

  // Calculate totals with promotion discount
  const recomputeTotals = (priceValue: string | number, qty: number, promoDiscountPct: number, vatPct: number) => {
    // Use basePriceForDiscount (price from API before API discountRate) when available,
    // so "Giá đã giảm" = basePriceForDiscount × (1 - promoDiscountPct/100).
    const rawPriceNum = (basePriceForDiscount && basePriceForDiscount > 0)
      ? basePriceForDiscount
      : parseFloat(String(priceValue).replace(/,/g, '')) || 0;

    const discountFactor = 1 - (promoDiscountPct > 0 ? promoDiscountPct / 100 : 0);
    let effectivePrice = rawPriceNum * discountFactor;


    const vatTextLower = (vatText || '').toLowerCase();
    const isNonVatOrder = vatTextLower.includes('không vat');
    const effectiveVat = isNonVatOrder ? 0 : vatPct;

    let newSubtotal = qty * effectivePrice;

    const newVat = (newSubtotal * effectiveVat) / 100;
    // Round to 2 decimal places (preserve cents)
    const roundedSubtotal = Math.round(newSubtotal * 100) / 100;
    const roundedVat = Math.round(newVat * 100) / 100;
    const roundedTotal = Math.round((newSubtotal + newVat) * 100) / 100;
    setSubtotal(roundedSubtotal);
    setVatAmount(roundedVat);
    setTotalAmount(roundedTotal);
  };

  // Calculate subtotal when quantity or price changes
  const handleQuantityChange = (value: number | null) => {
    const next = value && value > 0 ? value : 0;
    setQuantity(next);
    recomputeTotals(price, next, discountPercent || promotionDiscountPercent, vatPercent);
  };

  // Format price for display with thousand separators
  const formatPriceForDisplay = (priceValue: string): string => {
    if (!priceValue || priceValue.trim() === '') return '';
    const numValue = Number(priceValue.replace(/,/g, ''));
    if (isNaN(numValue) || numValue === 0) return '';
    return numValue.toLocaleString('vi-VN');
  };

  const handlePriceChange = (value: string) => {
    // Remove all non-numeric characters (including thousand separators) for internal storage, but keep decimal point
    // Allow only one decimal point
    let cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    setPrice(cleaned);
    recomputeTotals(cleaned, quantity, discountPercent || promotionDiscountPercent, vatPercent);
  };

  const handleVatChange = (value: number) => {
    setVatPercent(value);
    recomputeTotals(price, quantity, discountPercent || promotionDiscountPercent, value);
  };

  const handleAddWithInventoryCheck = async () => {
    // Ngăn bấm liên tục
    if (isProcessingAdd || isAdding) {
      return;
    }

    // Kiểm tra: Đơn SO có VAT không được thêm sản phẩm không VAT
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;
    if (isVatOrder && selectedProduct) {
      const vatOptionValue = selectedProduct?.crdfd_gtgt_option ?? selectedProduct?.crdfd_gtgt;
      const productVatPercent = vatOptionValue !== undefined ? VAT_OPTION_MAP[Number(vatOptionValue)] : undefined;
      const productVatIsZero = productVatPercent === 0 || productVatPercent === undefined;

      if (productVatIsZero) {
        showToast.error('Đơn SO có VAT không được thêm sản phẩm không VAT');
        return;
      }
    }

    setIsProcessingAdd(true);
    try {
      const ok = await checkInventoryBeforeAction();
      if (!ok) {
        setIsProcessingAdd(false);
        return;
      }

      // Reserve inventory trước khi add sản phẩm vào đơn nháp
      // Chỉ thực hiện nếu không bị disable (SOBG sẽ disable)
      // Sử dụng baseQuantity (theo đơn vị chuẩn) để reserve
      if (!disableInventoryReserve && selectedProductCode && warehouse && quantity > 0) {
        try {
          const vatTextLower = (vatText || '').toLowerCase();
          const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;
          const baseQuantity = getRequestedBaseQuantity(); // Số lượng theo đơn vị chuẩn

          // Reserve cho cả VAT và non-VAT orders
          // VAT orders: Kho Bình Định có trường ReservedQuantity (cr1bb_soluonganggiuathang)
          // Non-VAT orders: Inventory Weshops có trường ReservedQuantity (cr1bb_soluonglythuyetgiuathang)
          const { updateInventory } = await import('../_api/adminApi');
          const isSpecialProduct = shouldBypassInventoryCheck;
          const skipStockCheck = isVatOrder || isSpecialProduct; // Bỏ qua kiểm tra tồn kho cho đơn VAT và sản phẩm đặc biệt

          await updateInventory({
            productCode: selectedProductCode,
            quantity: baseQuantity, // Sử dụng baseQuantity
            warehouseName: warehouse,
            operation: 'reserve', // Reserve thay vì subtract
            isVatOrder: isVatOrder,
            skipStockCheck: skipStockCheck,
            productGroupCode: selectedProductGroupCode, // Truyền mã nhóm SP để API kiểm tra
          });

          // Reload inventory để cập nhật số lượng đang giữ
          await new Promise(resolve => setTimeout(resolve, 300));
          await loadInventory();
        } catch (error: any) {
          showToast.error(error.message || 'Không thể giữ tồn kho. Vui lòng thử lại.');
          setIsProcessingAdd(false);
          return; // Không add sản phẩm nếu reserve thất bại
        }
      }

      // Ensure parent has current promotionId before adding product
      try {
        const currentPromoId = normalizePromotionId(selectedPromotionId || normalizePromotionId(promotions[0]?.id));
        if (currentPromoId) {
          console.debug('[ProductEntryForm] syncing promotionId to parent before add:', currentPromoId);
          if (setPromotionId) setPromotionId(currentPromoId);
        } else {
          console.debug('[ProductEntryForm] no promotionId to sync before add');
        }
      } catch (err) { /* ignore */ }

      // Compute promotion discount values directly from the selected promotion to avoid stale state.
      const currentPromoId = normalizePromotionId(selectedPromotionId || normalizePromotionId(promotions[0]?.id));
      let computedDiscountPercent = 0;
      let computedDiscountAmount = 0;
      try {
        const sel = selectedPromotion || promotions[0];
        if (sel) {
          computedDiscountPercent = derivePromotionPercent(sel);
          // If promotion is VND-based, compute money value based on VAT context
          const vatTextLower = (vatText || '').toLowerCase();
          const isVatOrderForPromo = vatTextLower.includes('có vat') || vatPercent > 0;
          const moneyCandidates = isVatOrderForPromo
            ? [sel.valueWithVat, sel.value, sel.value2, sel.value3, sel.valueBuyTogether]
            : [sel.valueNoVat, sel.valueWithVat, sel.value, sel.value2, sel.value3, sel.valueBuyTogether];
          for (const c of moneyCandidates) {
            const num = Number(c);
            if (!isNaN(num) && num > 0) {
              computedDiscountAmount = num;
              break;
            }
          }
          // If percent was derived (non-zero), zero out money value to avoid double-applying
          if (computedDiscountPercent > 0) {
            computedDiscountAmount = 0;
          }
        }
      } catch (err) {
        // fallback to existing local state if any error
        computedDiscountPercent = promotionDiscountPercent;
        computedDiscountAmount = discountAmount;
      }

      console.debug('[ProductEntryForm] calling onAdd with promotionId:', currentPromoId, 'computedPct:', computedDiscountPercent, 'computedAmt:', computedDiscountAmount);
      onAdd({
        promotionId: currentPromoId,
        discountPercent: computedDiscountPercent,
        discountAmount: computedDiscountAmount,
        discountRate: selectedPriceFromApi?.discountRate,
      });

      // After add, if product is still selected (selectedProductCode not reset), reload price
      // Use setTimeout to ensure form reset completes first
      setTimeout(() => {
        // If selectedProductCode still exists after add, reload price
        // This handles the case where form resets price but product selection remains
        if (selectedProductCode) {
          setShouldReloadPrice(prev => prev + 1); // Trigger reload
        }
      }, 150);
    } finally {
      // Reset flag sau khi tất cả operations hoàn tất
      setTimeout(() => {
        setIsProcessingAdd(false);
      }, 500);
    }
  };

  const handleSaveWithInventoryCheck = async () => {
    // BỎ KIỂM TRA VALIDATE CÁC TRƯỜNG TRONG "THÔNG TIN SẢN PHẨM"
    // Chỉ gọi onSave() trực tiếp - validation sẽ được thực hiện ở handleSave của parent component
    // (chỉ check danh sách sản phẩm mới chưa lưu SOD)
    onSave();
  };

  const handleResetAllWithConfirm = () => {
    const ok = window.confirm(
      'Reset sẽ xoá Khách hàng, SO và danh sách sản phẩm hiện tại. Bạn chắc chắn muốn Reset?'
    );
    if (!ok) return;
    onRefresh();
  };

  // Derive promotion discount percent from selected promotion
  const derivePromotionPercent = (promo?: Promotion | null) => {
    if (!promo) return 0;

    // Nếu khuyến mãi chỉ áp dụng cho đơn Không VAT (saleInventoryOnly = true)
    // thì bỏ qua khi đơn hiện tại là Có VAT
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;
    const saleInventoryOnly = promo.saleInventoryOnly;
    // Kiểm tra saleInventoryOnly: có thể là boolean true, string "true", hoặc số 1
    const isSaleInventoryOnly = saleInventoryOnly === true ||
      saleInventoryOnly === 'true' ||
      saleInventoryOnly === 1 ||
      saleInventoryOnly === '1';
    if (isSaleInventoryOnly && isVatOrder) {
      return 0;
    }

    // Ưu tiên lấy giá trị promotion theo loại đơn hàng:
    // - SO có VAT: ưu tiên crdfd_value_co_vat (valueWithVat)
    // - SO không VAT: ưu tiên crdfd_value_khong_vat (valueNoVat)
    let candidates: (number | string | null | undefined)[];
    if (isVatOrder) {
      // SO có VAT: ưu tiên valueWithVat trước
      candidates = [
        promo.valueWithVat,  // crdfd_value_co_vat - ưu tiên cho SO có VAT
        promo.valueNoVat,    // crdfd_value_khong_vat - fallback
        promo.value,
        promo.value2,
        promo.value3,
        promo.valueBuyTogether,
      ];
    } else {
      // SO không VAT: ưu tiên valueNoVat trước
      candidates = [
        promo.valueNoVat,    // crdfd_value_khong_vat - ưu tiên cho SO không VAT
        promo.valueWithVat,   // crdfd_value_co_vat - fallback
        promo.value,
        promo.value2,
        promo.value3,
        promo.valueBuyTogether,
      ];
    }

    for (const c of candidates) {
      const num = Number(c);
      if (isNaN(num)) continue;
      if (num > 0 && num < 0.05) {
        // Very small fraction -> percent with one decimal (0.027 -> 2.7)
        return Math.round(num * 1000) / 10;
      }
      if (num > 0 && num <= 1) {
        // Larger decimal likely percent-with-decimals (0.94 -> 0.94)
        return Math.round(num * 100) / 100;
      }
      if (num > 0) {
        // Percent-like value (>1), keep one decimal
        return Math.round(num * 10) / 10;
      }
    }
    return 0;
  };

  // Sync discount percent from promotion selection
  useEffect(() => {
    // KHI DUYỆT GIÁ: Không áp dụng chiết khấu từ promotion (chiết khấu 1 = 0)
    // Nhưng vẫn cho phép chiết khấu thủ công nếu đang dùng phương thức "Theo chiết khấu"
    if (approvePrice && priceEntryMethod !== 'Theo chiết khấu') {
      setPromotionDiscountPercent(0);
      setDiscountPercent(0);
      setPromotionText('');
      recomputeTotals(price, quantity, 0, vatPercent);
      return;
    }

    // Khi không duyệt giá: Áp dụng chiết khấu từ promotion bình thường
    const selected = promotions.find(
      (p) => normalizePromotionId(p.id) === normalizePromotionId(selectedPromotionId || normalizePromotionId(promotions[0]?.id))
    );
    // If selected promotion requires a minimum order total, enforce it.
    // Use effectiveTotal = current orderTotal + this line's totalAmount (includes VAT)
    // so editing quantity or VAT updates applicability immediately.
    if (selected) {
      const minTotal = Number(selected.totalAmountCondition || 0) || 0;
      const effectiveTotal = Number(orderTotal || 0) + Number(totalAmount || 0);
      if (minTotal > 0 && effectiveTotal < minTotal) {
        setPromotionDiscountPercent(0);
        // Không reset discountPercent nếu đang dùng "Theo chiết khấu" với duyệt giá
        if (!(approvePrice && priceEntryMethod === 'Theo chiết khấu')) {
          setDiscountPercent(0);
        }
        setPromotionText(selected?.name || '');
        setPromotionWarning(`Chương trình yêu cầu tổng đơn tối thiểu ${minTotal.toLocaleString('vi-VN')} đ`);
        recomputeTotals(price, quantity, 0, vatPercent);
        return;
      }
    }

    // If selected promotion is marked not applicable, do not apply its discount and show inline warning
    if (selected && selected.applicable === false) {
      setPromotionDiscountPercent(0);
      // Không reset discountPercent nếu đang dùng "Theo chiết khấu" với duyệt giá
      if (!(approvePrice && priceEntryMethod === 'Theo chiết khấu')) {
        setDiscountPercent(0);
      }
      setPromotionText(selected?.name || '');
      // Build friendly labels for both promotion requirement and order payment term
      const promoReqLabel = getPaymentTermLabelClient(selected?.paymentTermsNormalized || selected?.paymentTerms);
      const orderTermLabel = getPaymentTermLabelClient(paymentTerms);
      const friendlyMsg = `Cảnh báo: Điều khoản thanh toán không khớp: chương trình yêu cầu "${promoReqLabel}", đơn hàng là "${orderTermLabel}"`;
      setPromotionWarning(friendlyMsg);
      recomputeTotals(price, quantity, 0, vatPercent);
    } else {
      const promoPct = derivePromotionPercent(selected);
      setPromotionDiscountPercent(promoPct);
      // Không override discountPercent nếu đang dùng "Theo chiết khấu" với duyệt giá
      if (!(approvePrice && priceEntryMethod === 'Theo chiết khấu')) {
        setDiscountPercent(promoPct); // propagate to parent state
      }
      setPromotionText(selected?.name || '');
      setPromotionWarning(null);
      recomputeTotals(price, quantity, promoPct || discountPercent, vatPercent);
    }
  }, [selectedPromotionId, promotions, approvePrice, orderTotal, price, quantity, vatPercent]);

  // Check Promotion Order applicability (order-level) for the selected promotion
  useEffect(() => {
    let cancelled = false;
    const checkOrderLevelPromotion = async () => {
      if (!enablePromotionAutoFetch || !soId || !selectedPromotion) {
        setOrderPromotionInfo(null);
        return;
      }
      try {
        const res = await fetchPromotionOrders(
          soId,
          customerCode,
          orderTotal ?? 0,
          selectedProductCode ? [selectedProductCode] : [],
          selectedProductGroupCode ? [selectedProductGroupCode] : [],
          String(paymentTerms || '')
        );
        const available = (res && res.availablePromotions) ? res.availablePromotions : (res && res.allPromotions ? res.allPromotions : []);
        const matched = (available || []).find((p: any) => normalizePromotionId(p.id) === normalizePromotionId(selectedPromotion.id));
        if (matched && !cancelled) {
          const vndOrPercent = (matched.vndOrPercent || '').toString();
          const val = Number(matched.value) || 0;
          const ch2 = String(matched.chietKhau2) === '191920001' || String(matched.chietKhau2) === 'true' || String(matched.chietKhau2) === '1';
          setOrderPromotionInfo({ vndOrPercent, value: val, chietKhau2: ch2 });
        } else if (!cancelled) {
          setOrderPromotionInfo(null);
        }
      } catch (err) {
        console.warn('[Promotion Order] check failed', err);
        // Do not change existing state on error
      }
    };
    checkOrderLevelPromotion();
    return () => { cancelled = true; };
  }, [soId, customerCode, orderTotal, selectedPromotionId, selectedProductCode, selectedProductGroupCode]);

  // Recompute totals when discount percent changes elsewhere
  useEffect(() => {
    recomputeTotals(price, quantity, discountPercent || promotionDiscountPercent, vatPercent);
  }, [discountPercent]);

  // Force VAT = 0 for Non-VAT orders even if product VAT > 0
  useEffect(() => {
    const vatTextLower = (vatText || '').toLowerCase();
    const isNonVatOrder = vatTextLower.includes('không vat');
    if (isNonVatOrder && vatPercent !== 0) {
      setVatPercent(0);
    }
  }, [vatText, vatPercent]);

  // Hiển thị label dựa trên VAT của sản phẩm (crdfd_gtgt), không phải VAT của SO
  // Tìm sản phẩm từ selectedProduct hoặc từ products list nếu chưa có
  const currentProduct = selectedProduct ||
    (productCode ? products.find((p) => p.crdfd_masanpham === productCode) : null);
  const productVatOptionValue = currentProduct?.crdfd_gtgt_option ?? currentProduct?.crdfd_gtgt;
  const productVatPercent = productVatOptionValue !== undefined ? VAT_OPTION_MAP[Number(productVatOptionValue)] : undefined;
  const productLabel = (productVatPercent === 0 || productVatPercent === undefined)
    ? 'Sản phẩm không VAT'
    : 'Sản phẩm có VAT';

  const formatDate = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  // Auto-calculate deliveryDate similar to ngay_giao logic (simplified)
  useEffect(() => {
    // Only calculate if we have essential data: selected product, basic customer info, and inventory is not loading
    if (!selectedProduct || !customerId || inventoryLoading) {
      return;
    }

    // Compute delivery date following canvas logic:
    // 1) Promotion lead time (promotion lead * 12 hours) when applicable
    // 2) If customer is Shop -> district leadtime * 12 hours (we approximate using customerIndustry or name)
    // 3) If requestedQty * conversion > theoreticalStock -> Today + productLeadtime (days)
    // 4) Default Today + 1 day
    try {
      const promo = selectedPromotion as any;
      const promoLeadRaw =
        promo?.cr1bb_leadtimepromotion ??
        promo?.leadtime ??
        promo?.leadTime ??
        promo?.lead_time ??
        promo?.value; // fallback - some APIs embed numeric in value

      const promoRecord = {
        cr1bb_leadtimepromotion: promoLeadRaw,
        cr1bb_phanloaichuongtrinh: (promo as any)?.phânLoai || (promo as any)?.type || undefined,
      };

      // Determine varNganhNghe ("Shop" or other)
      let varNganhNghe: string | undefined = undefined;
      // Common heuristic: customerIndustry option value may indicate Shop (value 5 in PowerApps canvas),
      // also fallback to customerName containing 'shop'
      if (typeof customerIndustry === 'number') {
        // If option-set uses small integers for industry, check for 5 (Shop) or specific known code 191920004
        if (customerIndustry === 5 || customerIndustry === 191920004) {
          varNganhNghe = 'Shop';
        }
      }
      if (!varNganhNghe && customerName && String(customerName).toLowerCase().includes('shop')) {
        varNganhNghe = 'Shop';
      }

      // product lead time (days) - try common fields from selectedProduct
      const productLeadTime =
        Number((selectedProduct as any)?.crdfd_leadtime) ||
        Number((selectedProduct as any)?.leadtime) ||
        Number((selectedProduct as any)?.leadTime) ||
        Number((selectedProduct as any)?.cr1bb_leadtime) ||
        0;

      // unit conversion factor
      const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
      const conversionFactor =
        (currentUnit as any)?.crdfd_giatrichuyenoi ??
        (currentUnit as any)?.crdfd_giatrichuyendoi ??
        (currentUnit as any)?.crdfd_conversionvalue ??
        1;


      const computed = computeDeliveryDate({
        // New parameters (2025)
        warehouseCode: warehouseCode,
        orderCreatedOn: new Date().toISOString(), // Current time as order creation time
        districtLeadtime: districtLeadtime,

        // Legacy parameters (keep for backward compatibility)
        promotion: promoRecord,
        varNganhNghe: varNganhNghe ?? undefined,
        var_leadtime_quanhuyen: districtLeadtime,
        var_input_soluong: quantity || 0,
        var_selected_donvi_conversion: Number(conversionFactor) || 1,
        var_selected_SP_tonkho: inventoryTheoretical ?? 0,
        var_selected_SP_leadtime: productLeadTime || 0,
      });

      const formattedDate = formatDate(computed);

      setDeliveryDate(formattedDate);
    } catch (e) {
      console.error('❌ [ProductEntryForm] Error calculating delivery date, using fallback:', e);
      // fallback: simple logic
      const today = new Date();
      const daysToAdd = (quantity || 0) > (stockQuantity || 0) ? 2 : 1;
      const t = new Date(today);
      t.setDate(today.getDate() + daysToAdd);
      const fallbackDate = formatDate(t);

      setDeliveryDate(fallbackDate);
    }
  }, [selectedPromotionId, promotions, selectedPromotion, customerIndustry, customerName, quantity, unitId, units, inventoryTheoretical, selectedProduct, stockQuantity, districtLeadtime, inventoryLoading, warehouse]);


  // Fetch district leadtime when customer district key changes
  useEffect(() => {

    const fetchDistrictLeadtime = async () => {
    try {
      let result;
      // Prefer fetching by customerId when available (more reliable)
      if (customerId && customerId.trim() !== '') {
        result = await getDistrictLeadtime(customerId);
      } else if (customerDistrictKey && customerDistrictKey.trim() !== '') {
        result = await getDistrictLeadtime({ keyAuto: customerDistrictKey } as any);
      } else {
        // Fallback: try extract district name from customerName
        // Examples: "CT - CH Huyền (Cờ Đỏ)" -> "Cờ Đỏ"
        //           "Công ty ABC - Quận 1" -> "Quận 1"
        let districtNameFromCustomer = undefined;

        console.log('🔍 [District Leadtime] Attempting to extract district name from:', customerName);

        if (customerName) {
          const customerNameStr = String(customerName).trim();

          // Try pattern: (district name) - e.g. "(Cờ Đỏ)", "(Quận 1)"
          const bracketMatch = customerNameStr.match(/\\(([^)]+)\\)/);
          if (bracketMatch && bracketMatch[1]) {
            districtNameFromCustomer = bracketMatch[1].trim();
          } else {
            // Try pattern: split by '-' and take last meaningful part
            const parts = customerNameStr.split('-').map(p => p.trim()).filter(p => p.length > 0);
            if (parts.length > 1) {
              const lastPart = parts[parts.length - 1];
              // Check if last part looks like a district name (contains quận/huyện/thị xã)
              if (lastPart.match(/(quận|huyện|thị xã|thành phố|tp\.?|q\.?)/i)) {
                districtNameFromCustomer = lastPart;
              }
            }
          }
        }

        if (!districtNameFromCustomer) {
          setDistrictLeadtime(2); // Default 2 days = 48 hours
          return;
        }

        result = await getDistrictLeadtime({ name: districtNameFromCustomer } as any);
      }

      setDistrictLeadtime(result.leadtimeTheoCa);
    } catch (error) {
      console.error('❌ [District Leadtime] Error fetching:', error);
      setDistrictLeadtime(0); // Fallback to 0 on error
    }
    };

    fetchDistrictLeadtime();
  }, [customerDistrictKey, customerId]);

  // Keep quantity disabled until product is selected, default to empty (0)
  useEffect(() => {
    if (!hasSelectedProduct) {
      if (quantity !== 0) setQuantity(0);
      return;
    }
    // Don't auto-set quantity when product is selected, let user input
  }, [hasSelectedProduct, quantity, setQuantity]);

  // Reset internal states when product is cleared, SO changes, or customer changes
  useEffect(() => {
    // Reset when productCode is cleared (after add or manual clear)
    if (!productCode || productCode === '') {
      setProductId('');
      setSelectedProductCode(undefined);
      setSelectedProduct(null);
      setUnitId('');
      setInventoryTheoretical(0);
      setBypassWarningMessage(''); // Reset cảnh báo
      setInventoryInventoryMessage(''); // Reset
      setKhoBinhDinhMessage(''); // Reset
      setIsUsingInventory(false); // Reset
      hasSetUnitFromApiRef.current = false; // Reset flag khi clear sản phẩm
      userSelectedUnitRef.current = false; // Reset flag khi clear sản phẩm
      setInventoryMessage('Chọn sản phẩm và kho để xem tồn kho');
      setInventoryColor(undefined);
      setAccountingStock(null);
      setPromotions([]);
      setSelectedPromotionId('');
      setPromotionError(null);
      setPriceGroupText('');
      setPriceEntryMethod('Nhập thủ công');
      setDiscountRate('1');
      setBasePriceForDiscount(0);
      setPromotionDiscountPercent(0);
      setApiPrice(null);
      setShouldReloadPrice(0);
      setProductSearch('');
    }
  }, [productCode]);

  // Reset internal states when SO changes
  useEffect(() => {
    if (soId) {
      // When SO changes, clear product-related states
      setProductId('');
      setSelectedProductCode(undefined);
      setSelectedProduct(null);
      setUnitId('');
      setWarehouseId('');
      setInventoryTheoretical(0);
      setBypassWarningMessage(''); // Reset cảnh báo
      setInventoryInventoryMessage(''); // Reset
      setKhoBinhDinhMessage(''); // Reset
      setIsUsingInventory(false); // Reset
      hasSetUnitFromApiRef.current = false; // Reset flag khi SO thay đổi
      setInventoryMessage('Chọn sản phẩm và kho để xem tồn kho');
      setInventoryColor(undefined);
      setAccountingStock(null);
      setPromotions([]);
      setSelectedPromotionId('');
      setPromotionError(null);
      setPriceGroupText('');
      setPriceEntryMethod('Nhập thủ công');
      setDiscountRate('1');
      setBasePriceForDiscount(0);
      setPromotionDiscountPercent(0);
      setApiPrice(null);
      setShouldReloadPrice(0);
      setProductSearch('');
    }
  }, [soId]);

  // Reset internal states when customer changes
  useEffect(() => {
    if (customerId) {
      // When customer changes, clear product-related states
      setProductId('');
      setSelectedProductCode(undefined);
      setSelectedProduct(null);
      setUnitId('');
      setWarehouseId('');
      setInventoryTheoretical(0);
      setBypassWarningMessage(''); // Reset cảnh báo
      setInventoryInventoryMessage(''); // Reset
      setKhoBinhDinhMessage(''); // Reset
      setIsUsingInventory(false); // Reset
      hasSetUnitFromApiRef.current = false; // Reset flag khi customer thay đổi
      setInventoryMessage('Chọn sản phẩm và kho để xem tồn kho');
      setInventoryColor(undefined);
      setAccountingStock(null);
      setPromotions([]);
      setSelectedPromotionId('');
      setPromotionError(null);
      setPriceGroupText('');
      setPriceEntryMethod('Nhập thủ công');
      setDiscountRate('1');
      setBasePriceForDiscount(0);
      setPromotionDiscountPercent(0);
      setApiPrice(null);
      setShouldReloadPrice(0);
      setProductSearch('');
    }
  }, [customerId]);

  // Reset approval-related fields when approvePrice changes
  useEffect(() => {
    if (!approvePrice) {
      // When "Duyệt giá" is unchecked, reset all approval-related fields
      setApprover('');
      setPriceEntryMethod('Nhập thủ công');
      setDiscountRate('1');
      setBasePriceForDiscount(0);

      // Reset price to API-provided data (apiPrice) when user turns off approval.
      // If apiPrice is not available, clear price input.
      if (apiPrice !== null && apiPrice !== undefined && apiPrice > 0) {
        // Use handlePriceChange to ensure formatting/behavior is consistent
        handlePriceChange(String(apiPrice));
      } else {
        handlePriceChange('');
      }
    } else {
      // KHI BẬT "DUYỆT GIÁ": Chiết khấu 1 = 0 (không tính chiết khấu từ promotion)
      setDiscountPercent(0);
      setPromotionDiscountPercent(0);
      // Recompute totals với chiết khấu = 0
      recomputeTotals(price, quantity, 0, vatPercent);
    }
  }, [approvePrice, setApprover, apiPrice]);

  return (
    <div className="admin-app-card-compact">
      <div className="admin-app-card-title-row" style={{ alignItems: 'center', gap: '12px' }}>
        <h3 className="admin-app-card-title">Thông tin sản phẩm</h3>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className={`admin-app-chip-toggle ${urgentOrder ? 'is-active' : ''} ${isFormDisabled ? 'is-disabled' : ''}`} style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={urgentOrder}
              onChange={(e) => setUrgentOrder(e.target.checked)}
              disabled={isFormDisabled}
            />
            <span>Đơn hàng gấp</span>
          </label>
          <label className={`admin-app-chip-toggle ${approvePrice ? 'is-active' : ''} ${isFormDisabled ? 'is-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={approvePrice}
              onChange={(e) => {
                setApprovePrice(e.target.checked);
                if (!e.target.checked) setApprover('');
              }}
              disabled={isFormDisabled}
            />
            <span>Duyệt giá</span>
          </label>
          {showInlineActions && (
            <div className="admin-app-card-actions-block">
              <div className="admin-app-card-actions">
                <button
                  type="button"
                  className="admin-app-mini-btn admin-app-mini-btn-secondary"
                  onClick={handleResetAllWithConfirm}
                  disabled={isSaving || isAdding || isLoadingDetails}
                  title="Reset toàn bộ form"
                >
                  ↺ Reset
                </button>
                  <button
                    type="button"
                    className="admin-app-mini-btn admin-app-mini-btn-ghost"
                    onClick={() => {
                      if (typeof onOpenSpecialPromotions === 'function') {
                        onOpenSpecialPromotions();
                      } else {
                        showToast.info('Chức năng khuyến mãi đặc biệt chưa sẵn sàng.');
                      }
                    }}
                    disabled={!onOpenSpecialPromotions}
                    title="Khuyến mãi đặc biệt"
                    style={{ marginLeft: 6 }}
                  >
                    🎁
                  </button>
                <button
                  type="button"
                  className="admin-app-mini-btn admin-app-mini-btn-primary"
                  onClick={handleSaveWithInventoryCheck}
                  disabled={isSaving || !hasUnsavedProducts}
                  title={!hasUnsavedProducts ? "Chưa có sản phẩm mới cần lưu" : "Lưu đơn hàng"}
                >
                  {isSaving ? (
                    <>
                      <div className="admin-app-spinner admin-app-spinner-small" style={{ marginRight: '4px' }}></div>
                      Đang lưu...
                    </>
                  ) : (
                    '💾 Lưu'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="admin-app-form-compact">
        {/* Price approval UI moved into Product Entry */}
        {approvePrice && (
          <div className="admin-app-form-row-compact admin-app-form-row-approval" style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <div className="admin-app-field-compact">
              <label className="admin-app-label-inline">Phương thức</label>
              <Dropdown
                options={[
                  { value: 'Nhập thủ công', label: 'Nhập thủ công' },
                  { value: 'Theo chiết khấu', label: 'Theo chiết khấu' },
                ]}
                value={priceEntryMethod}
                onChange={(value) => setPriceEntryMethod(value as 'Nhập thủ công' | 'Theo chiết khấu')}
                placeholder="Chọn phương thức"
                disabled={isFormDisabled}
              />
            </div>

            {priceEntryMethod === 'Theo chiết khấu' && (
              <div className="admin-app-field-compact admin-app-field-discount-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Dropdown
                      options={[
                        ...discountRates.map((rate) => ({ value: rate, label: rate })),
                        { value: 'Khác', label: 'Khác' },
                      ]}
                      value={discountRate}
                      onChange={(value) => {
                        console.log('📊 Dropdown onChange:', { value, discountRate: value });
                        setDiscountRate(value);
                        if (value === 'Khác') {
                          console.log('📊 Setting discountPercent to 0 (Khác selected)');
                          setDiscountPercent(0);
                        } else {
                          const num = Number(value);
                          const finalPercent = isNaN(num) ? 0 : num;
                          console.log('📊 Setting discountPercent to:', finalPercent);
                          setDiscountPercent(finalPercent);
                        }
                      }}
                      placeholder="Chọn tỉ lệ"
                      disabled={isFormDisabled}
                    />
                  </div>
                  {discountRate === 'Khác' && (
                    <div style={{ width: '100px', flex: '0 0 100px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <label
                        className="admin-app-label-inline"
                        style={{ marginBottom: '6px', textAlign: 'left', display: 'block', width: '100%' }}
                      >
                        Chiết khấu (%)
                      </label>
                      <input
                        type="number"
                        className="admin-app-input admin-app-input-compact"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(e) => {
                          const v = e.target.value === '' ? 0 : Number(e.target.value);
                          setDiscountPercent(isNaN(v) ? 0 : v);
                        }}
                        disabled={isFormDisabled}
                        placeholder="Nhập %"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="admin-app-field-compact">
              <label className="admin-app-label-inline">
                Người duyệt
                {approvePrice && <span className="admin-app-required">*</span>}
              </label>
              <Dropdown
                options={approversList.map((name) => ({ value: name, label: name }))}
                value={approver}
                onChange={(value) => setApprover(value)}
                placeholder="Chọn người duyệt"
                disabled={isFormDisabled}
              />
              {approvePrice && !approver && (
                <div className="admin-app-error-inline">Vui lòng chọn người duyệt</div>
              )}
            </div>
          </div>
        )}
        {/* Row 1: Product, Unit, Warehouse, Delivery Date */}
        <div className="admin-app-form-row-compact admin-app-product-row-1">
          <div className="admin-app-field-compact admin-app-field-product">
            <label className="admin-app-label-inline">{productLabel}</label>
            <Dropdown
              options={products.map((p) => {
                const code = p.crdfd_masanpham || '';
                return {
                  value: p.crdfd_productsid,
                  label: p.crdfd_name || p.crdfd_fullname || '',
                  dropdownTooltip: code ? `Mã SP: ${code}` : undefined,
                  dropdownMetaText: code || undefined,
                  dropdownCopyText: code || undefined,
                  ...p,
                };
              })}
              value={productId}
              onChange={(value, option) => {
                setProductId(value);
                setProduct(option?.label || '');
                const selectedProductData = products.find((p) => p.crdfd_productsid === value);
                setSelectedProduct(selectedProductData || null);
                setSelectedProductCode(selectedProductData?.crdfd_masanpham);
                setProductCode(selectedProductData?.crdfd_masanpham || '');
                const vatOptionValue = (option?.crdfd_gtgt_option ?? option?.crdfd_gtgt) as number | undefined;
                const vatFromOption = vatOptionValue !== undefined ? VAT_OPTION_MAP[Number(vatOptionValue)] : undefined;
                if (vatFromOption !== undefined) {
                  handleVatChange(vatFromOption);
                }
                setUnitId('');
                setUnit('');
                userSelectedUnitRef.current = false; // Reset khi chọn sản phẩm mới
                userHasManuallySelectedUnitRef.current = false;
                hasSetUnitFromApiRef.current = false; // Reset khi chọn sản phẩm mới
              }}
              placeholder={isFormDisabled ? "Chọn KH và SO trước" : "Chọn sản phẩm"}
              loading={productsLoading}
              searchable
              onSearch={setProductSearch}
              disabled={isFormDisabled}
            />
            {/* Inventory: place directly under product select - Always visible */}
            <div
              className="admin-app-inventory-under-product"
              style={inventoryColor ? { color: inventoryColor } : undefined}
            >
              {inventoryLoading && (
                <div className="admin-app-spinner admin-app-spinner-small" style={{ marginRight: '6px' }}></div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {bypassWarningMessage && (
                  <span className="admin-app-inventory-text" style={{ color: '#f59e0b' }}>
                    {bypassWarningMessage}
                  </span>
                )}
                {inventoryLoading ? (
                  <div className="admin-app-inventory-text">Đang tải tồn kho...</div>
                ) : inventoryInventoryMessage || khoBinhDinhMessage ? (
                  <>
                    <div className="admin-app-inventory-text" style={{ fontStyle: isUsingInventory ? 'normal' : 'italic' }}>
                      {inventoryInventoryMessage}
                    </div>
                    <div className="admin-app-inventory-text" style={{ fontStyle: isUsingInventory ? 'italic' : 'normal' }}>
                      {khoBinhDinhMessage}
                    </div>
                  </>
                ) : (
                  <div className="admin-app-inventory-text">Chọn sản phẩm và kho để xem tồn kho</div>
                )}
              </div>
              {!shouldBypassInventoryCheck &&
                selectedProductCode &&
                warehouse &&
                (inventoryTheoretical === 0 || inventoryTheoretical === null) &&
                !inventoryLoading && (
                  <button
                    type="button"
                    onClick={handleReloadInventory}
                    className="admin-app-reload-btn"
                    title="Tải lại tồn kho"
                  >
                    ↻
                  </button>
                )}
            </div>
            {priceWarningMessage && priceWarningMessage !== 'Giá bình thường' && (
              <span className="admin-app-badge-error">{priceWarningMessage}</span>
            )}
          </div>

          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">Đơn vị</label>
            <Dropdown
              options={(availableUnitsFromPrices && availableUnitsFromPrices.length > 0 ? availableUnitsFromPrices : units).map((u) => ({
                value: u.crdfd_unitsid,
                label: u.crdfd_name,
                ...u,
              }))}
              value={unitId}
              onChange={(value, option) => {
                try {
                  console.debug('[ProductEntryForm] Unit change requested', { value, label: option?.label });
                } catch (e) { /* ignore */ }
                setUnit(option?.label || '');
                setUnitId(value);
                setUnitChangeTrigger(prev => prev + 1); // Force warehouse quantity recalculation
                userSelectedUnitRef.current = true; // Đánh dấu người dùng đã chọn đơn vị
                userHasManuallySelectedUnitRef.current = true; // Persist manual selection for this product session
                // Immediately map unit -> price using already-fetched prices (no network call)
                try {
                  const selectedRaw = option?.label || '';
                  const prefNorm = normalizeText(selectedRaw);
                  // Prefer same priceGroupText if already set, otherwise any region-aware match first
                  const groupPref = (priceGroupText || '').trim();
                  const groupPrefNorm = groupPref ? normalizeText(groupPref) : null;
                  // Find candidate entries matching the unit
                  let candidate = (pricesFromApi || []).find((p: any) => {
                    const n1 = normalizeText(p.unitName || '');
                    const n2 = normalizeText(p.crdfd_onvichuan || '');
                    return n1 === prefNorm || n2 === prefNorm;
                  });

                  // If we have a group preference, try to prefer an entry within same group
                  if (groupPrefNorm) {
                    const groupMatch = (pricesFromApi || []).find((p: any) => {
                      const n1 = normalizeText(p.unitName || '');
                      const n2 = normalizeText(p.crdfd_onvichuan || '');
                      const pg = normalizeText(p.priceGroupText || p.crdfd_nhomoituongtext || '');
                      return (n1 === prefNorm || n2 === prefNorm) && pg === groupPrefNorm;
                    });
                    if (groupMatch) candidate = groupMatch;
                  }

                  // As a final fallback, try substring match (no diacritics)
                  if (!candidate) {
                    const prefNo = normalizeText(selectedRaw);
                    candidate = (pricesFromApi || []).find((p: any) => {
                      const pgUnit = normalizeText(p.unitName || p.crdfd_onvichuan || '');
                      return pgUnit.includes(prefNo);
                    });
                  }

                  if (candidate) {
                    const priceVal = candidate.price ?? candidate.crdfd_gia ?? candidate.crdfd_giatheovc ?? null;
                    const priceNoVatVal = candidate.priceNoVat ?? candidate.cr1bb_giakhongvat ?? null;
                    const useNoVat = isVatSo;
                    let chosenPrice: number | null = null;
                    if (useNoVat && priceNoVatVal !== null && priceNoVatVal !== undefined) chosenPrice = Number(priceNoVatVal);
                    else if (priceVal !== null && priceVal !== undefined) chosenPrice = Number(priceVal);
                    else if (priceNoVatVal !== null && priceNoVatVal !== undefined) chosenPrice = Number(priceNoVatVal);

                    if (chosenPrice !== null && !isNaN(chosenPrice)) {
                      const rounded = Math.round(chosenPrice * 100) / 100;
                      setApiPrice(rounded);
                      handlePriceChange(String(rounded));
                      setPriceGroupText(candidate.priceGroupText || candidate.crdfd_nhomoituongtext || '');
                      // Also update selectedPriceFromApi so other UI pieces can react
                      setSelectedPriceFromApi(candidate);
                    }
                  }
                } catch (e) {
                  console.warn('[ProductEntryForm] Error mapping unit->price locally', e);
                }
                // NOTE: Do NOT trigger a full price reload here. The component already
                // stores `pricesFromApi` and maps `selectedPriceFromApi` in a separate
                // effect when `unitId` or `pricesFromApi` changes. Removing the forced
                // reload avoids redundant API calls when only the unit selection changes.
              }}
              placeholder={isFormDisabled ? "Chọn KH và SO trước" : "Chọn đơn vị"}
              loading={unitsLoading}
              disabled={isFormDisabled}
            />
          </div>

          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">Kho</label>
            <Dropdown
              options={warehouses.map((w) => ({
                value: w.crdfd_khowecareid,
                label: w.crdfd_name,
                ...w,
              }))}
              value={warehouseId}
              onChange={(value, option) => {
                setWarehouseId(value);
                setWarehouse(option?.label || '');
              }}
              placeholder={isFormDisabled ? "Chọn KH và SO trước" : "Chọn kho"}
              loading={warehousesLoading}
              disabled={isFormDisabled}
            />
          </div>

          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">Ngày giao</label>
            <div className="admin-app-input-wrapper" style={{ position: 'relative' }}>
              <input
                type="date"
                className="admin-app-input admin-app-input-compact admin-app-input-small"
                value={formatDdMmYyyyToIso(deliveryDate)}
                placeholder="dd/mm/yyyy"
                disabled={true}
                title="Ngày giao tự động tính toán theo Leadtime"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Quantity, Price, VAT (%), Add Button */}
        <div className="admin-app-form-row-compact admin-app-product-row-2">
          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">Số lượng</label>
            <div className="admin-app-input-wrapper">
              <input
                type="number"
                className="admin-app-input admin-app-input-compact admin-app-input-number admin-app-input-small"
                value={quantity > 0 ? quantity : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                  handleQuantityChange(val);
                }}
                placeholder=""
                min={1}
                disabled={isFormDisabled || !hasSelectedProduct}
              />
            </div>
            {warehouseQuantityLabel && (
              <div className="admin-app-hint-compact" style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                {warehouseQuantityLabel}
              </div>
            )}
          </div>

          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">
              Giá
              {priceGroupText && (
                <span className="admin-app-price-group-badge" style={{
                  marginLeft: '8px',
                  fontSize: '10px',
                  fontWeight: '500',
                  color: '#059669',
                  backgroundColor: '#ecfdf5',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #a7f3d0'
                }}>
                  {priceGroupText}{(priceGroupDiscountPct && normalizeText(priceGroupText) !== 'shop') ? ` (-${(Number.isInteger(priceGroupDiscountPct) ? priceGroupDiscountPct : priceGroupDiscountPct.toFixed(1))}%)` : ''}
                </span>
              )}
              {customerWecareRewards && (
                <span className="admin-app-rewards-badge" style={{
                  marginLeft: '8px',
                  fontSize: '10px',
                  fontWeight: '500',
                  color: '#7c3aed',
                  backgroundColor: '#f3e8ff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #d8b4fe'
                }}>
                  {customerWecareRewards}{(customerRewardDiscountPct && (String(customerWecareRewards || '').toLowerCase().trim() !== 'shop')) ? ` (-${(Number.isInteger(customerRewardDiscountPct) ? customerRewardDiscountPct : customerRewardDiscountPct.toFixed(1))}%)` : ''}
                </span>
              )}
            </label>
            <div className="admin-app-input-wrapper" style={{ position: 'relative' }}>
              {priceLoading && (
                <div className="admin-app-input-loading-spinner">
                  <div className="admin-app-spinner admin-app-spinner-small"></div>
                </div>
              )}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9.,]*"
                className={`admin-app-input admin-app-input-compact admin-app-input-money admin-app-input-small${priceLoading || !approvePrice || (approvePrice && priceEntryMethod === 'Theo chiết khấu') ? ' admin-app-input-readonly' : ''}`}
                value={formatPriceForDisplay(String(price)) || price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder={priceLoading ? "Đang tải..." : "Giá"}
                readOnly={priceLoading || !approvePrice || (approvePrice && priceEntryMethod === 'Theo chiết khấu')}
                disabled={isFormDisabled || !approvePrice}
                style={priceLoading ? { paddingRight: '32px' } : undefined}
              />
            </div>
          </div>

          {isVatSo && (
            <div className="admin-app-field-compact admin-app-field-vat">
              <label className="admin-app-label-inline">VAT (%)</label>
              <div className="admin-app-input-wrapper">
                <input
                  type="number"
                  className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-small"
                  value={vatPercent}
                  readOnly
                  style={{ width: '70px' }}
                />
              </div>
            </div>
          )}

          <div className="admin-app-field-compact admin-app-field-add-button">
            <label className="admin-app-label-inline" style={{ visibility: 'hidden' }}>Add</label>
            <button
              type="button"
              className="admin-app-mini-btn admin-app-mini-btn-add"
              onClick={handleAddWithInventoryCheck}
              disabled={buttonsDisabled || isAdding || isProcessingAdd || priceLoading}
              title={priceLoading ? "Đang tải giá..." : "Thêm sản phẩm"}
              aria-label={priceLoading ? "Đang tải giá..." : "Thêm sản phẩm"}
              style={{
                width: '100%',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}
            >
              {(isAdding || isProcessingAdd) ? (
                <>
                  <div className="admin-app-spinner admin-app-spinner-small" style={{ marginRight: '6px', borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white' }}></div>
                  Đang thêm...
                </>
              ) : priceLoading ? (
                <>
                  <div className="admin-app-spinner admin-app-spinner-small" style={{ marginRight: '6px', borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white' }}></div>
                  Đang tải giá...
                </>
              ) : (
                '➕ Thêm sản phẩm'
              )}
            </button>
            {buttonsDisabled && addButtonDisabledReason && (
              <div className="admin-app-disabled-reason" style={{ marginTop: '2px', fontSize: '9px' }} title={addButtonDisabledReason}>
                {addButtonDisabledReason}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Promotion - Chỉ hiển thị khi có chương trình khuyến mãi và không bật duyệt giá */}
        {!approvePrice && (promotionLoading || promotions.length > 0) && (
          <div className="admin-app-form-row-compact admin-app-product-row-3">
            <div className="admin-app-field-compact admin-app-field-promotion">
              <label className="admin-app-label-inline">
                <span style={{ marginRight: '4px' }}>🎁</span>
                Chương trình khuyến mãi
              </label>
              {promotionLoading ? (
                <div className="admin-app-hint-compact" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="admin-app-spinner admin-app-spinner-small"></div>
                  <span>Đang tải...</span>
                </div>
              ) : promotions.length > 0 ? (
                <>
                  <div className="admin-app-select-with-copy">
                    <select
                      className="admin-app-input admin-app-input-compact"
                      value={effectivePromotionId}
                      onChange={(e) => {
                        const val = normalizePromotionId(e.target.value);
                        setSelectedPromotionId(val);
                        // Propagate selection to parent if setter provided
                        try { if (setPromotionId) setPromotionId(val); } catch (err) { /* ignore */ }
                      }}
                      disabled={isFormDisabled}
                      title={selectedPromotion?.name || undefined}
                    >
                      {promotions.map((promo) => {
                        const toNumber = (v: any) => {
                          const n = Number(v);
                          return isNaN(n) ? null : n;
                        };
                        // Ưu tiên hiển thị giá trị promotion theo loại đơn hàng (giống derivePromotionPercent)
                        const vatTextLower = (vatText || '').toLowerCase();
                        const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;
                        let displayValue: number | null = null;
                        if (isVatOrder) {
                          // SO có VAT: ưu tiên valueWithVat
                          displayValue =
                            toNumber(promo.valueWithVat) ??
                            toNumber(promo.valueNoVat) ??
                            toNumber(promo.value) ??
                            toNumber(promo.value2) ??
                            toNumber(promo.value3) ??
                            toNumber(promo.valueBuyTogether);
                        } else {
                          // SO không VAT: ưu tiên valueNoVat
                          displayValue =
                            toNumber(promo.valueNoVat) ??
                            toNumber(promo.valueWithVat) ??
                            toNumber(promo.value) ??
                            toNumber(promo.value2) ??
                            toNumber(promo.value3) ??
                            toNumber(promo.valueBuyTogether);
                        }
                        const valueLabel =
                          displayValue !== null && displayValue !== undefined
                            ? ` - ${displayValue}%`
                            : '';
                        return (
                          <option key={normalizePromotionId(promo.id)} value={normalizePromotionId(promo.id)}>
                            {`${promo.name}${promo.applicable === false ? ' (Không hợp lệ)' : ''}${valueLabel}`}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      className="admin-app-dropdown-copy-btn"
                      disabled={!selectedPromotion?.name}
                      title="Copy tên chương trình khuyến mãi"
                      onClick={async () => {
                        const ok = await copyToClipboard(selectedPromotion?.name || '');
                        if (ok) showToast.success('Đã copy tên chương trình');
                        else showToast.error('Copy thất bại');
                      }}
                    >
                      ⧉
                    </button>
                  </div>
                  {(promotionDiscountPercent || discountPercent) > 0 && (
                    <span className="admin-app-badge-promotion">
                      Giảm: {promotionDiscountPercent || discountPercent || 0}%
                    </span>
                  )}
                  {promotionWarning && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ borderLeft: '4px solid #dc2626', background: '#fff4f4', color: '#991b1b', padding: '8px 12px', borderRadius: 4 }}>
                        <strong>Cảnh báo:</strong> {promotionWarning}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Row 3: Giá đã giảm, Subtotal/Total (only after product selected) */}
        <div className="admin-app-form-row-compact admin-app-form-row-summary admin-app-form-row-summary-no-stock">
          {hasSelectedProduct && (() => {
            // Tính giá đã giảm (giá đơn vị sau khi áp dụng chiết khấu, KHÔNG bao gồm VAT)
            // Sử dụng ưu tiên: nếu API trả về discountRate thì dùng discountRate này,
            // ngược lại fallback sang promotion/discountPercent client-side.
            const priceNum = (basePriceForDiscount && basePriceForDiscount > 0) ? basePriceForDiscount : (parseFloat(String(price)) || 0);

            const promoDiscountPct = discountPercent || promotionDiscountPercent || 0;

            // Ignore API discountRate for "Giá đã giảm" — always compute using client-side promotion/discountPercent
            const discountFactor = 1 - (promoDiscountPct > 0 ? promoDiscountPct / 100 : 0);
            const discountedPrice = priceNum * discountFactor;
            // Làm tròn đến 2 chữ số thập phân để hiển thị giống với cách tính trong recomputeTotals
            const roundedDiscountedPrice = Math.round(discountedPrice * 100) / 100;

            // Build formula title (note that API discountRate is ignored here)
            let formula = `CÔNG THỨC TÍNH GIÁ ĐÃ GIẢM (BỎ QUA discountRate từ API)\n`;
            formula += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            formula += `Giá gốc: ${priceNum.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            formula += `Chiết khấu áp dụng (promotion/chiết khấu client): ${promoDiscountPct}%\n`;
            formula += `Giá đã giảm: ${roundedDiscountedPrice.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
            formula += `Tính toán:\n`;
            if (promoDiscountPct > 0) {
              formula += `${priceNum.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × (1 - ${promoDiscountPct}%) = ${roundedDiscountedPrice.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else {
              formula += `${priceNum.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (không chiết khấu)`;
            }

            return (
              <div className="admin-app-field-compact admin-app-field-discounted-price">
                <label className="admin-app-label-inline" title={formula}>Giá đã giảm</label>
                <input
                  type="text"
                  className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money"
                  value={roundedDiscountedPrice.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  readOnly
                  title={formula}
                  aria-label={`Công thức tính: ${formula}`}
                />
              </div>
            );
          })()}

          {hasSelectedProduct && (() => {
            // Công thức: Thành tiền = Số lượng × Giá (sau chiết khấu, chưa VAT)
            const priceNum = parseFloat(String(price)) || 0;
            const promoDiscountPct = discountPercent || promotionDiscountPercent || 0;
            const discountFactor = 1 - (promoDiscountPct > 0 ? promoDiscountPct / 100 : 0);
            const discountedPrice = priceNum * discountFactor;
            const roundedDiscountedPrice = Math.round(discountedPrice);

            // Công thức chi tiết
            let formula = `CÔNG THỨC TÍNH THÀNH TIỀN\n`;
            formula += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            formula += `Số lượng: ${quantity.toLocaleString('vi-VN')}\n`;
            formula += `Giá đơn vị (sau chiết khấu, chưa VAT): ${roundedDiscountedPrice.toLocaleString('vi-VN')} ₫\n\n`;
            formula += `Tính toán:\n`;
            formula += `${quantity.toLocaleString('vi-VN')} × ${roundedDiscountedPrice.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return (
              <div className="admin-app-field-compact admin-app-field-total">
                <label className="admin-app-label-inline" title={formula}>Thành tiền</label>
                <input
                  type="text"
                  className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money"
                  value={subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  readOnly
                  title={formula}
                />
              </div>
            );
          })()}

          {hasSelectedProduct && (() => {
            // Công thức: Tổng tiền = Thành tiền + VAT = Thành tiền × (1 + VAT%)
            const vatAmountCalc = Math.round(((subtotal * (vatPercent || 0)) / 100) * 100) / 100;
            let formula = `CÔNG THỨC TÍNH TỔNG TIỀN\n`;
            formula += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            formula += `Thành tiền: ${subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            formula += `VAT (${vatPercent}%): ${vatAmountCalc.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
            formula += `Tính toán:\n`;
            formula += `${subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + ${vatAmountCalc.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${totalAmount.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return (
              <div className="admin-app-field-compact admin-app-field-grand-total">
                <label className="admin-app-label-inline" title={formula}>Tổng tiền</label>
                <input
                  type="text"
                  className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money admin-app-input-total"
                  value={totalAmount.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  readOnly
                  title={formula}
                />
              </div>
            );
          })()}

          {/* Ghi chú - Thu nhỏ và đặt sau Tổng tiền */}
          <div className="admin-app-field-compact admin-app-field-note" style={{ minWidth: '120px' }}>
            <label className="admin-app-label-inline">Ghi chú</label>
            <div className="admin-app-input-wrapper">
              <input
                type="text"
                className="admin-app-input admin-app-input-compact admin-app-input-small"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú"
                disabled={isFormDisabled}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Loading overlay khi đang save/load details */}
      {(isSaving || isLoadingDetails) && (
        <div className="admin-app-form-loading-overlay">
          <div className="admin-app-spinner admin-app-spinner-medium"></div>
          <div className="admin-app-form-loading-text">
            {isSaving ? 'Đang lưu...' : 'Đang tải dữ liệu...'}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ProductEntryForm);

