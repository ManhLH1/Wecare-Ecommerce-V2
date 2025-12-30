'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  setPromotionText: (value: string) => void;
  onAdd: () => void;
  onSave: () => void;
  onRefresh: () => void;
  onInventoryReserved?: () => void; // Callback khi inventory được reserve để trigger reload
  onProductGroupCodeChange?: (code: string) => void; // Callback khi productGroupCode thay đổi
  disableInventoryReserve?: boolean; // Tắt tính năng giữ hàng tự động (dùng cho SOBG)
  orderTotal?: number; // Tổng tiền toàn đơn (dùng để check Promotion Order & phân bổ chiết khấu VNĐ)
}

export default function ProductEntryForm({
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
  setPromotionText,
  onAdd,
  onSave,
  onRefresh,
  onInventoryReserved,
  onProductGroupCodeChange,
  disableInventoryReserve = false,
  orderTotal,
}: ProductEntryFormProps) {
  console.log('🚀 [ProductEntryForm] Component rendered, customerDistrictKey:', customerDistrictKey);

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
  const [availableUnitsFromPrices, setAvailableUnitsFromPrices] = useState<any[]>([]);
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
  const [apiPrice, setApiPrice] = useState<number | null>(null); // Giá từ API để check warning
  const [shouldReloadPrice, setShouldReloadPrice] = useState<number>(0); // Counter to trigger reload
  const [isProcessingAdd, setIsProcessingAdd] = useState<boolean>(false); // Flag để ngăn bấm liên tục
  const hasSetUnitFromApiRef = useRef<boolean>(false); // Track nếu đã set đơn vị từ API để không reset lại
  const userSelectedUnitRef = useRef<boolean>(false); // Track nếu người dùng đã chọn đơn vị thủ công
  const lastPriceFetchKeyRef = useRef<string | null>(null); // Dedupe key for price fetches

  const isVatSo = useMemo(() => {
    const vatTextLower = (vatText || '').toLowerCase();
    return vatTextLower.includes('có vat');
  }, [vatText]);

  const hasSelectedProduct = useMemo(() => {
    return Boolean(productId || selectedProductCode);
  }, [productId, selectedProductCode]);

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

  // Lấy tên đơn vị chuẩn từ sản phẩm
  const getBaseUnitName = () => {
    // Ưu tiên lấy từ selectedProduct
    if (selectedProduct?.crdfd_onvichuantext) {
      return selectedProduct.crdfd_onvichuantext;
    }

    // Fallback: tìm từ products list
    const productFromList = products.find((p) => p.crdfd_masanpham === selectedProductCode);
    if (productFromList?.crdfd_onvichuantext) {
      return productFromList.crdfd_onvichuantext;
    }

    // Fallback: lấy từ unit hiện tại nếu có
    const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
    if (currentUnit) {
      return (currentUnit as any)?.crdfd_onvichuan ||
        (currentUnit as any)?.crdfd_onvichuantext ||
        'đơn vị chuẩn';
    }

    return 'đơn vị chuẩn';
  };

  // Label "SL theo kho" = Số lượng * Giá trị chuyển đổi, hiển thị theo đơn vị chuẩn
  // Công thức PowerApps: "SL theo kho: " & Text(IfError(Value(txt_So_luong.Text) * dp_Don_vi.Selected.'Giá trị chuyển đổi', 0), "#,##0.##") & " " & cb_san_pham.Selected.'Đơn vị chuẩn text'
  const warehouseQuantityLabel = useMemo(() => {
    // Nếu không có số lượng hoặc số lượng <= 0, không hiển thị
    if (!quantity || quantity <= 0) return '';

    try {
      // Lấy giá trị chuyển đổi từ đơn vị đã chọn
      const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
      const rawFactor =
        (currentUnit as any)?.crdfd_giatrichuyenoi ??
        (currentUnit as any)?.crdfd_giatrichuyendoi ??
        (currentUnit as any)?.crdfd_conversionvalue ??
        null;

      // IfError: Nếu không có giá trị chuyển đổi hoặc lỗi, dùng 0
      let conversionFactor = 0;
      if (rawFactor !== null && rawFactor !== undefined) {
        const factorNum = Number(rawFactor);
        conversionFactor = !isNaN(factorNum) && factorNum > 0 ? factorNum : 0;
      }

      // Tính số lượng theo kho: quantity * conversionFactor
      const converted = quantity * conversionFactor;

      // Format theo "#,##0.##" (tối đa 2 chữ số thập phân, có dấu phẩy phân cách hàng nghìn)
      const formatted = converted.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: true,
      });

      // Lấy đơn vị chuẩn từ sản phẩm (cb_san_pham.Selected.'Đơn vị chuẩn text')
      const baseUnitText = getBaseUnitName();

      return `SL theo kho: ${formatted} ${baseUnitText}`;
    } catch (error) {
      // Nếu có lỗi, trả về chuỗi rỗng
      return '';
    }
  }, [quantity, units, unitId, selectedProduct, selectedProductCode, products]);

  const getConversionFactor = () => {
    const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
    const rawFactor =
      (currentUnit as any)?.crdfd_giatrichuyenoi ??
      (currentUnit as any)?.crdfd_giatrichuyendoi ??
      (currentUnit as any)?.crdfd_conversionvalue ??
      1;
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
    console.log('📊 [Inventory] Updating inventory state:', {
      theoretical,
      reserved,
      available,
      isVatOrder,
      finalAvailable: available !== undefined ? available : (theoretical - reserved)
    });

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
      console.log('⏳ [Inventory] Starting to load inventory for:', {
        selectedProductCode,
        warehouse,
        isVatOrder
      });
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
      console.log('✅ [Inventory] Loading completed for:', {
        selectedProductCode,
        warehouse,
        finalTheoretical: inventoryTheoretical,
        finalReserved: reservedQuantity,
        finalAvailable: availableToSell,
        isVatOrder
      });
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
        setUnitId(found.crdfd_unitsid);
      } else if ((availableUnitsFromPrices && availableUnitsFromPrices.length > 0)) {
        setUnitId(availableUnitsFromPrices[0].crdfd_unitsid);
        setUnit(availableUnitsFromPrices[0].crdfd_name);
      } else if (units.length > 0) {
        setUnitId(units[0].crdfd_unitsid);
        setUnit(units[0].crdfd_name);
      }
      return;
    }

    if (!unit && unitIdIsEmpty && (availableUnitsFromPrices && availableUnitsFromPrices.length > 0) && !userSelectedUnitRef.current) {
      // Auto-select first unit from availableUnitsFromPrices when available (prefers price-derived units)
      setUnitId(availableUnitsFromPrices[0].crdfd_unitsid);
      setUnit(availableUnitsFromPrices[0].crdfd_name);
      return;
    }

    if (!unitIdIsEmpty && !currentUnitExists && (availableUnitsFromPrices && availableUnitsFromPrices.length > 0)) {
      // If current unitId is no longer in list, fallback to first availableUnitsFromPrices
      setUnitId(availableUnitsFromPrices[0].crdfd_unitsid);
      setUnit(availableUnitsFromPrices[0].crdfd_name);
    } else if (!unitIdIsEmpty && !currentUnitExists && units.length > 0) {
      // Fallback to real units list
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
      const fetchKey = `${selectedProductCode}::${customerCode || ''}::${vatPercent || 0}::${vatText || ''}::${shouldReloadPrice || 0}`;
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
        const result = await fetchProductPrice(
          selectedProductCode,
          customerCode,
          undefined, // Không truyền unitId
          undefined, // region filter removed
          undefined  // Không truyền isVatOrder
        );

        // API trả về TẤT CẢ giá cho tất cả đơn vị
        const allPrices = (result as any)?.prices || [];

        // Lấy đơn vị hiện tại để lọc giá
        const currentUnit = units.find((u) => u.crdfd_unitsid === unitId);
        const currentUnitName = currentUnit?.crdfd_name || unit;
        // Lấy đơn vị chuẩn (crdfd_onvichuan) từ unit đã chọn để map chính xác
        const currentUnitOnvichuan = (currentUnit as any)?.crdfd_onvichuan || undefined;

        // Tìm giá theo đơn vị đã chọn (nếu có)
        // Ưu tiên map theo unitName từ API (đã được lấy từ crdfd_onvi lookup)
        // Sau đó mới map theo crdfd_onvichuan
        let selectedPrice: any = null;
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
        if (allPrices.length > 0 && currentUnitName) {
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

        // Fallback về format cũ nếu API chưa có prices array
        const priceWithVat = selectedPrice?.price ?? result?.price ?? null;
        const priceNoVat = selectedPrice?.priceNoVat ?? (result as any)?.priceNoVat ?? null;
        const apiUnitName = selectedPrice?.unitName ?? result?.unitName ?? undefined;
        const apiPriceGroupText = selectedPrice?.priceGroupText ?? result?.priceGroupText ?? undefined;

        // After building the units list from prices, automatically select the unit
        // based on the canonical `crdfd_onvichuan` value returned in the API if the
        // user hasn't manually chosen a unit.
        if (!userSelectedUnitRef.current && unitsFromPrices.length > 0) {
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
            setUnitId(found.crdfd_unitsid);
            setUnit(found.crdfd_name);
            hasSetUnitFromApiRef.current = true;
          }
        }

        // Chọn giá dựa vào VAT của SO và SẢN PHẨM
        // Logic:
        // 1. SO có VAT + Sản phẩm có VAT → dùng priceNoVat
        // 2. SO có VAT + Sản phẩm không VAT → dùng price
        // 3. SO không VAT + Sản phẩm có VAT → dùng price
        // 4. SO không VAT + Sản phẩm không VAT → dùng price
        let basePrice: number | null = null;

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

        // Làm tròn & format giống PowerApps Text(..., "#,###")
        const roundedBase =
          basePrice !== null && basePrice !== undefined
            ? Math.round(Number(basePrice))
            : null;

        const displayPrice =
          result?.giaFormat ??
          result?.priceFormatted ??
          roundedBase;

        const priceStr = normalizePriceInput(displayPrice);

        // QUAN TRỌNG: Kiểm tra xem sản phẩm có còn là sản phẩm hiện tại không
        // Nếu user đã chọn sản phẩm khác trong khi đang load giá, không set giá này vào
        if (currentProductCode !== selectedProductCode) {
          console.log(`[Price Load] Ignoring price for ${currentProductCode} - product changed to ${selectedProductCode}`);
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
          setBasePriceForDiscount(roundedBase);
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
  }, [selectedProductCode, product, customerCode, vatPercent, vatText, shouldReloadPrice]);

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

        const data = await fetchProductPromotions(selectedProductCode, customerCode, region);

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
    setSelectedPromotionId((prev) => {
      const prevNorm = normalizePromotionId(prev);
      const exists = prevNorm !== '' && promotions.some((promo) => normalizePromotionId(promo.id) === prevNorm);
      if (exists) return prevNorm;
      const firstId = normalizePromotionId(promotions[0]?.id);
      return firstId;
    });
  }, [promotions]);

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
    if (approvePrice && priceEntryMethod === 'Theo chiết khấu' && basePriceForDiscount > 0) {
      const pct = Number(discountPercent) || 0;
      const discountedPrice = basePriceForDiscount - (basePriceForDiscount * pct / 100);
      const roundedPrice = Math.round(discountedPrice);
      handlePriceChange(String(roundedPrice));
    }
  }, [approvePrice, priceEntryMethod, discountPercent, basePriceForDiscount]);

  // Calculate totals with promotion discount
  const recomputeTotals = (priceValue: string | number, qty: number, promoDiscountPct: number, vatPct: number) => {
    const priceNum = parseFloat(String(priceValue).replace(/,/g, '')) || 0;

    // Base after primary promotion percent
    const discountFactor = 1 - (promoDiscountPct > 0 ? promoDiscountPct / 100 : 0);
    let effectivePrice = priceNum * discountFactor;


    const vatTextLower = (vatText || '').toLowerCase();
    const isNonVatOrder = vatTextLower.includes('không vat');
    const effectiveVat = isNonVatOrder ? 0 : vatPct;

    let newSubtotal = qty * effectivePrice;

    const newVat = (newSubtotal * effectiveVat) / 100;
    // Làm tròn đến hàng đơn vị
    const roundedSubtotal = Math.round(newSubtotal);
    const roundedVat = Math.round(newVat);
    const roundedTotal = Math.round(newSubtotal + newVat);
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
    // Remove all non-numeric characters (including thousand separators) for internal storage
    const cleaned = value.replace(/[^\d]/g, '');
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

      onAdd();

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
      if (num > 0 && num <= 1) {
        return Math.round(num * 100); // convert fraction to %
      }
      if (num > 0) {
        return num;
      }
    }
    return 0;
  };

  // Sync discount percent from promotion selection
  useEffect(() => {
    // KHI DUYỆT GIÁ: Không áp dụng chiết khấu từ promotion (chiết khấu 1 = 0)
    if (approvePrice) {
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
    const promoPct = derivePromotionPercent(selected);
    setPromotionDiscountPercent(promoPct);
    setDiscountPercent(promoPct); // propagate to parent state
    setPromotionText(selected?.name || '');


    recomputeTotals(price, quantity, promoPct || discountPercent, vatPercent);
  }, [selectedPromotionId, promotions, approvePrice]);

  // Check Promotion Order applicability (order-level) for the selected promotion
  useEffect(() => {
    let cancelled = false;
    const checkOrderLevelPromotion = async () => {
      if (!soId || !selectedPromotion) {
        setOrderPromotionInfo(null);
        return;
      }
      try {
        const res = await fetchPromotionOrders(
          soId,
          customerCode,
          orderTotal ?? 0,
          selectedProductCode ? [selectedProductCode] : [],
          selectedProductGroupCode ? [selectedProductGroupCode] : []
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

      console.log('🚛 [ProductEntryForm] Calculating delivery date for product:', {
        productCode: selectedProductCode,
        productName: selectedProduct?.crdfd_name,
        customerName,
        customerIndustry,
        varNganhNghe,
        districtLeadtime,
        quantity,
        conversionFactor,
        inventoryTheoretical,
        productLeadTime,
        promotion: promoRecord ? {
          leadtime: promoRecord.cr1bb_leadtimepromotion,
          phanloai: promoRecord.cr1bb_phanloaichuongtrinh
        } : null
      });

      console.log('🔄 [ProductEntryForm] Computing delivery date with params:', {
        districtLeadtime: districtLeadtime,
        quantity: quantity || 0,
        conversionFactor: Number(conversionFactor) || 1,
        inventoryTheoretical: inventoryTheoretical ?? 0,
        productLeadTime: productLeadTime || 0,
        varNganhNghe: varNganhNghe ?? undefined
      });

      const computed = computeDeliveryDate({
        promotion: promoRecord,
        varNganhNghe: varNganhNghe ?? undefined,
        var_leadtime_quanhuyen: districtLeadtime, // Use actual district leadtime from cr1bb_leadtimetheoca
        var_input_soluong: quantity || 0,
        var_selected_donvi_conversion: Number(conversionFactor) || 1,
        var_selected_SP_tonkho: inventoryTheoretical ?? 0,
        var_selected_SP_leadtime: productLeadTime || 0,
      });

      const formattedDate = formatDate(computed);
      console.log('📅 [ProductEntryForm] Delivery date calculated:', {
        computed: computed.toLocaleString('vi-VN'),
        formatted: formattedDate
      });

      setDeliveryDate(formattedDate);
    } catch (e) {
      console.error('❌ [ProductEntryForm] Error calculating delivery date, using fallback:', e);
      // fallback: simple logic
      const today = new Date();
      const daysToAdd = (quantity || 0) > (stockQuantity || 0) ? 2 : 1;
      const t = new Date(today);
      t.setDate(today.getDate() + daysToAdd);
      const fallbackDate = formatDate(t);

      console.log('🔄 [ProductEntryForm] Using FALLBACK delivery date:', {
        quantity,
        stockQuantity,
        daysToAdd,
        fallbackDate
      });

      setDeliveryDate(fallbackDate);
    }
  }, [selectedPromotionId, promotions, selectedPromotion, customerIndustry, customerName, quantity, unitId, units, inventoryTheoretical, selectedProduct, stockQuantity, districtLeadtime, inventoryLoading]);


  // Fetch district leadtime when customer district key changes
  useEffect(() => {
    console.log('🔄 [District Leadtime] customerDistrictKey changed:', {
      customerDistrictKey,
      customerName,
      customerId,
      hasKey: !!customerDistrictKey && customerDistrictKey.trim() !== ''
    });

    const fetchDistrictLeadtime = async () => {
    console.log('🏙️ [District Leadtime] Fetching for key (or fallback name):', customerDistrictKey);

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
            console.log('📍 [District Leadtime] Found district in brackets:', districtNameFromCustomer);
          } else {
            // Try pattern: split by '-' and take last meaningful part
            const parts = customerNameStr.split('-').map(p => p.trim()).filter(p => p.length > 0);
            if (parts.length > 1) {
              const lastPart = parts[parts.length - 1];
              // Check if last part looks like a district name (contains quận/huyện/thị xã)
              if (lastPart.match(/(quận|huyện|thị xã|thành phố|tp\.?|q\.?)/i)) {
                districtNameFromCustomer = lastPart;
                console.log('📍 [District Leadtime] Found district by split:', districtNameFromCustomer);
              }
            }
          }
        }

        if (!districtNameFromCustomer) {
          console.log('⚠️ [District Leadtime] No district data available:', {
            customerId,
            customerName,
            customerDistrictKey: 'NOT_SET',
            crdfd_keyquanhuyen: 'NOT_SET',
            action: 'Using default leadtime 2 days (48 hours)'
          });
          setDistrictLeadtime(2); // Default 2 days = 48 hours
          return;
        }

        console.log('🏙️ [District Leadtime] Falling back to lookup by name:', districtNameFromCustomer);
        result = await getDistrictLeadtime({ name: districtNameFromCustomer } as any);
      }

      console.log('🏙️ [District Leadtime] Final result:', {
        customerId,
        customerName,
        customerDistrictKey,
        districtId: result.districtId,
        districtName: result.districtName,
        cr1bb_leadtimekhuvuc: result.leadtimeKhuVuc,
        cr1bb_leadtimetheoca: result.leadtimeTheoCa,
        usingLeadtime: result.leadtimeTheoCa
      });
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
                        setDiscountRate(value);
                        if (value === 'Khác') {
                          setDiscountPercent(0);
                        } else {
                          const num = Number(value);
                          setDiscountPercent(isNaN(num) ? 0 : num);
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
                console.log('📦 [Product Selection] User selected product:', {
                  productId: value,
                  productName: option?.label,
                  productCode: option?.crdfd_masanpham
                });

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
                setUnitId(value);
                setUnit(option?.label || '');
                userSelectedUnitRef.current = true; // Đánh dấu người dùng đã chọn đơn vị
                // Trigger price reload for the newly selected unit
                setShouldReloadPrice((s) => (s || 0) + 1);
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
                onChange={(e) => setDeliveryDate(formatIsoToDdMmYyyy(e.target.value))}
                placeholder="dd/mm/yyyy"
                disabled={false}
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
                  {priceGroupText}
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
                className={`admin-app-input admin-app-input-compact admin-app-input-money admin-app-input-small${priceLoading || !approvePrice || (approvePrice && priceEntryMethod === 'Theo chiết khấu') ? ' admin-app-input-readonly' : ''}`}
                value={formatPriceForDisplay(price)}
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
                  style={{ width: '50px' }}
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
                      onChange={(e) => setSelectedPromotionId(normalizePromotionId(e.target.value))}
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
                            {`${promo.name}${valueLabel}`}
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
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Row 3: Giá đã giảm, Subtotal/Total (only after product selected) */}
        <div className="admin-app-form-row-compact admin-app-form-row-summary admin-app-form-row-summary-no-stock">
          {hasSelectedProduct && (() => {
            // Tính giá đã giảm (giá đơn vị sau khi áp dụng chiết khấu, KHÔNG bao gồm VAT)
            // Logic giống với recomputeTotals để đảm bảo tính toán nhất quán
            const priceNum = parseFloat(String(price)) || 0;
            const promoDiscountPct = discountPercent || promotionDiscountPercent || 0;
            const discountFactor = 1 - (promoDiscountPct > 0 ? promoDiscountPct / 100 : 0);
            const discountedPrice = priceNum * discountFactor;
            // Làm tròn để hiển thị giống với cách tính trong recomputeTotals
            const roundedDiscountedPrice = Math.round(discountedPrice);

            // Công thức: Giá đã giảm = Giá gốc × (1 - Chiết khấu%)
            let formula = `CÔNG THỨC TÍNH GIÁ ĐÃ GIẢM\n`;
            formula += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            formula += `Giá gốc: ${priceNum.toLocaleString('vi-VN')} ₫\n`;
            if (promoDiscountPct > 0) {
              formula += `Chiết khấu: ${promoDiscountPct}%\n`;
              formula += `Giá đã giảm: ${roundedDiscountedPrice.toLocaleString('vi-VN')} ₫\n`;
            } else {
              formula += `Chiết khấu: 0%\n`;
              formula += `Giá đã giảm: ${roundedDiscountedPrice.toLocaleString('vi-VN')} ₫\n`;
            }
            formula += `\nTính toán:\n`;
            if (promoDiscountPct > 0) {
              formula += `${priceNum.toLocaleString('vi-VN')} × (1 - ${promoDiscountPct}%) = ${roundedDiscountedPrice.toLocaleString('vi-VN')} ₫`;
            } else {
              formula += `${priceNum.toLocaleString('vi-VN')} ₫ (không chiết khấu)`;
            }

            return (
              <div className="admin-app-field-compact admin-app-field-discounted-price">
                <label className="admin-app-label-inline" title={formula}>Giá đã giảm</label>
                <input
                  type="text"
                  className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money"
                  value={`${roundedDiscountedPrice.toLocaleString('vi-VN')} ₫`}
                  readOnly
                  title={formula}
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
            formula += `Số lượng: ${quantity}\n`;
            formula += `Giá đơn vị (sau chiết khấu, chưa VAT): ${roundedDiscountedPrice.toLocaleString('vi-VN')} ₫\n\n`;
            formula += `Tính toán:\n`;
            formula += `${quantity} × ${roundedDiscountedPrice.toLocaleString('vi-VN')} = ${subtotal.toLocaleString('vi-VN')} ₫`;

            return (
              <div className="admin-app-field-compact admin-app-field-total">
                <label className="admin-app-label-inline" title={formula}>Thành tiền</label>
                <input
                  type="text"
                  className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money"
                  value={`${subtotal.toLocaleString('vi-VN')} ₫`}
                  readOnly
                  title={formula}
                />
              </div>
            );
          })()}

          {hasSelectedProduct && (() => {
            // Công thức: Tổng tiền = Thành tiền + VAT = Thành tiền × (1 + VAT%)
            const vatAmountCalc = Math.round((subtotal * (vatPercent || 0)) / 100);
            let formula = `CÔNG THỨC TÍNH TỔNG TIỀN\n`;
            formula += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            formula += `Thành tiền: ${subtotal.toLocaleString('vi-VN')} ₫\n`;
            formula += `VAT (${vatPercent}%): ${vatAmountCalc.toLocaleString('vi-VN')} ₫\n\n`;
            formula += `Tính toán:\n`;
            formula += `${subtotal.toLocaleString('vi-VN')} + ${vatAmountCalc.toLocaleString('vi-VN')} = ${totalAmount.toLocaleString('vi-VN')} ₫`;

            return (
              <div className="admin-app-field-compact admin-app-field-grand-total">
                <label className="admin-app-label-inline" title={formula}>Tổng tiền</label>
                <input
                  type="text"
                  className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money admin-app-input-total"
                  value={`${totalAmount.toLocaleString('vi-VN')} ₫`}
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

