'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrderBaoGia } from '../_hooks/useDropdownData';
import { saveSOBGDetails, fetchSOBGDetails, SaleOrderDetail, fetchPromotionOrders, fetchPromotionOrdersSOBG, fetchSpecialPromotionOrders, applySOBGPromotionOrder, PromotionOrderItem, SOBaoGia } from '../_api/adminApi';
import { showToast } from '../../../components/ToastManager';
import { getItem } from '../../../utils/SecureStorage';
import { getStoredUser } from '../_utils/implicitAuthService';

interface ProductItem {
  id: string;
  stt?: number;
  productCode?: string;
  productId?: string;
  productName: string;
  productGroupCode?: string;
  productCategoryLevel4?: string;
  unit: string;
  unitId?: string;
  quantity: number;
  price: number;
  surcharge: number;
  discount: number;
  discountedPrice: number;
  vat: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  approver: string;
  deliveryDate: string;
  isSodCreated?: boolean;
  warehouse?: string;
  note?: string;
  urgentOrder?: boolean;
  approvePrice?: boolean;
  approveSupPrice?: boolean;
  approveSupPriceId?: string;
  discountPercent?: number;
  discountAmount?: number;
  discount2?: number;
  discount2Enabled?: boolean;
  promotionText?: string;
  invoiceSurcharge?: number; // Phụ phí hoá đơn
  createdOn?: string;
  isModified?: boolean; // Flag để đánh dấu dòng đã sửa
  originalQuantity?: number; // Lưu số lượng gốc để so sánh
  promotionId?: string; // Optional promotion lookup id
}

interface SalesOrderBaoGiaFormProps {
  hideHeader?: boolean;
}

