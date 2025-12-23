'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Dropdown from './Dropdown';
import { useProducts, useUnits, useWarehouses } from '../_hooks/useDropdownData';
import {
  fetchProductPrice,
  fetchProductPromotions,
  fetchInventory,
  fetchAccountingStock,
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
  customerName?: string;
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
  customerId,
  customerCode,
  customerName,
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
}: ProductEntryFormProps) {
  // Disable form if customer or SO is not selected
  // Check for both null/undefined and empty string
  const isFormDisabled = !customerId || customerId === '' || !soId || soId === '';

  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [unitId, setUnitId] = useState('');
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
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState<number>(0); // Key để trigger reload inventory
  const [accountingStock, setAccountingStock] = useState<number | null>(null);
  const [accountingStockLoading, setAccountingStockLoading] = useState<boolean>(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>('');
  const [priceGroupText, setPriceGroupText] = useState<string>('');
  const [priceEntryMethod, setPriceEntryMethod] = useState<'Nhập thủ công' | 'Theo chiết khấu'>('Nhập thủ công');
  const [discountRate, setDiscountRate] = useState<string>('1');
  const [basePriceForDiscount, setBasePriceForDiscount] = useState<number>(0);
  const [promotionDiscountPercent, setPromotionDiscountPercent] = useState<number>(0);
  const [apiPrice, setApiPrice] = useState<number | null>(null); // Giá từ API để check warning
  const [shouldReloadPrice, setShouldReloadPrice] = useState<number>(0); // Counter to trigger reload
  const [isProcessingAdd, setIsProcessingAdd] = useState<boolean>(false); // Flag để ngăn bấm liên tục
  const hasSetUnitFromApiRef = useRef<boolean>(false); // Track nếu đã set đơn vị từ API để không reset lại
  const userSelectedUnitRef = useRef<boolean>(false); // Track nếu người dùng đã chọn đơn vị thủ công

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

    // Kiểm tra đơn VAT trước - đơn VAT không cần check tồn kho và các ràng buộc khác
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;

    // Đơn VAT: cho phép lên đơn tự do - không ràng buộc gì (trừ duyệt giá cần người duyệt và số lượng > 0)
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

    // Kiểm tra đơn VAT trước - đơn VAT không cần check tồn kho và các ràng buộc khác
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;

    // Đơn VAT: cho phép lên đơn tự do - không ràng buộc gì (trừ duyệt giá cần người duyệt và số lượng > 0)
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
    const currentUnitExists = units.some((u) => u.crdfd_unitsid === unitId);

    // Nếu đã có unitId được chọn và unitId vẫn tồn tại trong danh sách units, KHÔNG làm gì cả
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
      } else if (units.length > 0) {
        setUnitId(units[0].crdfd_unitsid);
        setUnit(units[0].crdfd_name);
      }
      return;
    }

    if (!unit && unitIdIsEmpty && units.length > 0 && !userSelectedUnitRef.current) {
      // Auto-select first unit when available (chỉ khi chưa có unit và unitId VÀ người dùng chưa chọn)
      // CHỈ chạy khi CẢ unit và unitId đều trống VÀ người dùng chưa chọn đơn vị thủ công
      setUnitId(units[0].crdfd_unitsid);
      setUnit(units[0].crdfd_name);
      return;
    }

    if (!unitIdIsEmpty && !currentUnitExists && units.length > 0) {
      // If current unitId is no longer in list (e.g., after product change), fallback to first
      // CHỈ reset khi unitId không còn tồn tại trong danh sách units mới (sau khi đổi sản phẩm)
      setUnitId(units[0].crdfd_unitsid);
      setUnit(units[0].crdfd_name);
    }
  }, [unit, unitId, units]);

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
        return;
      }
      setPriceLoading(true);
      setApiPrice(null); // Reset trước khi load giá mới

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

      // Tự động set đơn vị từ API CHỈ KHI:
      // 1. CHƯA CÓ ĐƠN VỊ ĐƯỢC CHỌN (unitId và unit đều trống)
      // 2. NGƯỜI DÙNG CHƯA CHỌN ĐƠN VỊ THỦ CÔNG (userSelectedUnitRef.current = false)
      // 3. CHƯA SET TỪ API LẦN NÀO (hasSetUnitFromApiRef.current = false)
      // KHÔNG BAO GIỜ set đơn vị nếu người dùng đã chọn đơn vị thủ công
      if (apiUnitName && units.length > 0 && !hasSetUnitFromApiRef.current && !userSelectedUnitRef.current) {
        const foundUnit = units.find((u) =>
          u.crdfd_name.toLowerCase() === apiUnitName.toLowerCase()
        );
        if (foundUnit) {
          // CHỈ set nếu CHƯA CÓ unitId VÀ CHƯA CÓ unit (hoàn toàn chưa chọn đơn vị)
          // VÀ người dùng chưa chọn đơn vị thủ công
          const unitIdIsEmpty = !unitId || unitId === '' || unitId === null || unitId === undefined;
          const unitIsEmpty = !unit || unit === '' || unit === null || unit === undefined;
          if (unitIdIsEmpty && unitIsEmpty) {
            setUnitId(foundUnit.crdfd_unitsid);
            setUnit(foundUnit.crdfd_name);
            hasSetUnitFromApiRef.current = true; // Đánh dấu đã set từ API
          }
        }
      }

      // Chọn giá dựa vào VAT của SẢN PHẨM
      // TẤT CẢ SẢN PHẨM (có VAT và không VAT) ĐỀU DÙNG priceNoVat (giá trước VAT)
      // Theo PDF: "Đơn giá" = giá trước VAT, "Đơn giá sau VAT" = giá sau VAT
      // "Thành tiền" được tính từ "Đơn giá" (giá trước VAT) * số lượng
      let basePrice: number | null = null;
      
      // Luôn dùng priceNoVat (giá trước VAT) để hiển thị trong "Đơn giá"
      // VAT sẽ được tính riêng trong phần tính tổng tiền
      basePrice = priceNoVat ?? null;

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
      setPriceLoading(false);
    };

    loadPrice();
  }, [selectedProductCode, product, customerCode, unitId, vatPercent, vatText, shouldReloadPrice, units]);

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
        const data = await fetchProductPromotions(selectedProductCode, customerCode);

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
  useEffect(() => {
    if (approvePrice && priceEntryMethod === 'Theo chiết khấu' && basePriceForDiscount > 0) {
      const discountPercent = parseFloat(discountRate) || 0;
      const discountedPrice = basePriceForDiscount - (basePriceForDiscount * discountPercent / 100);
      const roundedPrice = Math.round(discountedPrice);
      handlePriceChange(String(roundedPrice));
    }
  }, [approvePrice, priceEntryMethod, discountRate, basePriceForDiscount]);

  // Calculate totals with promotion discount
  const recomputeTotals = (priceValue: string | number, qty: number, promoDiscountPct: number, vatPct: number) => {
    const priceNum = parseFloat(String(priceValue)) || 0;
    const discountFactor = 1 - (promoDiscountPct > 0 ? promoDiscountPct / 100 : 0);
    const effectivePrice = priceNum * discountFactor;
    const vatTextLower = (vatText || '').toLowerCase();
    const isNonVatOrder = vatTextLower.includes('không vat');
    const effectiveVat = isNonVatOrder ? 0 : vatPct;
    const newSubtotal = qty * effectivePrice;
    const newVat = (newSubtotal * effectiveVat) / 100;
    setSubtotal(newSubtotal);
    setVatAmount(newVat);
    setTotalAmount(newSubtotal + newVat);
  };

  // Calculate subtotal when quantity or price changes
  const handleQuantityChange = (value: number | null) => {
    const next = value && value > 0 ? value : 0;
    setQuantity(next);
    recomputeTotals(price, next, discountPercent || promotionDiscountPercent, vatPercent);
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    recomputeTotals(value, quantity, discountPercent || promotionDiscountPercent, vatPercent);
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

    setIsProcessingAdd(true);
    try {
      const ok = await checkInventoryBeforeAction();
      if (!ok) {
        setIsProcessingAdd(false);
        return;
      }

      // Reserve inventory trước khi add sản phẩm vào đơn nháp
      // Sử dụng baseQuantity (theo đơn vị chuẩn) để reserve
      if (selectedProductCode && warehouse && quantity > 0) {
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

    const candidates = [
      promo.valueWithVat,
      promo.valueNoVat,
      promo.value,
      promo.value2,
      promo.value3,
      promo.valueBuyTogether,
    ];
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
    // If user already picked a date, still allow auto-update when core inputs change (mimic canvas behavior)
    const today = new Date();

    // TODO: when industry & leadtime by district are available, refine logic for "Shop"
    // Current simplified logic:
    // - If quantity converted > stock -> today + 2 days
    // - Else today + 1 day
    const qty = quantity || 0;
    const stock = stockQuantity || 0;

    const daysToAdd = qty > stock ? 2 : 1;
    const target = new Date(today);
    target.setDate(today.getDate() + daysToAdd);

    setDeliveryDate(formatDate(target));
  }, [quantity, stockQuantity, setDeliveryDate]);

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
    } else {
      // KHI BẬT "DUYỆT GIÁ": Chiết khấu 1 = 0 (không tính chiết khấu từ promotion)
      setDiscountPercent(0);
      setPromotionDiscountPercent(0);
      // Recompute totals với chiết khấu = 0
      recomputeTotals(price, quantity, 0, vatPercent);
    }
  }, [approvePrice, setApprover]);

  return (
    <div className="admin-app-card-compact">
      <div className="admin-app-card-title-row">
        <h3 className="admin-app-card-title">Thông tin sản phẩm</h3>
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
      <div className="admin-app-form-compact">
        {/* Row 1: Product, Unit, Warehouse */}
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
              options={units.map((u) => ({
                value: u.crdfd_unitsid,
                label: u.crdfd_name,
                ...u,
              }))}
              value={unitId}
              onChange={(value, option) => {
                setUnitId(value);
                setUnit(option?.label || '');
                userSelectedUnitRef.current = true; // Đánh dấu người dùng đã chọn đơn vị
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
        </div>

        {/* Row 2: Quantity, Price, Add Button */}
        <div className="admin-app-form-row-compact admin-app-product-row-2">
          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">Số lượng</label>
            <div className="admin-app-input-wrapper">
              <input
                type="number"
                className="admin-app-input admin-app-input-compact admin-app-input-number"
                value={quantity > 0 ? quantity : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseInt(e.target.value);
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
            <label className="admin-app-label-inline">Giá</label>
            <div className="admin-app-input-wrapper" style={{ position: 'relative' }}>
              {priceLoading && (
                <div className="admin-app-input-loading-spinner">
                  <div className="admin-app-spinner admin-app-spinner-small"></div>
                </div>
              )}
              <input
                type="text"
                className={`admin-app-input admin-app-input-compact admin-app-input-money${priceLoading || !approvePrice || (approvePrice && priceEntryMethod === 'Theo chiết khấu') ? ' admin-app-input-readonly' : ''}`}
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder={priceLoading ? "Đang tải..." : "Giá"}
                readOnly={priceLoading || !approvePrice || (approvePrice && priceEntryMethod === 'Theo chiết khấu')}
                disabled={isFormDisabled || !approvePrice}
                style={priceLoading ? { paddingRight: '32px' } : undefined}
              />
            </div>
          </div>

          <div className="admin-app-field-compact admin-app-field-add-button">
            <label className="admin-app-label-inline" style={{ visibility: 'hidden' }}>Add</label>
            <button
              type="button"
              className="admin-app-mini-btn admin-app-mini-btn-add"
              onClick={handleAddWithInventoryCheck}
              disabled={buttonsDisabled || isAdding || isProcessingAdd}
              title="Thêm sản phẩm"
              aria-label="Thêm sản phẩm"
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

        {/* Row 3: Promotion - Chỉ hiển thị khi có chương trình khuyến mãi */}
        {(promotionLoading || promotions.length > 0) && (
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
                      title={selectedPromotion?.name ? `Tên CTKM: ${selectedPromotion.name}` : undefined}
                    >
                      {promotions.map((promo) => {
                        const toNumber = (v: any) => {
                          const n = Number(v);
                          return isNaN(n) ? null : n;
                        };
                        const displayValue =
                          toNumber(promo.valueWithVat) ??
                          toNumber(promo.valueNoVat) ??
                          toNumber(promo.value) ??
                          toNumber(promo.value2) ??
                          toNumber(promo.value3) ??
                          toNumber(promo.valueBuyTogether);
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

        {/* Row 3: VAT% (only for VAT SO), Subtotal/Total (only after product selected) */}
        <div className="admin-app-form-row-compact admin-app-form-row-summary admin-app-form-row-summary-no-stock">
          {isVatSo && (
            <div className="admin-app-field-compact admin-app-field-vat">
              <label className="admin-app-label-inline">VAT (%)</label>
              <input
                type="number"
                className="admin-app-input admin-app-input-compact admin-app-input-readonly"
                value={vatPercent}
                readOnly
              />
            </div>
          )}

          {hasSelectedProduct && (
            <div className="admin-app-field-compact admin-app-field-total">
              <label className="admin-app-label-inline">Thành tiền</label>
              <input
                type="text"
                className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money"
                value={`${subtotal.toLocaleString('vi-VN')} ₫`}
                readOnly
              />
            </div>
          )}

          {hasSelectedProduct && (
            <div className="admin-app-field-compact admin-app-field-grand-total">
              <label className="admin-app-label-inline">Tổng tiền</label>
              <input
                type="text"
                className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money admin-app-input-total"
                value={`${totalAmount.toLocaleString('vi-VN')} ₫`}
                readOnly
              />
            </div>
          )}

        </div>
      </div>

      {/* Price Approval Section - Collapsible */}
      {approvePrice && (
        <div className="admin-app-form-row-compact admin-app-form-row-approval">
          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">Phương thức</label>
            <Dropdown
              options={[
                { value: 'Nhập thủ công', label: 'Nhập thủ công' },
                { value: 'Theo chiết khấu', label: 'Theo chiết khấu' },
              ]}
              value={priceEntryMethod}
              onChange={(value) => {
                setPriceEntryMethod(value as 'Nhập thủ công' | 'Theo chiết khấu');
                if (value === 'Nhập thủ công' && basePriceForDiscount > 0) {
                  handlePriceChange(String(Math.round(basePriceForDiscount)));
                }
              }}
              placeholder="Chọn phương thức"
              disabled={isFormDisabled}
            />
          </div>

          {priceEntryMethod === 'Theo chiết khấu' && (
            <div className="admin-app-field-compact">
              <label className="admin-app-label-inline">Chiết khấu (%)</label>
              <Dropdown
                options={discountRates.map((rate) => ({
                  value: rate,
                  label: rate,
                }))}
                value={discountRate}
                onChange={(value) => setDiscountRate(value)}
                placeholder="Chọn tỉ lệ"
                disabled={isFormDisabled}
              />
            </div>
          )}

          <div className="admin-app-field-compact">
            <label className="admin-app-label-inline">
              Người duyệt
              {approvePrice && <span className="admin-app-required">*</span>}
            </label>
            <Dropdown
              options={approversList.map((name) => ({
                value: name,
                label: name,
              }))}
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