export default function SalesOrderBaoGiaForm({ hideHeader = false }: SalesOrderBaoGiaFormProps) {
  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [so, setSo] = useState('');
  const [soId, setSoId] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isOrderInfoCollapsed, setIsOrderInfoCollapsed] = useState(false);

  // Fetch data for dropdowns
  const { customers, loading: customersLoading } = useCustomers(customerSearch);
  // Load SOBG instead of SO
  const { soBaoGiaList, loading: soLoading } = useSaleOrderBaoGia(customerId || undefined);

  const [product, setProduct] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productGroupCode, setProductGroupCode] = useState('');
  const [unit, setUnit] = useState('');
  const [unitId, setUnitId] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [approvePrice, setApprovePrice] = useState(false);
  const [approveSupPrice, setApproveSupPrice] = useState(false);
  const [urgentOrder, setUrgentOrder] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [customerIndustry, setCustomerIndustry] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [approver, setApprover] = useState('');
  const [priceEntryMethod, setPriceEntryMethod] = useState<'Nhập thủ công' | 'Theo chiết khấu'>('Nhập thủ công');
  const [discountRate, setDiscountRate] = useState<string>('1');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discount2, setDiscount2] = useState(0);
  const [discount2Enabled, setDiscount2Enabled] = useState(false);

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
    'Hoàng Thị Mỹ Linh',
  ];

  const discountRates = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20'];
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promotionText, setPromotionText] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [productList, setProductList] = useState<ProductItem[]>([]);

  // Promotion Order Popup state
  const [showPromotionOrderPopup, setShowPromotionOrderPopup] = useState(false);
  const [promotionOrderList, setPromotionOrderList] = useState<PromotionOrderItem[]>([]);
  const [specialPromotionList, setSpecialPromotionList] = useState<PromotionOrderItem[]>([]);
  const [selectedPromotionOrders, setSelectedPromotionOrders] = useState<PromotionOrderItem[]>([]);
  const [isApplyingPromotion, setIsApplyingPromotion] = useState(false);
  const SPECIAL_PROMOTION_KEYWORDS = [
    '[ALL] GIẢM GIÁ ĐẶC BIỆT',
    '[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA',
    '[ALL] VOUCHER SINH NHẬT'
  ];

  // Kiểm tra có sản phẩm chưa lưu để enable nút Save
  const hasUnsavedProducts = productList.some(p => p.isSodCreated !== true);
  const isSaveDisabled = isSaving || !hasUnsavedProducts;

  // Tổng hợp tiền toàn đơn hàng
  const orderSummary = useMemo(() => {
    return productList.reduce(
      (acc, item) => {
        const lineSubtotal = (item.discountedPrice || item.price) * item.quantity;
        const lineVat = (lineSubtotal * item.vat) / 100;
        acc.subtotal += lineSubtotal;
        acc.vat += lineVat;
        acc.total += lineSubtotal + lineVat;
        return acc;
      },
      { subtotal: 0, vat: 0, total: 0 }
    );
  }, [productList]);

  // Helper to derive VAT text from SOBG record
  const getVatLabelText = useCallback((so: any) => {
    if (!so) return '';
    const vatText = (so.vatText || '').trim();
    if (vatText) return vatText;
    if (so.vat === 191920000) return 'Có VAT';
    if (so.vat === 191920001) return 'Không VAT';
    return '';
  }, []);

  // Payment terms OptionSet mapping (value -> label)
  const PAYMENT_TERMS_MAP: Record<string, string> = {
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
  };

  const getPaymentTermLabel = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return null;
    const key = String(value);
    if (PAYMENT_TERMS_MAP[key]) return PAYMENT_TERMS_MAP[key];
    return value;
  };

  const selectedSo = soBaoGiaList.find((so) => so.id === soId);
  const selectedVatText = getVatLabelText(selectedSo);
  const isNonVatSelected = (selectedVatText || '').toLowerCase().includes('không');
  // Debug logs for payment term fields

  // Helper function to generate SO label from SOBG object (giống SO - không có VAT text trong label)
  const generateSoLabel = useCallback((so: any): string => {
    const soCode = so?.soCode || so?.soAuto || '';
    const soName = (so?.name || so?.tenDonHang || '').trim();

    if (soName && soCode) {
      const soNameLower = soName.toLowerCase();
      const soCodeLower = soCode.toLowerCase();
      if (soNameLower.includes(soCodeLower)) {
        return soName;
      } else {
        return `${soCode} - ${soName}`;
      }
    } else if (soCode) {
      return soCode;
    } else if (soName) {
      return soName;
    } else {
      return 'SOBG không tên';
    }
  }, []);

  // Auto-select SOBG mới nhất (chỉ khi chưa có soId - lần đầu chọn khách hàng)
  useEffect(() => {
    if ((!soId || soId.trim() === '') && soBaoGiaList && soBaoGiaList.length > 0) {
      // Find the SOBG with newest created date
      const parseDate = (s: any) => {
        const d = s?.createdon ?? s?.createdOn ?? s?.crdfd_createdon ?? s?.created;
        const t = d ? Date.parse(d) : NaN;
        return isNaN(t) ? 0 : t;
      };
      const newest = soBaoGiaList.reduce((best, cur) => {
        return parseDate(cur) > parseDate(best) ? cur : best;
      }, soBaoGiaList[0]);
      if (newest && newest.id) {
        setSoId(newest.id);
        setSo(generateSoLabel(newest));
      }
    }
  }, [soBaoGiaList]); 


  // Sync SO label
  useEffect(() => {
    if (soId && soBaoGiaList.length > 0) {
      const currentSo = soBaoGiaList.find(so => so.id === soId);
      if (currentSo) {
        const baseLabel = generateSoLabel(currentSo);
        setSo(prev => prev !== baseLabel ? baseLabel : prev);
      }
    }
  }, [soId, soBaoGiaList, generateSoLabel]);

  // Load SOBG Details when sobgId changes (tương tự SO form)
  useEffect(() => {
    const loadSOBGDetails = async () => {
      // Kiểm tra soId hợp lệ (không rỗng và là GUID hợp lệ)
      if (!soId || soId.trim() === '') {
        setProductList([]);
        return;
      }

      // Validate GUID format
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidPattern.test(soId)) {
        console.warn('Invalid soId format, skipping load:', { soId });
        setProductList([]);
        return;
      }

      // Đảm bảo có customerId trước khi load
      if (!customerId) {
        console.warn('Cannot load SOBG details: customerId is missing', { soId, customerId });
        setProductList([]);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const details = await fetchSOBGDetails(soId, customerId);
        // Map SaleOrderDetail to ProductItem
        const mappedProducts: ProductItem[] = details.map((detail: SaleOrderDetail) => {
          // Sử dụng giá trị đã tính từ API thay vì tính lại
          // API đã tính subtotal, vatAmount, totalAmount dựa trên discountedPrice
          const subtotal = detail.subtotal ?? ((detail.discountedPrice || detail.price) * detail.quantity);
          const vatAmount = detail.vatAmount ?? (subtotal * detail.vat / 100);
          return {
            id: detail.id,
            stt: detail.stt,
            productCode: detail.productCode, // Lấy từ API
            productId: detail.productId, // Lấy từ API
            productGroupCode: detail.productGroupCode, // Lấy từ API
            productName: detail.productName,
            unit: detail.unit,
            quantity: detail.quantity,
            price: detail.price,
            surcharge: detail.surcharge || 0,
            discount: detail.discount || 0,
            discountedPrice: detail.discountedPrice || detail.price,
            vat: detail.vat,
            subtotal: detail.subtotal ?? subtotal,
            vatAmount: detail.vatAmount ?? vatAmount,
            totalAmount: detail.totalAmount,
            approver: detail.approver || '',
            deliveryDate: detail.deliveryDate || '',
            warehouse: warehouse, // Lấy từ state warehouse
            note: detail.note || '',
            approvePrice: detail.approvePrice || false,
            approveSupPrice: detail.approveSupPrice || false,
            discountPercent: detail.discountPercent || 0,
            discountAmount: detail.discountAmount || 0,
            promotionText: detail.promotionText || '',
            promotionId: (detail as any).promotionId || undefined,
            invoiceSurcharge: detail.invoiceSurcharge || 0,
            // Map chiết khấu 2 (stored as decimal or percent)
            discount2: (() => {
              const raw = (detail as any).crdfd_chieckhau2 ?? (detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2 ?? 0;
              const num = Number(raw) || 0;
              if (num > 0 && num <= 1) return Math.round(num * 100);
              return num;
            })(),
            discount2Enabled: Boolean((detail as any).crdfd_chieckhau2 ?? (detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2),
            isSodCreated: true,
            isModified: false, // Mặc định chưa sửa
            originalQuantity: detail.quantity, // Lưu số lượng gốc
          };
        });
        // Sort by STT descending (already sorted by API, but ensure it)
        mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
        setProductList(mappedProducts);
      } catch (error) {
        console.error('Error loading SOBG details:', error);
        setProductList([]);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadSOBGDetails();
  }, [soId, customerId]);

  const handleAddProduct = async () => {
    // Validation: product, unit, quantity, price (bắt buộc phải có giá > 0)
    const priceNum = parseFloat(price || '0') || 0;
    const hasValidPrice = priceNum > 0;

    if (!product || !unit || quantity <= 0 || !hasValidPrice) {
      console.warn('❌ Add Product Failed: Missing required fields', {
        product: !!product,
        unit: !!unit,
        quantity,
        price: priceNum,
        hasValidPrice,
        approvePrice,
      });

      // Hiển thị thông báo lỗi cụ thể
      if (!product) {
        showToast.error('Vui lòng chọn sản phẩm');
      } else if (!unit) {
        showToast.error('Vui lòng chọn đơn vị');
      } else if (quantity <= 0) {
        showToast.error('Số lượng phải lớn hơn 0');
      } else if (!hasValidPrice) {
        showToast.error('Vui lòng nhập giá');
      }
      return;
    }

    setIsAdding(true);
    // Add small delay for animation feedback
    await new Promise(resolve => setTimeout(resolve, 100));

    // Calculate invoice surcharge (Phụ phí hoá đơn)
    // 1.5% for "Hộ kinh doanh" + "Không VAT" orders
    const selectedSo = soBaoGiaList.find((so) => so.id === soId);
    const isHoKinhDoanh = selectedSo?.loaiHoaDon === 191920001; // TODO: confirm OptionSet value
    const isNonVat = vatPercent === 0;
    const invoiceSurchargeRate = isHoKinhDoanh && isNonVat ? 0.015 : 0;

    // Calculate discounted price using the same method as ProductEntryForm/SalesOrderForm:
    // apply percentage discount directly on the displayed price (priceNum), then subtract any VND discount,
    // then apply invoice surcharge if applicable.
    const basePrice = priceNum;
    const discountedPriceCalc = basePrice * (1 - (discountPercent || 0) / 100) - (discountAmount || 0);
    const finalPrice = discountedPriceCalc * (1 + invoiceSurchargeRate);

    // Check if product already exists with same productCode/productName, unit, and price
    // Only combine products that haven't been saved to CRM (isSodCreated = false)
    const existingProductIndex = productList.findIndex((p) => {
      const sameProduct = (productCode && p.productCode === productCode) ||
        (!productCode && p.productName === product);
      const sameUnit = p.unit === unit;
      const samePrice = Math.abs(p.price - priceNum) < 0.01; // Compare with small tolerance for floating point
      const notSaved = !p.isSodCreated; // Only combine unsaved products

      return sameProduct && sameUnit && samePrice && notSaved;
    });

    if (existingProductIndex !== -1) {
      // Combine with existing product: add quantities and recalculate
      const existingProduct = productList[existingProductIndex];
      const newQuantity = existingProduct.quantity + quantity;

      // Recalculate amounts with new total quantity
      const newSubtotal = newQuantity * finalPrice;
      const newVatAmount = (newSubtotal * vatPercent) / 100;
      const newTotalAmount = newSubtotal + newVatAmount;

      // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ input
      const formattedNoteForMerge = approvePrice && approver
        ? `Duyệt giá bởi ${approver}`
        : note;

      // Update existing product
      const updatedProduct: ProductItem = {
        ...existingProduct,
        quantity: newQuantity,
        subtotal: newSubtotal,
        vatAmount: newVatAmount,
        totalAmount: newTotalAmount,
        // Update other fields from new input (in case they changed)
        discount: discountAmount,
        discountedPrice: finalPrice,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        vat: vatPercent,
        invoiceSurcharge: invoiceSurchargeRate,
        // Merge notes if both have notes
        note: existingProduct.note && formattedNoteForMerge
          ? `${existingProduct.note}; ${formattedNoteForMerge}`
          : existingProduct.note || formattedNoteForMerge,
        // Đảm bảo isSodCreated = false khi combine (vì chỉ combine với sản phẩm chưa lưu)
        isSodCreated: false,
      };

      // Update product list
      const updatedList = [...productList];
      updatedList[existingProductIndex] = updatedProduct;
      setProductList(updatedList);
    } else {
      // Add new product
      // Calculate amounts
      const subtotalCalc = quantity * finalPrice;
      const vatCalc = (subtotalCalc * vatPercent) / 100;
      const totalCalc = subtotalCalc + vatCalc;

      // Auto-increment STT
      const maxStt = productList.length > 0 ? Math.max(...productList.map((p) => p.stt || 0)) : 0;
      const newStt = maxStt + 1;

      // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ input
      const formattedNote = approvePrice && approver
        ? `Duyệt giá bởi ${approver}`
        : note;

      const newProduct: ProductItem = {
        id: `${Date.now()}-${newStt}`,
        stt: newStt,
        productCode: productCode,
        productName: product,
        productGroupCode: productGroupCode,
        unit: unit,
        quantity,
        price: priceNum,
        surcharge: 0,
        discount: discountAmount,
        discountedPrice: finalPrice,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        vat: vatPercent,
        subtotal: subtotalCalc,
        vatAmount: vatCalc,
        totalAmount: totalCalc,
        approver: approver,
        deliveryDate: deliveryDate,
        warehouse: warehouse,
        note: formattedNote,
        urgentOrder: urgentOrder,
        approvePrice: approvePrice,
        approveSupPrice: approveSupPrice,
        promotionText: promotionText,
        invoiceSurcharge: invoiceSurchargeRate,
        createdOn: new Date().toISOString(),
        isSodCreated: false,
      };

      setProductList([...productList, newProduct]);
    }

    // Reset form fields (mimic PowerApps Reset())
    setProduct('');
    setProductCode('');
    setProductGroupCode('');
    setUnit('');
    setQuantity(1);
    setPrice('');
    setSubtotal(0);
    setVatAmount(0);
    setTotalAmount(0);
    setApprovePrice(false);
    setApproveSupPrice(false);
    setUrgentOrder(false);
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setNote('');
    // Keep warehouse, customer, SOBG, deliveryDate as they are reused

    setIsAdding(false);
    showToast.success('Đã thêm sản phẩm vào danh sách!');

    // Promotion popup will be triggered only after save, not when adding products
  };

  // Refresh SOBG details programmatically
  const handleRefreshSOBGDetails = async () => {
    if (!soId || soId.trim() === '' || !customerId) {
      console.warn('Cannot refresh SOBG details: missing soId or customerId', { soId, customerId });
      return;
    }

    try {
      setIsLoadingDetails(true);
      const details = await fetchSOBGDetails(soId, customerId);
      const mappedProducts: ProductItem[] = details.map((detail: SaleOrderDetail) => {
        const subtotal = detail.subtotal ?? ((detail.discountedPrice || detail.price) * detail.quantity);
        const vatAmount = detail.vatAmount ?? (subtotal * detail.vat / 100);
        return {
          id: detail.id,
          stt: detail.stt,
          productCode: detail.productCode,
          productId: detail.productId,
          productGroupCode: detail.productGroupCode,
          productName: detail.productName,
          unit: detail.unit,
          quantity: detail.quantity,
          price: detail.price,
          surcharge: detail.surcharge || 0,
          discount: detail.discount || 0,
          discountedPrice: detail.discountedPrice || detail.price,
          vat: detail.vat,
          subtotal: detail.subtotal ?? subtotal,
          vatAmount: detail.vatAmount ?? vatAmount,
          totalAmount: detail.totalAmount,
          approver: detail.approver || '',
          deliveryDate: detail.deliveryDate || '',
          warehouse: warehouse,
          note: detail.note || '',
          approvePrice: detail.approvePrice || false,
          approveSupPrice: detail.approveSupPrice || false,
          discountPercent: detail.discountPercent || 0,
          discountAmount: detail.discountAmount || 0,
          promotionText: detail.promotionText || '',
          invoiceSurcharge: detail.invoiceSurcharge || 0,
          discount2: (() => {
            const raw = (detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2 ?? 0;
            const num = Number(raw) || 0;
            if (num > 0 && num <= 1) return Math.round(num * 100);
            return num;
          })(),
          discount2Enabled: Boolean((detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2),
          isSodCreated: true,
          isModified: false,
          originalQuantity: detail.quantity,
          promotionId: (detail as any).promotionId || undefined,
        };
      });
      mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
      setProductList(mappedProducts);
    } catch (error) {
      console.error('Error refreshing SOBG details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSave = async () => {
    const unsavedProducts = productList.filter(p => !p.isSodCreated);
    if (unsavedProducts.length === 0) {
      showToast.warning('Không có sản phẩm mới để lưu.');
      return;
    }

    const productsWithInvalidQuantity = unsavedProducts.filter(p => !p.quantity || p.quantity <= 0);
    if (productsWithInvalidQuantity.length > 0) {
      const productNames = productsWithInvalidQuantity.map(p => p.productName).join(', ');
      showToast.error(`Số lượng phải lớn hơn 0 cho các sản phẩm: ${productNames}`);
      return;
    }

    if (!soId) {
      showToast.error('Vui lòng chọn SOBG trước khi lưu.');
      return;
    }

    setIsSaving(true);
    try {
      const customerLoginIdRaw = getItem('id');
      const customerLoginId = (typeof customerLoginIdRaw === 'string' ? customerLoginIdRaw : String(customerLoginIdRaw || '')).trim() || undefined;
      const isVatOrder = selectedVatText?.toLowerCase().includes('có vat') || false;

      const productsToSave = unsavedProducts.map((item) => {
        const formattedNote = item.approvePrice && item.approver ? `Duyệt giá bởi ${item.approver}` : item.note || '';
        return {
          id: undefined,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          productGroupCode: item.productGroupCode,
          productCategoryLevel4: item.productCategoryLevel4,
          unitId: item.unitId,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          discountedPrice: item.discountedPrice ?? item.price,
          originalPrice: item.price,
          vat: item.vat,
          vatAmount: item.vatAmount,
          subtotal: item.subtotal,
          totalAmount: item.totalAmount,
          stt: item.stt || 0,
          deliveryDate: item.deliveryDate,
          note: formattedNote,
          urgentOrder: item.urgentOrder,
          approvePrice: item.approvePrice,
          approveSupPrice: item.approveSupPrice,
          approveSupPriceId: item.approveSupPriceId,
          approver: item.approver,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          promotionText: item.promotionText,
          // Include promotionId if provided by frontend or if a selectedPromotionOrders matches this product
          promotionId: item.promotionId ?? (() => {
            try {
              if (!selectedPromotionOrders || selectedPromotionOrders.length === 0) return undefined;
              const prodCode = (item.productCode || '').toString().trim().toUpperCase();
              const prodGroup = (item.productGroupCode || '').toString().trim().toUpperCase();
              for (const promo of selectedPromotionOrders) {
                const codesRaw = promo.productCodes || '';
                const groupsRaw = promo.productGroupCodes || '';
                const codes = Array.isArray(codesRaw) ? codesRaw : String(codesRaw).split(',').map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean);
                const groups = Array.isArray(groupsRaw) ? groupsRaw : String(groupsRaw).split(',').map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean);
                const matchProduct = codes.length === 0 || (prodCode && codes.some((c: string) => prodCode.includes(c)));
                const matchGroup = groups.length === 0 || (prodGroup && groups.some((g: string) => prodGroup.includes(g)));
                if ((codes.length === 0 && groups.length === 0) || matchProduct || matchGroup) {
                  return promo.id;
                }
              }
            } catch (e) {
              return undefined;
            }
            return undefined;
          })(),
          discount2: item.discount2 ?? 0,
          discount2Enabled: item.discount2Enabled ?? false,
          invoiceSurcharge: item.invoiceSurcharge,
        };
      });

      const userInfo = getStoredUser();

      // Debug: log products payload to ensure promotionId is present

      const result = await saveSOBGDetails({
        sobgId: soId,
        warehouseName: warehouse,
        isVatOrder,
        customerIndustry: customerIndustry,
        customerLoginId,
        customerId: customerId || undefined,
        userInfo: userInfo ? {
          username: userInfo.username,
          name: userInfo.name,
          email: userInfo.email,
        } : undefined,
        products: productsToSave,
      });

      // Kiểm tra nếu có sản phẩm thất bại
      if (result.partialSuccess || (result.totalFailed && result.totalFailed > 0)) {
        const totalSaved = result.totalSaved ?? 0;
        const totalRequested = result.totalRequested ?? 0;
        const totalFailed = result.totalFailed ?? 0;
        const message = result.message || `Đã lưu ${totalSaved}/${totalRequested} sản phẩm. ${totalFailed} sản phẩm thất bại.`;
        showToast.warning(message);

        // Log chi tiết các sản phẩm thất bại
        if (result.failedProducts && result.failedProducts.length > 0) {
          console.error('Các sản phẩm thất bại:', result.failedProducts);
          result.failedProducts.forEach((failed: any) => {
            console.error(`- ${failed.productName || failed.productCode}: ${failed.error}`);
          });
        }
      } else {
        showToast.success(result.message || 'Tạo đơn bán chi tiết thành công!');
      }

      // After save: clear product input fields (keep customer and SOBG in UI until we decide)
      setProduct('');
      setProductCode('');
      setProductGroupCode('');
      setUnit('');
      setUnitId('');
      setQuantity(1);
      setPrice('');
      setSubtotal(0);
      setVatPercent(0);
      setVatAmount(0);
      setTotalAmount(0);
      setStockQuantity(0);
      setApprovePrice(false);
      setApproveSupPrice(false);
      setUrgentOrder(false);
      setDeliveryDate('');
      // Keep note - không clear ghi chú
      setApprover('');
      setDiscountPercent(0);
      setDiscountAmount(0);
      setPromotionText('');

      // Prepare saved identifiers and totals BEFORE any potential clearing so we can check promotions
      const savedSoId = soId;
      const savedCustomerCode = customerCode;
      const savedProductCodes = productsToSave.map(p => p.productCode).filter(Boolean) as string[];
      const savedProductGroupCodes = productsToSave.map(p => p.productGroupCode).filter(Boolean) as string[];
      const savedTotalAmount = selectedSo?.crdfd_tongtiencovat ?? selectedSo?.crdfd_tongtien ?? orderSummary.total;

      // After save: check promotion orders and show popup similar to SalesOrderForm
      try {

        const promotionOrderResult = await fetchPromotionOrdersSOBG(
          savedSoId,
          savedCustomerCode,
          savedTotalAmount,
          savedProductCodes,
          savedProductGroupCodes,
          selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
        );

        // Chỉ hiển thị popup nếu có promotion chiết khấu 2 (chietKhau2 = true)
        const chietKhau2Promotions = promotionOrderResult.allPromotions?.filter(p => p.chietKhau2) || [];

        // Also surface special promotions similar to SalesOrderForm
        let special: PromotionOrderItem[] = [];
        if (Array.isArray(promotionOrderResult.specialPromotions) && promotionOrderResult.specialPromotions.length > 0) {
          special = promotionOrderResult.specialPromotions;
        } else {
          special = (promotionOrderResult.allPromotions || []).filter((p: PromotionOrderItem) =>
            SPECIAL_PROMOTION_KEYWORDS.some(k => !!p.name && p.name.includes(k))
          );
        }
        special = special.filter(p => (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'));
        if (special.length > 0) setSpecialPromotionList(special);

        // Use allPromotions but filter out those not applicable or not meeting total condition
        const allPromos: PromotionOrderItem[] = promotionOrderResult.allPromotions || [];
        const available: PromotionOrderItem[] = allPromos.filter(p => {
          const cond = Number(p.totalAmountCondition || 0);
          const meetsTotal = isNaN(cond) || cond === 0 || Number(savedTotalAmount) >= cond;
          const isApplicable = (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true');
          return isApplicable && meetsTotal;
        });
        setPromotionOrderList(available.length > 0 ? available : chietKhau2Promotions);

        // Pre-select chietKhau2 promotions if present
        if (chietKhau2Promotions.length > 0) {
          setSelectedPromotionOrders(chietKhau2Promotions);
        } else {
          setSelectedPromotionOrders([]);
        }

        // Show popup if there are any available, chiết khấu 2, or special promotions
        if ((available && available.length > 0) || (chietKhau2Promotions && chietKhau2Promotions.length > 0) || (special && special.length > 0)) {
          setSoId(savedSoId);
          setShowPromotionOrderPopup(true);
        } else {
          // No promotions to show -> keep current behavior
        }
      } catch (err: any) {
        console.error('[SOBG Promotion] ❌ Error checking promotion orders after save:', err);
      }
        // Mark saved products as created when API returns savedDetails (even on full success)
        if (result.savedDetails && result.savedDetails.length > 0) {
          setProductList(prevList => {
            const savedCodes = new Set(result.savedDetails.map((p: any) => p.productCode).filter(Boolean));
            return prevList.map(item => item.productCode && savedCodes.has(item.productCode) ? { ...item, isSodCreated: true } : item);
          });
        }
      if (result.partialSuccess || (result.totalFailed && result.totalFailed > 0)) {
        if (result.savedDetails && result.savedDetails.length > 0) {
          setProductList(prevList => {
            const savedCodes = new Set(result.savedDetails.map((p: any) => p.productCode).filter(Boolean));
            return prevList.map(item => item.productCode && savedCodes.has(item.productCode) ? { ...item, isSodCreated: true } : item);
          });
        }
      }

      setIsSaving(false);
    } catch (error: any) {
      console.error('Error saving SOBG details:', error);
      showToast.error(error.message || 'Lỗi khi lưu.');
      setIsSaving(false);
    }
  };

  // Clear các selected khi đổi SOBG (giữ lại customer, SOBG mới, deliveryDate)
  const clearFormOnSoChange = () => {
    setProduct('');
    setProductCode('');
    setProductGroupCode('');
    setUnit('');
    setWarehouse('');
    setQuantity(1);
    setPrice('');
    setSubtotal(0);
    setVatAmount(0);
    setTotalAmount(0);
    setStockQuantity(0);
    setApprovePrice(false);
    setApproveSupPrice(false);
    setUrgentOrder(false);
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    // Keep note, customer, SOBG (đang được set mới), deliveryDate as they are reused
  };

  // Clear everything (customer, SOBG, form, product list) after save if requested
  const clearEverything = () => {
    setCustomer('');
    setCustomerId('');
    setCustomerCode('');
    setSo('');
    setSoId('');
    setProduct('');
    setProductCode('');
    setProductGroupCode('');
    setUnit('');
    setUnitId('');
    setWarehouse('');
    setQuantity(1);
    setPrice('');
    setSubtotal(0);
    setVatPercent(0);
    setVatAmount(0);
    setTotalAmount(0);
    setStockQuantity(0);
    setApprovePrice(false);
    setApproveSupPrice(false);
    setUrgentOrder(false);
    setDeliveryDate('');
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setProductList([]);
    setNote('');
    setDiscount2(0);
    setDiscount2Enabled(false);
    setPriceEntryMethod('Nhập thủ công');
    setDiscountRate('1');
  };

  const handleRefresh = async () => {
    setCustomer('');
    setCustomerId('');
    setCustomerCode('');
    setSo('');
    setSoId('');
    setProduct('');
    setProductCode('');
    setProductGroupCode('');
    setUnit('');
    setWarehouse('');
    setQuantity(1);
    setPrice('');
    setSubtotal(0);
    setVatPercent(0);
    setVatAmount(0);
    setTotalAmount(0);
    setStockQuantity(0);
    setApprovePrice(false);
    setApproveSupPrice(false);
    setUrgentOrder(false);
    setDeliveryDate('14/12/2025');
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setProductList([]);
  };

  // Handler để update một sản phẩm đơn lẻ (Inline Edit)
  const handleUpdateProduct = async (product: ProductItem) => {
    if (!soId) {
      showToast.error('Vui lòng chọn SOBG trước khi cập nhật.');
      return;
    }

    if (!product.id) {
      showToast.error('Không thể cập nhật: sản phẩm chưa có ID.');
      return;
    }

    const selectedSo = soBaoGiaList.find((so) => so.id === soId);
    const isVatOrder = selectedVatText?.toLowerCase().includes('có vat') || false;

    // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ item.note
    const formattedNote = product.approvePrice && product.approver
      ? `Duyệt giá bởi ${product.approver}`
      : product.note || '';

    try {
      const customerLoginIdRaw = getItem('id');
      const customerLoginId = (typeof customerLoginIdRaw === 'string' ? customerLoginIdRaw : String(customerLoginIdRaw || '')).trim() || undefined;
      const userInfo = getStoredUser();

      // Gọi API để update single SOD (Quote Detail)
      // Note: SOBG không check/trừ tồn kho nên không cần logic inventory như SalesOrderForm
      const result = await saveSOBGDetails({
        sobgId: soId,
        warehouseName: warehouse,
        isVatOrder,
        customerIndustry: customerIndustry,
        customerLoginId,
        customerId: customerId || undefined,
        userInfo: userInfo ? {
          username: userInfo.username,
          name: userInfo.name,
          email: userInfo.email,
        } : undefined,
        products: [{
          id: product.id, // Gửi ID để update
          productId: product.productId,
          productCode: product.productCode,
          productName: product.productName,
          productGroupCode: product.productGroupCode,
          productCategoryLevel4: product.productCategoryLevel4,
          unitId: product.unitId,
          unit: product.unit,
          quantity: product.quantity,
          price: product.price,
          discountedPrice: product.discountedPrice ?? product.price,
          originalPrice: product.price,
          vat: product.vat,
          vatAmount: product.vatAmount,
          subtotal: product.subtotal,
          totalAmount: product.totalAmount,
          stt: product.stt || 0,
          deliveryDate: product.deliveryDate,
          note: formattedNote,
          urgentOrder: product.urgentOrder,
          approvePrice: product.approvePrice,
          approveSupPrice: product.approveSupPrice,
          approveSupPriceId: product.approveSupPriceId,
          approver: product.approver,
          discountPercent: product.discountPercent,
          discountAmount: product.discountAmount,
          promotionText: product.promotionText,
          invoiceSurcharge: product.invoiceSurcharge,
        }],
      });

      if (result.success) {
        showToast.success('Đã cập nhật sản phẩm thành công!');
        // Cập nhật isModified = false và originalQuantity = quantity mới
        setProductList(prevList =>
          prevList.map(item =>
            item.id === product.id
              ? { ...item, isModified: false, originalQuantity: item.quantity }
              : item
          )
        );
      } else {
        const errorMsg = result.message || 'Không thể cập nhật sản phẩm.';
        showToast.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      showToast.error(error.message || 'Có lỗi xảy ra khi cập nhật sản phẩm.');
      throw error; // Re-throw để ProductTable xử lý
    }
  };

  // Auto-select promotion orders based on total amount condition (cr1bb_tongtienapdung)
  const autoSelectPromotions = async () => {
    if (!customerId || orderSummary.total <= 0) return;

    try {
    const orderTotal = selectedSo?.crdfd_tongtiencovat ?? selectedSo?.crdfd_tongtien ?? orderSummary.total;

      // Fetch available promotions for current order
      const promotionOrderResult = await fetchPromotionOrdersSOBG(
        soId,
        customerCode || undefined,
        orderTotal,
        // Ensure arrays are typed as string[] (filter out undefined/null)
        productList.map(p => p.productCode).filter((c): c is string => typeof c === 'string' && c.trim() !== ''),
        productList.map(p => p.productGroupCode).filter((c): c is string => typeof c === 'string' && c.trim() !== ''),
        selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
      );

      // Use allPromotions but filter out those not applicable or not meeting total condition
      const allPromos: PromotionOrderItem[] = promotionOrderResult.allPromotions || [];
      const available = allPromos.filter(p => {
        const cond = Number(p.totalAmountCondition || 0);
        const meetsTotal = isNaN(cond) || cond === 0 || Number(orderTotal) >= cond;
        const isApplicable = (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true');
        return isApplicable && meetsTotal;
      });
      // Surface special promotions from allPromotions so they can always be shown
      try {
        // Prefer API-provided `specialPromotions` if available; otherwise scan allPromotions.
        let special: PromotionOrderItem[] = [];
        if (Array.isArray(promotionOrderResult.specialPromotions) && promotionOrderResult.specialPromotions.length > 0) {
          special = promotionOrderResult.specialPromotions;
        } else {
          const allPromos = promotionOrderResult.allPromotions || [];
          special = (allPromos || []).filter((p: PromotionOrderItem) =>
            SPECIAL_PROMOTION_KEYWORDS.some(k => !!p.name && p.name.includes(k))
          );
        }
        if (special.length > 0) setSpecialPromotionList(special);
      } catch (e) {
        // ignore
      }
      if (available.length === 0) {
        return;
      }

      // Auto-select strategy: select highest value promotions that meet conditions
      // - For percent-based promotions -> select those with the maximum percent value (that meet condition)
      // - For VND-based promotions -> select those with the maximum VND value (that meet condition)
      const percentPromos = available.filter(p => String(p.vndOrPercent || '').trim() === '%' || String(p.vndOrPercent) === '191920000');
      const vndPromos = available.filter(p => !percentPromos.includes(p));

      let selected: PromotionOrderItem[] = [];

      // Process percent promotions: select max percent value that meets condition
      if (percentPromos.length > 0) {
        // First filter by condition, then find max value among those that meet condition
        const percentValid = percentPromos.filter(p => {
          const cond = Number((p as any).totalAmountCondition || 0);
          return isNaN(cond) || cond === 0 || orderTotal >= cond;
        });

        if (percentValid.length > 0) {
          const maxPercent = Math.max(...percentValid.map(p => Number(p.value || 0)));
          const bestPercent = percentValid.filter(p => Number(p.value || 0) === maxPercent);
          selected.push(...bestPercent);
        }
      }

      // Process VND promotions: select max VND value that meets condition
      if (vndPromos.length > 0) {
        // First filter by condition, then find max value among those that meet condition
        const vndValid = vndPromos.filter(p => {
          const cond = Number((p as any).totalAmountCondition || 0);
          return isNaN(cond) || cond === 0 || orderTotal >= cond;
        });

        if (vndValid.length > 0) {
          const maxVnd = Math.max(...vndValid.map(p => Number(p.value || 0)));
          const bestVnd = vndValid.filter(p => Number(p.value || 0) === maxVnd);
          selected.push(...bestVnd);
        }
      }

      // If nothing selected by rules, fallback: show all available promotions (user can choose)
      if (selected.length === 0) {
        setPromotionOrderList(available);
        setSelectedPromotionOrders([]);
        setShowPromotionOrderPopup(true);
        return;
      }

      // Deduplicate selected by id and set UI
      const uniqueById: Record<string, PromotionOrderItem> = {};
      for (const p of selected) {
        if (p && p.id) uniqueById[p.id] = p;
      }
      const finalSelected = Object.values(uniqueById);

      setPromotionOrderList(available);
      setSelectedPromotionOrders(finalSelected);
      setShowPromotionOrderPopup(true);
    } catch (error: any) {
      console.error('[Auto-select Promotion SOBG] Error:', error);
      // Silently fail auto-selection - don't block user flow
    }
  };

  // Sync selected promotions to productList: assign promotionId/promotionText to matching products
  useEffect(() => {
    if (!selectedPromotionOrders) return;
    setProductList(prevList => {
      return prevList.map(prod => {
        try {
          const prodCode = (prod.productCode || '').toString().trim().toUpperCase();
          const prodGroup = (prod.productGroupCode || '').toString().trim().toUpperCase();
          for (const promo of selectedPromotionOrders) {
            const codesRaw = promo.productCodes || '';
            const groupsRaw = promo.productGroupCodes || '';
            const codes = Array.isArray(codesRaw) ? codesRaw : String(codesRaw).split(',').map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean);
            const groups = Array.isArray(groupsRaw) ? groupsRaw : String(groupsRaw).split(',').map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean);
            const matchProduct = codes.length === 0 || (prodCode && codes.some((c: string) => prodCode.includes(c)));
            const matchGroup = groups.length === 0 || (prodGroup && groups.some((g: string) => prodGroup.includes(g)));
            if ((codes.length === 0 && groups.length === 0) || matchProduct || matchGroup) {
              return { ...prod, promotionId: promo.id, promotionText: promo.name || prod.promotionText };
            }
          }
        } catch (e) {
          // ignore
        }
        // no matching promo selected -> clear promotionId/promotionText
        return { ...prod, promotionId: undefined, promotionText: '' };
      });
    });
  }, [selectedPromotionOrders]);

  // Áp dụng Promotion Order cho SOBG
  const handleApplyPromotionOrder = async () => {
    const promosToApply = Array.from(new Map(selectedPromotionOrders.map(p => [p.id, p])).values());
    if (promosToApply.length === 0) {
      showToast.error('Vui lòng chọn ít nhất một Promotion Order');
      return;
    }

    if (!customerId || !soId) {
      showToast.error('Thiếu thông tin khách hàng hoặc SOBG');
      return;
    }

    setIsApplyingPromotion(true);
    try {
      // Validate promotions against current SOBG total before applying
      const currentOrderTotal = orderSummary?.total || totalAmount || productList.reduce((s, p) => s + (p.totalAmount || ((p.discountedPrice ?? p.price) * (p.quantity || 0) + ((p.vat || 0) ? Math.round(((p.discountedPrice ?? p.price) * (p.quantity || 0) * (p.vat || 0)) / 100) : 0))), 0);
      const invalid = promosToApply.filter(p => {
        const cond = Number((p as any).totalAmountCondition || 0);
        return !isNaN(cond) && cond > 0 && currentOrderTotal < cond;
      });
      if (invalid.length > 0) {
        const names = invalid.map(p => p.name).join(', ');
        showToast.error(`Không thể áp dụng Promotion vì SOBG chưa đạt điều kiện: ${names}`);
        setIsApplyingPromotion(false);
        return;
      }
      // Apply promotions one by one (API expects single promotion per request)
      const applyResults = await Promise.all(promosToApply.map(promo =>
        applySOBGPromotionOrder({
          sobgId: soId, // soId trong SOBG context là sobgId
          promotionId: promo.id,
          promotionName: promo.name,
          promotionValue: promo.value,
          vndOrPercent: promo.vndOrPercent,
          chietKhau2: promo.chietKhau2 === 191920001,
          productCodes: promo.productCodes,
          productGroupCodes: promo.productGroupCodes,
          orderTotal: currentOrderTotal, // pass UI-calculated total for server-side re-check
        }).catch((err) => {
          console.error('Error applying single SOBG promotion:', promo.id, err);
          return { success: false, message: err?.message || 'Unknown error' } as any;
        })
      ));

      const successfulCount = applyResults.filter(r => r && (r as any).success).length;
      if (successfulCount > 0) {
        showToast.success(`Đã áp dụng ${successfulCount} promotion(s) thành công!`);

        // Update promotion text
        const promotionNames = promosToApply.map(p => p.name).join(', ');
        setPromotionText(`Promotion: ${promotionNames}`);

        // Close popup
        setShowPromotionOrderPopup(false);
        setSelectedPromotionOrders([]);
        setPromotionOrderList([]);

        // Refresh product list to see promotion discounts
        await handleRefreshSOBGDetails();
      } else {
        const firstFail = applyResults.find(r => !(r as any).success) as any;
        showToast.error(firstFail?.message || 'Không thể áp dụng Promotion Order');
      }
    } catch (error: any) {
      console.error('[Apply Promotion SOBG] Error:', error);
      showToast.error(error.message || 'Không thể áp dụng Promotion Order');
    } finally {
      setIsApplyingPromotion(false);
    }
  };

  // Đóng popup promotion order
  const handleClosePromotionOrderPopup = () => {
    setShowPromotionOrderPopup(false);
    setSelectedPromotionOrders([]);
    setPromotionOrderList([]);
    // Clear entire form when closing promotion popup
    clearFormOnSoChange();
  };

  const currentOrderTotal = totalAmount || orderSummary?.total || productList.reduce((s, p) => s + (p.totalAmount || ((p.discountedPrice ?? p.price) * (p.quantity || 0) + ((p.vat || 0) ? Math.round(((p.discountedPrice ?? p.price) * (p.quantity || 0) * (p.vat || 0)) / 100) : 0))), 0);

  return (
    <div className="admin-app-compact-layout">
      {/* Promotion Order Popup */}
      {showPromotionOrderPopup && (
        <div className="admin-app-popup-overlay">
          <div className="admin-app-popup">
            <div className="admin-app-popup-header">
              <h3 className="admin-app-popup-title">Promotion Order</h3>
            </div>
            <div className="admin-app-popup-content">
              <div className="admin-app-field-compact">
                <label className="admin-app-label-inline">Chọn Promotion Order (có thể chọn nhiều)</label>
                <div style={{
                  margin: '8px 0',
                  display: 'inline-block',
                  padding: '8px 12px',
                  background: '#eff6ff',
                  borderRadius: 8,
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0369a1',
                  boxShadow: '0 1px 3px rgba(3,105,161,0.08)'
                }}>
                  Tổng tiền đơn: {currentOrderTotal ? `${currentOrderTotal.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px' }}>
                  {promotionOrderList.map((promo) => {
                    const isSelected = selectedPromotionOrders.some(p => p.id === promo.id);
                    const condition = promo.totalAmountCondition ?? promo.totalAmountCondition === 0 ? promo.totalAmountCondition : null;
                    const conditionNum = condition !== null ? Number(condition) : null;
                    const meetsCondition = conditionNum === null || !isNaN(conditionNum) && currentOrderTotal >= conditionNum;

                    return (
                      <label
                        key={promo.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          cursor: meetsCondition ? 'pointer' : 'not-allowed',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                          borderLeft: meetsCondition ? '4px solid #10b981' : '4px solid transparent',
                          opacity: meetsCondition ? 1 : 0.6,
                          boxShadow: meetsCondition ? '0 1px 4px rgba(16,185,129,0.08)' : undefined
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected && meetsCondition) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected && meetsCondition) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!meetsCondition}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPromotionOrders([...selectedPromotionOrders, promo]);
                            } else {
                              setSelectedPromotionOrders(selectedPromotionOrders.filter(p => p.id !== promo.id));
                            }
                          }}
                          style={{ marginRight: '8px', cursor: meetsCondition ? 'pointer' : 'not-allowed' }}
                        />
                        <span style={{ fontSize: '13px', flex: 1 }}>
                          {promo.name} ({promo.vndOrPercent === '%' ? `${promo.value}%` : `${promo.value?.toLocaleString('vi-VN')} VNĐ`})
                          {promo.chietKhau2 === 191920001 && (
                            <span style={{ marginLeft: '8px', color: '#059669', fontSize: '11px', fontWeight: '600' }}>
                              [Chiết khấu 2]
                            </span>
                          )}
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                            {(!meetsCondition && conditionNum !== null) && (
                              <div style={{ color: '#b91c1c', fontWeight: 600 }}>Yêu cầu tối thiểu: {conditionNum.toLocaleString('vi-VN')} VNĐ</div>
                            )}
                            {(promo as any).paymentTermsMismatch && (
                              <div style={{ color: '#b91c1c', fontWeight: 600 }}>Điều khoản thanh toán không khớp</div>
                            )}
                            {(promo as any).warningMessage && (
                              <div style={{ color: '#92400e' }}>{(promo as any).warningMessage}</div>
                            )}
                          </div>
                        </span>
                        <div style={{ marginLeft: '12px', textAlign: 'right' }}>
                          {conditionNum !== null ? (
                            <div style={{ fontSize: '12px', color: meetsCondition ? '#065f46' : '#b91c1c', fontWeight: 600 }}>
                              {meetsCondition ? 'Đã đạt đk' : 'Chưa đạt đk'}
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Không yêu cầu
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}

                  {/* Special promotions area (moved below regular promotions) */}
                  {specialPromotionList && specialPromotionList.length > 0 && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff7ed', border: '1px dashed #f59e0b' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>Khuyến mãi đặc biệt</div>
                      {specialPromotionList.map((promo) => {
                        const isSelected = selectedPromotionOrders.some(p => p.id === promo.id);
                        return (
                          <label key={promo.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPromotionOrders([...selectedPromotionOrders, promo]);
                                } else {
                                  setSelectedPromotionOrders(selectedPromotionOrders.filter(p => p.id !== promo.id));
                                }
                              }}
                              style={{ marginRight: '8px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 13 }}>
                              {promo.name} ({promo.vndOrPercent === '%' ? `${promo.value}%` : `${promo.value?.toLocaleString('vi-VN')} VNĐ`})
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-app-popup-actions">
              <button
                type="button"
                className="admin-app-btn admin-app-btn-secondary"
                onClick={handleClosePromotionOrderPopup}
                disabled={isApplyingPromotion}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="admin-app-btn admin-app-btn-primary"
                onClick={handleApplyPromotionOrder}
                disabled={selectedPromotionOrders.length === 0 || isApplyingPromotion}
              >
                {isApplyingPromotion ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!hideHeader && (
        <div className="admin-app-header-compact">
          <div className="admin-app-header-compact-left">
            <div className="admin-app-title-compact">Tạo đơn báo giá chi tiết</div>
            <div className="admin-app-status-badge">
              {soId ? 'SOBG ✓' : 'Chưa SOBG'}
            </div>
          </div>
          <div className="admin-app-header-compact-right">
            <button
              className="admin-app-header-btn admin-app-header-btn-save"
              onClick={handleSave}
              disabled={isSaveDisabled}
              title="Lưu"
            >
              {isSaving ? (
                <>
                  <div className="admin-app-spinner admin-app-spinner-small" style={{ marginRight: '6px' }}></div>
                  Đang lưu...
                </>
              ) : (
                '💾 Lưu'
              )}
            </button>
            <button
              className="admin-app-header-btn admin-app-header-btn-submit"
              disabled
              title="Gửi duyệt"
            >
              ✔ Gửi duyệt
            </button>
            <button
              className="admin-app-header-btn admin-app-header-btn-create"
              disabled
              title="Tạo đơn"
            >
              🧾 Tạo đơn
            </button>
            <span className="admin-app-badge admin-app-badge-version">
              V0
            </span>
          </div>
        </div>
      )}

      {/* Main Content - 2 Columns Layout similar to SalesOrderForm */}
      <div className="admin-app-content-compact">
        {isOrderInfoCollapsed && (
          <button
            type="button"
            className="admin-app-orderinfo-reveal"
            onClick={() => setIsOrderInfoCollapsed(false)}
            title="Mở Thông tin đơn hàng"
            aria-label="Mở Thông tin đơn hàng"
          >
            ◀
          </button>
        )}

        {/* Left Column - Order Info (Slide Out) */}
        <div className={`admin-app-column-left ${isOrderInfoCollapsed ? 'admin-app-column-collapsed' : ''}`}>
          <div className="admin-app-card-compact">
            <div className="admin-app-card-header-collapsible" onClick={() => setIsOrderInfoCollapsed(!isOrderInfoCollapsed)}>
              <h3 className="admin-app-card-title">Thông tin đơn hàng</h3>
              <button className="admin-app-collapse-btn" title={isOrderInfoCollapsed ? 'Mở rộng' : 'Ẩn sang trái'}>
                {isOrderInfoCollapsed ? '◀' : '▶'}
              </button>
            </div>
            <div className="admin-app-form-compact">
              <div className="admin-app-field-compact">
                <label className="admin-app-label-inline">Khách hàng <span className="admin-app-required">*</span></label>
                <Dropdown
                  options={customers.map((c) => {
                    const code = c.cr44a_makhachhang || c.cr44a_st || '---';
                    const phone = c.crdfd_phone2 || '---';
                    const region = c.cr1bb_vungmien_text || '---';

                    return {
                      value: c.crdfd_customerid,
                      label: c.crdfd_name,
                      dropdownSubLabel: `Mã: ${code} - SĐT: ${phone} - ${region}`,
                      dropdownTooltip: `Mã: ${code} | SĐT: ${phone} | KV: ${region}`,
                      dropdownMetaText: code !== '---' ? code : undefined,
                      dropdownCopyText: code !== '---' ? code : undefined,
                      ...c,
                    };
                  })}
                  value={customerId}
                  onChange={(value, option) => {
                    setCustomerId(value);
                    setCustomer(option?.label || '');
                    setCustomerCode(option?.cr44a_makhachhang || option?.cr44a_st || '');
                    setCustomerIndustry(option?.crdfd_nganhnghe ?? null);
                    // Clear SOBG và các selected khi đổi customer
                    setSo('');
                    setSoId(''); // Clear soId trước để tránh trigger load details với soId cũ
                    setProductList([]); // Clear product list ngay lập tức
                    setProduct('');
                    setProductCode('');
                    setProductGroupCode('');
                    setUnit('');
                    setWarehouse('');
                    setQuantity(1);
                    setPrice('');
                    setSubtotal(0);
                    setVatAmount(0);
                    setTotalAmount(0);
                    setStockQuantity(0);
                    setApprovePrice(false);
                    setApproveSupPrice(false);
                    setUrgentOrder(false);
                    setApprover('');
                    setDiscountPercent(0);
                    setDiscountAmount(0);
                    setPromotionText('');
                    // Keep note - không clear ghi chú khi đổi khách hàng
                  }}
                  placeholder="Chọn khách hàng"
                  loading={customersLoading}
                  searchable
                  onSearch={setCustomerSearch}
                />
              </div>

              <div className="admin-app-field-compact">
                <label className="admin-app-label-inline">
                  SO báo giá
                  {selectedVatText && (
                    <span
                      className={`admin-app-badge-vat ${isNonVatSelected ? 'is-non-vat' : 'is-vat'}`}
                      title={selectedVatText}
                    >
                      {selectedVatText}
                    </span>
                  )}
                </label>
                <Dropdown
                  options={soBaoGiaList.map((so) => {
                    const baseLabel = generateSoLabel(so);
                    const vatLabelText = getVatLabelText(so) || 'Không VAT';
                    return {
                      value: so.id,
                      label: baseLabel,
                      vatLabelText,
                      dropdownTooltip: baseLabel,
                      ...so,
                    };
                  })}
                  value={soId}
                  onChange={(value, option) => {
                    setSoId(value);
                    setSo(option?.label || '');
                    // Clear các selected khi đổi SOBG
                    clearFormOnSoChange();
                  }}
                  placeholder={customerId ? "Chọn SO" : "Chọn khách hàng trước"}
                  loading={soLoading}
                  disabled={!customerId}
                />
                {(selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan) && (
                  <div className="admin-app-field-info" style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                    <strong>Điều khoản thanh toán:</strong> {getPaymentTermLabel(selectedSo.crdfd_ieukhoanthanhtoan || selectedSo.crdfd_dieu_khoan_thanh_toan)}
                  </div>
                )}
              </div>

              {/* Removed urgent checkbox from order-info (moved into ProductEntryForm) */}
            </div>
          </div>
        </div>

        {/* Right Column - Product Entry (70%) */}
        <div className="admin-app-column-right" style={{ flex: '1 1 70%', minWidth: 0 }}>
          <ProductEntryForm
            disableInventoryReserve={true}
            isAdding={isAdding}
            isSaving={isSaving}
            isLoadingDetails={isLoadingDetails}
            showInlineActions={hideHeader}
            hasUnsavedProducts={hasUnsavedProducts}
            product={product}
            setProduct={setProduct}
            productCode={productCode}
            setProductCode={setProductCode}
            onProductGroupCodeChange={setProductGroupCode}
            unit={unit}
            setUnit={setUnit}
            warehouse={warehouse}
            setWarehouse={setWarehouse}
            customerId={customerId}
            customerCode={customerCode}
            customerName={customer}
            vatText={selectedVatText}
            paymentTerms={selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan}
            soId={soId}
            quantity={quantity}
            setQuantity={setQuantity}
            price={price}
            setPrice={setPrice}
            subtotal={subtotal}
            setSubtotal={setSubtotal}
            vatPercent={vatPercent}
            setVatPercent={setVatPercent}
            vatAmount={vatAmount}
            setVatAmount={setVatAmount}
            totalAmount={totalAmount}
            setTotalAmount={setTotalAmount}
            stockQuantity={stockQuantity}
            setStockQuantity={setStockQuantity}
            approvePrice={approvePrice}
            setApprovePrice={setApprovePrice}
            approveSupPrice={approveSupPrice}
            setApproveSupPrice={setApproveSupPrice}
            urgentOrder={urgentOrder}
            setUrgentOrder={setUrgentOrder}
            deliveryDate={deliveryDate}
            setDeliveryDate={setDeliveryDate}
            note={note}
            setNote={setNote}
            approver={approver}
            setApprover={setApprover}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            discountAmount={discountAmount}
            setDiscountAmount={setDiscountAmount}
            promotionText={promotionText}
            promotionId={promotionId}
            setPromotionId={setPromotionId}
            setPromotionText={setPromotionText}
            onAdd={handleAddProduct}
            onSave={handleSave} // Sử dụng handleSave của SOBG
            onRefresh={handleRefresh}
            onOpenSpecialPromotions={async () => {
              try {
                if (!soId || !customerCode) {
                  showToast.warning('Vui lòng chọn khách hàng và SOBG trước khi tải khuyến mãi đặc biệt.');
                  return;
                }

                // Use the dedicated special promotions API
                const res = await fetchSpecialPromotionOrders(soId, customerCode);

                if (!res.specialPromotions || res.specialPromotions.length === 0) {
                  showToast.info('Không tìm thấy khuyến mãi đặc biệt cho khách hàng này.');
                  return;
                }

                setSpecialPromotionList(res.specialPromotions);
                setPromotionOrderList(res.specialPromotions);
                setSelectedPromotionOrders([]);
                setSoId(soId);
                setShowPromotionOrderPopup(true);
              } catch (err: any) {
                console.error('Error loading special promotions (child SOBG):', err);
                showToast.error('Lỗi khi tải khuyến mãi đặc biệt.');
              }
            }}
            priceEntryMethod={priceEntryMethod}
            setPriceEntryMethod={setPriceEntryMethod}
            discountRate={discountRate}
            setDiscountRate={setDiscountRate}
          />
        </div>
      </div>

      {/* Product Table - Bottom Full Width */}
      <div className="admin-app-table-wrapper">
        <ProductTable
          products={productList}
          setProducts={setProductList}
          soId={soId}
          warehouseName={warehouse}
          isVatOrder={!isNonVatSelected}
          onUpdate={handleUpdateProduct} // Inline Edit Support
          invoiceType={selectedSo?.loaiHoaDon} // Pass invoiceType for surcharge column
          vatChoice={selectedSo?.vat} // Pass vatChoice for surcharge column
          customerIndustry={customerIndustry} // Pass customerIndustry for surcharge column
          isSOBG={true}
          onDelete={(product) => {
            // Logic xóa
            const newList = productList.filter(p => p.id !== product.id);
            setProductList(newList);
          }}
        />
      </div>

      {/* Loading overlay khi đang save/load details */}
      {(isSaving || isLoadingDetails) && (
        <div className="admin-app-form-loading-overlay">
          <div className="admin-app-spinner admin-app-spinner-medium"></div>
          <div className="admin-app-form-loading-text">
            {isSaving ? 'Đang lưu đơn hàng...' : 'Đang tải chi tiết đơn hàng...'}
          </div>
        </div>
      )}
    </div>
  );
}
