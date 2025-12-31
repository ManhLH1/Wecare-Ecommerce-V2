'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrders } from '../_hooks/useDropdownData';
import { fetchSaleOrderDetails, SaleOrderDetail, saveSaleOrderDetails, updateInventory, fetchInventory, fetchUnits, fetchPromotionOrders, applyPromotionOrder, PromotionOrderItem, InventoryInfo } from '../_api/adminApi';
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
  stockQuantity?: number;
  createdOn?: string;
  isModified?: boolean; // Flag để đánh dấu dòng đã sửa
  originalQuantity?: number; // Lưu số lượng gốc để so sánh
}

interface SalesOrderFormProps {
  hideHeader?: boolean;
}

export default function SalesOrderForm({ hideHeader = false }: SalesOrderFormProps) {
  console.log('🚀 [SalesOrderForm] Component rendered, hideHeader:', hideHeader);

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
  // Load SO - if customerId is selected, filter by customer, otherwise load all
  const { saleOrders, loading: soLoading, error: soError } = useSaleOrders(customerId || undefined);
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
  const [customerDistrictKey, setCustomerDistrictKey] = useState<string>('');
  const [note, setNote] = useState('');
  const [approver, setApprover] = useState('');
  const [priceEntryMethod, setPriceEntryMethod] = useState<'Nhập thủ công' | 'Theo chiết khấu'>('Nhập thủ công');
  const [discountRate, setDiscountRate] = useState<string>('1');
  const [discountPercent, setDiscountPercent] = useState(0);

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
  const [productList, setProductList] = useState<ProductItem[]>([]);

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
    // If value is numeric string or number, try map lookup
    const key = String(value);
    if (PAYMENT_TERMS_MAP[key]) return PAYMENT_TERMS_MAP[key];
    // Fallback: if it's already a human-readable string, return it
    return value;
  };

  // Promotion Order Popup state
  const [showPromotionOrderPopup, setShowPromotionOrderPopup] = useState(false);
  const [promotionOrderList, setPromotionOrderList] = useState<PromotionOrderItem[]>([]);
  const [selectedPromotionOrders, setSelectedPromotionOrders] = useState<PromotionOrderItem[]>([]); // Multi-select
  const [isApplyingPromotion, setIsApplyingPromotion] = useState(false);

  // Kiểm tra có sản phẩm chưa lưu để enable nút Save
  // Sản phẩm mới = isSodCreated không phải true (có thể là false, undefined, null)
  const hasUnsavedProducts = productList.some(p => p.isSodCreated !== true);
  const isSaveDisabled = isSaving || !hasUnsavedProducts;

  // Tổng hợp tiền toàn đơn hàng
  const orderSummary = useMemo(() => {
    return productList.reduce(
      (acc, item) => {
        // Tính toán theo cùng tiêu chuẩn với backend:
        // - Làm tròn VAT mỗi dòng bằng Math.round
        // - subtotal là giá sau chiết khấu nhân số lượng (đã là số nguyên tiền)
        const lineSubtotal = Math.round(((item.discountedPrice ?? item.price) * (item.quantity || 0)));
        const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
        acc.subtotal += lineSubtotal;
        acc.vat += lineVat;
        acc.total += lineSubtotal + lineVat;
        return acc;
      },
      { subtotal: 0, vat: 0, total: 0 }
    );
  }, [productList]);

  // Helper to derive VAT text from SO record
  const getVatLabelText = useCallback((so: any) => {
    if (!so) return '';
    const vatTextFromCrm = (so.cr1bb_vattext || '').trim();
    if (vatTextFromCrm) return vatTextFromCrm;
    if (so.crdfd_vat === 191920000) return 'Có VAT';
    if (so.crdfd_vat === 191920001) return 'Không VAT';
    return '';
  }, []);

  const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
  const selectedVatText = getVatLabelText(selectedSo);
  const isNonVatSelected = (selectedVatText || '').toLowerCase().includes('không');

  // Helper function to generate SO label from SO object
  const generateSoLabel = useCallback((so: any): string => {
    const soCode = so?.crdfd_so_code || so?.crdfd_so_auto || '';
    const soName = (so?.crdfd_name || '').trim();
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
      return 'SO không tên';
    }
  }, []);

  // Auto-select SO mới nhất (có createdon mới nhất) sau khi chọn khách hàng
  // Auto-select SO hook removed to prevent unwanted resets


  // Sync SO label when saleOrders change and soId is already set
  // This ensures dropdown displays correctly even if soId was set before saleOrders loaded
  useEffect(() => {
    if (soId && saleOrders.length > 0) {
      const currentSo = saleOrders.find(so => so.crdfd_sale_orderid === soId);
      if (currentSo) {
        const baseLabel = generateSoLabel(currentSo);
        // Only update if label is different to avoid unnecessary re-renders
        setSo(prev => prev !== baseLabel ? baseLabel : prev);
      }
    }
  }, [soId, saleOrders, generateSoLabel]);

  // Auto-select latest SO by created date when saleOrders load and no soId selected
  useEffect(() => {
    if ((!soId || soId.trim() === '') && saleOrders && saleOrders.length > 0) {
      const parseDate = (s: any) => {
        const d = s?.createdon ?? s?.createdOn ?? s?.crdfd_createdon ?? s?.created;
        const t = d ? Date.parse(d) : NaN;
        return isNaN(t) ? 0 : t;
      };
      const newest = saleOrders.reduce((best, cur) => {
        return parseDate(cur) > parseDate(best) ? cur : best;
      }, saleOrders[0]);
      if (newest && newest.crdfd_sale_orderid) {
        setSoId(newest.crdfd_sale_orderid);
        setSo(generateSoLabel(newest));
      }
    }
  }, [saleOrders]);

  // Load Sale Order Details when soId changes (formData equivalent)
  useEffect(() => {
    const loadSaleOrderDetails = async () => {
      // Validation: soId must be valid
      if (!soId || soId.trim() === '') {
        setProductList([]);
        return;
      }

      // Validation: Customer must be selected (Safety check matching SOBG)
      if (!customerId) {
        setProductList([]);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const details = await fetchSaleOrderDetails(soId);
        // Map SaleOrderDetail to ProductItem
        const mappedProducts: ProductItem[] = details.map((detail: SaleOrderDetail) => {
          const subtotal = (detail.discountedPrice || detail.price) * detail.quantity;
          const vatAmount = (subtotal * detail.vat) / 100;
          return {
            id: detail.id,
            stt: detail.stt,
            productCode: detail.productCode, // Lấy từ API
            productId: detail.productId, // Lấy từ API
            productGroupCode: detail.productGroupCode, // Lấy từ API
            productName: detail.productName,
            // Map chiết khấu 2 from backend (stored as decimal like 0.05 or percent)
            discount2: (() => {
              const raw = (detail as any).crdfd_chieckhau2 ?? (detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2 ?? 0;
              const num = Number(raw) || 0;
              if (num > 0 && num <= 1) return Math.round(num * 100);
              return num;
            })(),
            discount2Enabled: Boolean((detail as any).crdfd_chieckhau2 ?? (detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2),
            unit: detail.unit,
            quantity: detail.quantity,
            price: detail.price,
            surcharge: detail.surcharge,
            discount: detail.discount,
            discountedPrice: detail.discountedPrice,
            vat: detail.vat,
            subtotal,
            vatAmount,
            // Nếu API không trả về `totalAmount` (hoặc trả nhầm là tổng chưa VAT), fallback sang tính toán cục bộ
            totalAmount: detail.totalAmount ?? (subtotal + vatAmount),
            approver: detail.approver,
            deliveryDate: detail.deliveryDate || '',
            warehouse: warehouse, // Lấy từ state warehouse
            isSodCreated: true,
            isModified: false, // Mặc định chưa sửa
            originalQuantity: detail.quantity, // Lưu số lượng gốc
          };
        });
        // Sort by STT descending (already sorted by API, but ensure it)
        mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
        setProductList(mappedProducts);
      } catch (error) {
        console.error('Error loading sale order details:', error);
        setProductList([]);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadSaleOrderDetails();
  }, [soId]);

  // Auto-select promotion orders based on total amount condition (cr1bb_tongtienapdung)
  useEffect(() => {
    const autoSelectPromotions = async () => {
      if (!soId || !customerCode || totalAmount <= 0) {
        return;
      }

      try {
        // Fetch available promotions for current order
        const promotionOrderResult = await fetchPromotionOrders(
          soId,
          customerCode,
          totalAmount,
          // Ensure arrays are typed as string[] (filter out undefined/null)
          productList.map(p => p.productCode).filter((c): c is string => typeof c === 'string' && c.trim() !== ''),
          productList.map(p => p.productGroupCode).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        );

        if (promotionOrderResult.availablePromotions && promotionOrderResult.availablePromotions.length > 0) {
          // Auto-select promotions where totalAmount >= totalAmountCondition
          const autoSelectedPromotions = promotionOrderResult.availablePromotions.filter((promo: PromotionOrderItem) => {
            const condition = promo.totalAmountCondition;
            // If no condition or totalAmount >= condition, auto-select
            return condition === null || condition === undefined || totalAmount >= condition;
          });

          if (autoSelectedPromotions.length > 0) {
            console.log('[Auto-select Promotion] Auto-selecting promotions based on total amount:', {
              totalAmount,
              autoSelectedCount: autoSelectedPromotions.length,
              autoSelectedNames: autoSelectedPromotions.map(p => p.name)
            });

            // Merge with existing selections (avoid duplicates)
            const existingIds = selectedPromotionOrders.map(p => p.id);
            const newSelections = autoSelectedPromotions.filter(p => !existingIds.includes(p.id));

            if (newSelections.length > 0) {
              setSelectedPromotionOrders([...selectedPromotionOrders, ...newSelections]);
              setPromotionOrderList(promotionOrderResult.availablePromotions);

              // Auto-show popup if we have new auto-selections and popup is not already shown
              if (!showPromotionOrderPopup) {
                setShowPromotionOrderPopup(true);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Auto-select Promotion] Error auto-selecting promotions:', error);
      }
    };

    autoSelectPromotions();
  }, [soId, customerCode, totalAmount, productList]);

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
    const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
    const isHoKinhDoanh = selectedSo?.cr1bb_loaihoaon === 191920001; // TODO: confirm OptionSet value
    const isNonVat = vatPercent === 0;
    const invoiceSurchargeRate = isHoKinhDoanh && isNonVat ? 0.015 : 0;

    // Calculate discounted price using the same method as ProductEntryForm:
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

      // Recalculate amounts with new total quantity (round VAT per line)
      const newSubtotal = Math.round(newQuantity * finalPrice);
      const newVatAmount = Math.round((newSubtotal * (vatPercent || 0)) / 100);
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
      // Calculate amounts (round VAT per line)
      const subtotalCalc = Math.round(quantity * finalPrice);
      const vatCalc = Math.round((subtotalCalc * (vatPercent || 0)) / 100);
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

    // NOTE: Inventory reservation đã được xử lý trong ProductEntryForm.tsx (handleAddWithInventoryCheck)
    // Không cần reserve lại ở đây để tránh reserve 2 lần

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
    // Keep warehouse, customer, SO, deliveryDate as they are reused

    setIsAdding(false);
    showToast.success('Đã thêm sản phẩm vào danh sách!');
  };

  const handleSave = async () => {
    // Chỉ kiểm tra có sản phẩm chưa lưu (isSodCreated = false)
    const unsavedProducts = productList.filter(p => !p.isSodCreated);
    if (unsavedProducts.length === 0) {
      showToast.warning('Không có sản phẩm mới để lưu.');
      return;
    }

    // KIỂM TRA SỐ LƯỢNG Ở NÚT SAVE - tất cả sản phẩm phải có số lượng > 0
    const productsWithInvalidQuantity = unsavedProducts.filter(p => !p.quantity || p.quantity <= 0);
    if (productsWithInvalidQuantity.length > 0) {
      const productNames = productsWithInvalidQuantity.map(p => p.productName).join(', ');
      showToast.error(`Số lượng phải lớn hơn 0 cho các sản phẩm: ${productNames}`);
      return;
    }

    if (!soId) {
      showToast.error('Vui lòng chọn Sales Order trước khi lưu.');
      return;
    }

    setIsSaving(true);
    try {
      const customerLoginIdRaw = getItem('id');
      const customerLoginId =
        (typeof customerLoginIdRaw === 'string' ? customerLoginIdRaw : String(customerLoginIdRaw || '')).trim() || undefined;

      // ✅ OPTIMIZATION: Loại bỏ fetchSaleOrderDetails không cần thiết
      // Đã có productList state với isSodCreated flag để track sản phẩm đã save
      // Chỉ cần filter những sản phẩm chưa save (isSodCreated = false)
      const newProducts = unsavedProducts;

      if (newProducts.length === 0) {
        showToast.warning('Không có sản phẩm mới để lưu. Tất cả sản phẩm đã có trong SOD.');
        setIsSaving(false);
        return;
      }

      const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
      const isVatOrder = selectedVatText?.toLowerCase().includes('có vat') || false;

      // Map chỉ các sản phẩm mới (chưa có trong SOD) to API format
      // Không gửi ID vì đây là sản phẩm mới, chưa có trong CRM
      const productsToSave = newProducts.map((item) => {
        // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ item.note
        const formattedNote = item.approvePrice && item.approver
          ? `Duyệt giá bởi ${item.approver}`
          : item.note || '';

        return {
          id: undefined, // Không gửi ID cho sản phẩm mới - sẽ được tạo mới trong CRM
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
            // Secondary discount (Chiết khấu 2) - percent value (e.g., 5 = 5%)
            discount2: item.discount2 ?? 0,
            discount2Enabled: item.discount2Enabled ?? false,
          promotionText: item.promotionText,
          invoiceSurcharge: item.invoiceSurcharge,
        };
      });

      // Lấy user info từ localStorage
      const userInfo = getStoredUser();

      const result = await saveSaleOrderDetails({
        soId,
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

      // Lưu lại soId và customerCode để check promotion order
      const savedSoId = soId;
      const savedCustomerCode = customerCode;
      const savedProductCodes = productsToSave.map(p => p.productCode).filter(Boolean) as string[];
      const savedProductGroupCodes = productsToSave.map(p => p.productGroupCode).filter(Boolean) as string[];
      const savedTotalAmount = orderSummary.total;

      // Reload danh sách SOD từ CRM để cập nhật isSodCreated cho các sản phẩm vừa save
      // CHỈ reload nếu tất cả sản phẩm đã save thành công
      if (!result.partialSuccess && result.totalFailed === 0) {
        try {
          const updatedDetails = await fetchSaleOrderDetails(soId);
          const mappedProducts: ProductItem[] = updatedDetails.map((detail: SaleOrderDetail) => {
            const subtotal = (detail.discountedPrice || detail.price) * detail.quantity;
            const vatAmount = (subtotal * detail.vat) / 100;
            return {
              id: detail.id,
              stt: detail.stt,
              productName: detail.productName,
              unit: detail.unit,
              quantity: detail.quantity,
              price: detail.price,
              surcharge: detail.surcharge,
              discount: detail.discount,
              discountedPrice: detail.discountedPrice,
              vat: detail.vat,
              subtotal,
              vatAmount,
              // Nếu API không trả về `totalAmount`, sử dụng subtotal + vatAmount làm fallback
              totalAmount: detail.totalAmount ?? (subtotal + vatAmount),
              approver: detail.approver,
              deliveryDate: detail.deliveryDate || '',
              isSodCreated: true, // Đánh dấu là đã save vào CRM
            };
          });
          // Sort by STT descending
          mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
          setProductList(mappedProducts);
        } catch (error) {
          console.error('Error reloading sale order details after save:', error);
          // Nếu reload thất bại, vẫn cập nhật isSodCreated cho các sản phẩm đã save thành công
          if (result.savedDetails && result.savedDetails.length > 0) {
            setProductList(prevList => {
              const savedProductCodesSet = new Set(result.savedDetails.map((p: any) => p.productCode).filter(Boolean));
              return prevList.map(item => {
                // Nếu sản phẩm vừa được save thành công
                if (item.productCode && savedProductCodesSet.has(item.productCode)) {
                  return { ...item, isSodCreated: true };
                }
                return item;
              });
            });
          }
        }
      } else {
        // Nếu có sản phẩm thất bại, chỉ cập nhật isSodCreated cho các sản phẩm đã save thành công
        if (result.savedDetails && result.savedDetails.length > 0) {
          setProductList(prevList => {
            const savedProductCodesSet = new Set(result.savedDetails.map((p: any) => p.productCode).filter(Boolean));
            return prevList.map(item => {
              // Nếu sản phẩm vừa được save thành công
              if (item.productCode && savedProductCodesSet.has(item.productCode)) {
                return { ...item, isSodCreated: true };
              }
              return item;
            });
          });
        }
      }

      // Clear form fields after successful save (giữ lại SO và customer)
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

      // Logic mới: Không tự động show popup promotion order sau khi save
      // Đảm bảo popup hiển thị cho sale chọn promotion bổ sung chiết khấu 2
      // Chỉ check khi có soId và customerCode (đã save thành công)
      // Logic mới: Không tự động check promotion orders sau khi save
      // if (savedSoId && savedCustomerCode) {
        try {
          console.log('[Promotion Order] Checking promotion orders after save:', {
            soId: savedSoId,
            customerCode: savedCustomerCode,
            totalAmount: savedTotalAmount,
            productCodes: savedProductCodes,
            productGroupCodes: savedProductGroupCodes
          });

          const promotionOrderResult = await fetchPromotionOrders(
            savedSoId,
            savedCustomerCode,
            savedTotalAmount,
            savedProductCodes,
            savedProductGroupCodes
          );

          console.log('[Promotion Order] Result:', {
            hasExistingPromotionOrder: promotionOrderResult.hasExistingPromotionOrder,
            availablePromotionsCount: promotionOrderResult.availablePromotions?.length || 0,
            allPromotionsCount: promotionOrderResult.allPromotions?.length || 0,
            availablePromotions: promotionOrderResult.availablePromotions
          });

          // LUÔN hiển thị popup với TOÀN BỘ promotions (ưu tiên allPromotions)
          if (promotionOrderResult.allPromotions && promotionOrderResult.allPromotions.length > 0) {
            console.log('[Promotion Order] ✅ Showing popup with allPromotions (show all available promotions)');
            setSoId(savedSoId);
            setPromotionOrderList(promotionOrderResult.allPromotions);
            setShowPromotionOrderPopup(true);
          } else if (promotionOrderResult.availablePromotions && promotionOrderResult.availablePromotions.length > 0) {
            // Fallback: nếu allPromotions rỗng nhưng availablePromotions có data, dùng availablePromotions
            console.log('[Promotion Order] ✅ Showing popup with availablePromotions (fallback)');
            setSoId(savedSoId);
            setPromotionOrderList(promotionOrderResult.availablePromotions);
            setShowPromotionOrderPopup(true);
          } else {
            console.log('[Promotion Order] ❌ Không có promotion khả dụng - không hiển thị popup');
            // No promotions -> clear all form data after successful save
            clearEverything();
          }
        } catch (error) {
          console.error('[Promotion Order] ❌ Error checking promotion orders:', error);
          // Nếu có lỗi khi fetch, vẫn không hiển thị popup
        }
      // } else {
      //   console.log('[Promotion Order] ❌ Không có soId hoặc customerCode - không hiển thị popup');
      // }

      // Thay vào đó, promotions được save kèm luôn trong handleSaveWithPromotions
      console.log('[Promotion Order] Save completed with promotions, no auto-popup needed');
    } catch (error: any) {
      console.error('Error saving sale order details:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu đơn hàng. Vui lòng thử lại.';
      showToast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear các selected khi đổi SO (giữ lại customer, SO mới, deliveryDate)
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
    // Keep note, customer, SO (đang được set mới), deliveryDate as they are reused
  };

  // Clear everything (customer, SO, form, product list) after save if requested
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
  };

  const handleRefresh = async () => {
    // Cộng lại tồn kho cho tất cả sản phẩm trong danh sách (chỉ những sản phẩm chưa được save vào CRM)
    const productsToRestore = productList.filter(p => !p.isSodCreated);
    if (productsToRestore.length > 0) {
      const isVatOrder = !isNonVatSelected;
      for (const product of productsToRestore) {
        if (product.productCode && product.warehouse && product.quantity > 0) {
          try {
            await updateInventory({
              productCode: product.productCode,
              quantity: product.quantity,
              warehouseName: product.warehouse,
              operation: 'add',
              isVatOrder,
            });
          } catch (error: any) {
            // Silent error - continue với các sản phẩm khác
            // Continue với các sản phẩm khác
          }
        }
      }
    }

    // Reset all fields
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
    // Keep note - không clear ghi chú
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setProductList([]);
  };

  // Save đơn hàng kèm promotion orders
  const handleSaveWithPromotions = async () => {
    if (productList.length === 0) {
      showToast.warning('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    if (!customer || !customerCode) {
      showToast.warning('Vui lòng chọn khách hàng');
      return;
    }

    setIsApplyingPromotion(true);
    try {
      console.log('[Save with Promotions] Starting save operation:', {
        customerCode,
        customer,
        products: productList.length,
        promotions: selectedPromotionOrders.length
      });

      // Chuẩn bị dữ liệu đơn hàng
      const orderData = {
        customerCode,
        customerName: customer,
        products: productList.map((item, idx) => {
          const computedSubtotal = item.subtotal ?? ((item.discountedPrice ?? item.price) * (item.quantity || 0));
          const computedVatAmount = item.vatAmount ?? Math.round((computedSubtotal * (item.vat || 0)) / 100);
          const computedTotal = item.totalAmount ?? (computedSubtotal + computedVatAmount);
          return {
            id: item.id,
            productCode: item.productCode,
            productId: item.productId,
            productName: item.productName,
            productGroupCode: item.productGroupCode,
            unit: item.unit,
            unitId: item.unitId,
            quantity: item.quantity,
            price: item.price,
            discountedPrice: item.discountedPrice,
            originalPrice: item.price,
            surcharge: item.surcharge,
            discount: item.discount,
            vat: item.vat,
            vatAmount: computedVatAmount,
            subtotal: computedSubtotal,
            totalAmount: computedTotal,
            stt: item.stt ?? (idx + 1),
            deliveryDate: item.deliveryDate,
            note: item.note,
            urgentOrder: item.urgentOrder,
            approvePrice: item.approvePrice,
            approveSupPrice: item.approveSupPrice,
            approveSupPriceId: item.approveSupPriceId,
            approver: item.approver,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            promotionText: item.promotionText,
            invoiceSurcharge: item.invoiceSurcharge,
            stockQuantity: item.stockQuantity,
          };
        }),
        promotions: selectedPromotionOrders.map(promo => ({
          promotionId: promo.id,
          promotionName: promo.name,
          promotionValue: promo.value || 0,
          vndOrPercent: String(promo.vndOrPercent ?? '%'),
          chietKhau2: promo.chietKhau2 === 191920001,
          productCodes: promo.productCodes,
          productGroupCodes: promo.productGroupCodes,
        }))
      };

      // Validate promotions against order total (cr1bb_tongtienapdung)
      const orderTotalForValidation = orderSummary?.total || totalAmount || productList.reduce((s, p) => s + (p.totalAmount || ((p.discountedPrice ?? p.price) * (p.quantity || 0) + ((p.vat || 0) ? Math.round(((p.discountedPrice ?? p.price) * (p.quantity || 0) * (p.vat || 0)) / 100) : 0))), 0);
      const invalidPromos = selectedPromotionOrders.filter((promo) => {
        const cond = (promo as any).totalAmountCondition;
        return typeof cond === 'number' && cond > 0 && orderTotalForValidation < cond;
      });
      if (invalidPromos.length > 0) {
        const names = invalidPromos.map(p => p.name).join(', ');
        showToast.error(`Đơn hàng chưa đạt điều kiện áp dụng Promotion: ${names}. Vui lòng điều chỉnh đơn hàng hoặc bỏ chọn promotion.`);
        setIsApplyingPromotion(false);
        return;
      }

      // Gọi API save với promotions
      const result = await saveSaleOrderDetails(orderData);

      if (result.success) {
        console.log('[Save with Promotions] ✅ Save successful:', result);

        // Cập nhật state
        const newSoId = result.soId;
        const newSoNumber = result.soNumber;

        if (newSoId) {
          setSoId(newSoId);
          setSo(newSoNumber || newSoId);

          // Sale order details will be loaded by the effect that watches `soId`

          // Cập nhật total amount
          if (result.totalAmount) {
            setTotalAmount(result.totalAmount);
          }
        }

        // Đóng popup promotion order
        setShowPromotionOrderPopup(false);
        setSelectedPromotionOrders([]);

        showToast.success('Đã lưu đơn hàng với khuyến mãi thành công!');
      } else {
        console.error('[Save with Promotions] ❌ Save failed:', result);
        showToast.error(result.message || 'Lưu đơn hàng thất bại');
      }

    } catch (error: any) {
      console.error('[Save with Promotions] ❌ Error:', error);
      showToast.error(error.message || 'Có lỗi xảy ra khi lưu đơn hàng');
    } finally {
      setIsApplyingPromotion(false);
    }
  };

  // Xử lý khi xác nhận chọn Promotion Order (multi-select)
  const handleApplyPromotionOrder = async () => {
    if (selectedPromotionOrders.length === 0) {
      showToast.warning('Vui lòng chọn ít nhất một Promotion Order');
      return;
    }

    // Nếu chưa có soId (chưa save đơn hàng), save kèm promotion orders
    if (!soId) {
      await handleSaveWithPromotions();
      return;
    }

    // Nếu đã có soId (đã save), apply promotion như bình thường
    setIsApplyingPromotion(true);
    try {
      // Validate promotions against current order total before applying
      const currentOrderTotal = totalAmount || orderSummary?.total || productList.reduce((s, p) => s + (p.totalAmount || ((p.discountedPrice ?? p.price) * (p.quantity || 0) + ((p.vat || 0) ? Math.round(((p.discountedPrice ?? p.price) * (p.quantity || 0) * (p.vat || 0)) / 100) : 0))), 0);
      const invalid = selectedPromotionOrders.filter(p => {
        const cond = (p as any).totalAmountCondition;
        return typeof cond === 'number' && cond > 0 && currentOrderTotal < cond;
      });
      if (invalid.length > 0) {
        const names = invalid.map(p => p.name).join(', ');
        showToast.error(`Không thể áp dụng Promotion vì đơn hàng chưa đạt điều kiện: ${names}`);
        setIsApplyingPromotion(false);
        return;
      }
      // Áp dụng từng promotion order
      const results = [];
      for (const promo of selectedPromotionOrders) {
        try {
          // Validate payment terms: nếu promotion chỉ định điều khoản thanh toán và không khớp
          // với điều khoản trên đơn hàng hiện tại thì bỏ qua promotion này và show warning.
          const orderPaymentRaw = selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan;
          const promoPaymentRaw = (promo as any).paymentTerms;
          if (promoPaymentRaw && String(promoPaymentRaw).trim() !== "") {
            const promoTermsStr = String(promoPaymentRaw).trim();
            const promoTokens = promoTermsStr
              .split(/[,;|\/]+/)
              .map((t: string) => t.trim())
              .filter(Boolean);
            const orderPaymentStr = orderPaymentRaw !== undefined && orderPaymentRaw !== null ? String(orderPaymentRaw).trim() : "";
            const paymentMatch = promoTokens.length === 0
              ? true
              : (orderPaymentStr !== "" && promoTokens.includes(orderPaymentStr));

            if (!paymentMatch) {
              showToast.error(`Promotion "${promo.name}" không áp dụng: điều khoản thanh toán không khớp.`);
              // Ghi lại kết quả thất bại để báo cáo sau
              results.push({ success: false, message: 'Điều khoản thanh toán không khớp', promotionName: promo.name });
              continue;
            }
          }

          // Chuẩn hóa vndOrPercent để đảm bảo khớp với API
          // API expects "VNĐ" (với Đ tiếng Việt) hoặc "%"
          // Ensure vndOrPercent is a string before calling trim()
          const rawVndOrPercent = promo.vndOrPercent ?? '%';
          let normalizedVndOrPercent = typeof rawVndOrPercent === 'string'
            ? rawVndOrPercent.trim()
            : String(rawVndOrPercent).trim();
          // Kiểm tra nếu là % (case-insensitive)
          if (normalizedVndOrPercent.toLowerCase() === '%') {
            normalizedVndOrPercent = '%';
          } else {
            // Nếu không phải %, coi như là VNĐ (có thể là "VNĐ", "VND", "vnd", etc.)
            normalizedVndOrPercent = 'VNĐ';
          }

          console.log('[Promotion Order] Applying promotion:', {
            soId,
            promotionId: promo.id,
            promotionName: promo.name,
            promotionValue: promo.value,
            vndOrPercent: promo.vndOrPercent,
            normalizedVndOrPercent,
            chietKhau2: promo.chietKhau2 === 191920001,
            productCodes: promo.productCodes,
            productGroupCodes: promo.productGroupCodes,
          });

          const result = await applyPromotionOrder({
            soId: soId,
            promotionId: promo.id,
            promotionName: promo.name,
            promotionValue: promo.value || 0,
            vndOrPercent: normalizedVndOrPercent,
            chietKhau2: promo.chietKhau2 === 191920001, // 191920001 = Yes
            productCodes: promo.productCodes,
            productGroupCodes: promo.productGroupCodes,
          });

          console.log('[Promotion Order] Result:', result);

          // Đảm bảo result có success field
          if (result && typeof result.success === 'boolean') {
            results.push(result);
          } else {
            // Nếu response không có success field, coi như thành công nếu không có error
            console.warn('[Promotion Order] Response không có success field, coi như thành công:', result);
            // Chỉ thêm success: true nếu result không có success field
            const resultWithSuccess = result ? { ...result, success: true } : { success: true };
            results.push(resultWithSuccess);
          }
        } catch (error: any) {
          console.error(`[Promotion Order] Error applying promotion ${promo.name}:`, error);
          const errorMessage = error.message || error.response?.data?.details || `Lỗi khi áp dụng ${promo.name}`;
          results.push({ success: false, message: errorMessage });
        }
      }

      console.log('[Promotion Order] All results:', results);

      const successCount = results.filter(r => r && r.success === true).length;
      const failedCount = results.filter(r => r && r.success === false).length;

      console.log('[Promotion Order] Summary:', { successCount, failedCount, total: selectedPromotionOrders.length });

      if (successCount > 0) {
        showToast.success(`Đã áp dụng ${successCount}/${selectedPromotionOrders.length} Promotion Order thành công!`);
        setShowPromotionOrderPopup(false);
        setSelectedPromotionOrders([]);
        setPromotionOrderList([]);
        // Clear entire form after successfully applying promotions
        clearEverything();
      } else {
        const errorMessages = results
          .filter(r => r && r.success === false)
          .map(r => r.message)
          .filter(Boolean)
          .join(', ');
        showToast.error(errorMessages || 'Không thể áp dụng Promotion Order');
      }
    } catch (error: any) {
      console.error('[Promotion Order] Unexpected error:', error);
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
    clearEverything();
  };

  // Handler để update một sản phẩm đơn lẻ (đã sửa)
  const handleUpdateProduct = async (product: ProductItem) => {
    if (!soId) {
      showToast.error('Vui lòng chọn Sales Order trước khi cập nhật.');
      return;
    }

    if (!product.id) {
      showToast.error('Không thể cập nhật: sản phẩm chưa có ID.');
      return;
    }

    const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
    const isVatOrder = selectedVatText?.toLowerCase().includes('có vat') || false;

    // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ item.note
    const formattedNote = product.approvePrice && product.approver
      ? `Duyệt giá bởi ${product.approver}`
      : product.note || '';

    try {
      const customerLoginIdRaw = getItem('id');
      const customerLoginId =
        (typeof customerLoginIdRaw === 'string' ? customerLoginIdRaw : String(customerLoginIdRaw || '')).trim() || undefined;

      const userInfo = getStoredUser();

      // Validate ID format (phải là GUID)
      const crmGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!crmGuidPattern.test(product.id)) {
        showToast.error('ID sản phẩm không hợp lệ.');
        return;
      }

      // Kiểm tra tồn kho nếu số lượng tăng
      const originalQuantity = product.originalQuantity ?? product.quantity;
      const quantityDelta = product.quantity - originalQuantity;

      // Lấy productCode và warehouse - ưu tiên từ product, fallback từ context
      let finalProductCode = product.productCode;
      let finalWarehouse = product.warehouse || warehouse;

      // Nếu không có productCode, thử lookup từ productName
      if (!finalProductCode && product.productName) {
        try {
          const { fetchProducts } = await import('../_api/adminApi');
          const products = await fetchProducts(product.productName);
          const foundProduct = products.find(p =>
            p.crdfd_name === product.productName ||
            p.crdfd_fullname === product.productName
          );
          if (foundProduct && foundProduct.crdfd_masanpham) {
            finalProductCode = foundProduct.crdfd_masanpham;
          }
        } catch (error) {
          console.warn('Không thể lookup productCode từ productName:', error);
        }
      }

      // Bỏ qua kiểm tra tồn kho cho các nhóm SP đặc thù
      const INVENTORY_BYPASS_PRODUCT_GROUP_CODES = [
        'NSP-00027',
        'NSP-000872',
        'NSP-000409',
        'NSP-000474',
        'NSP-000873',
      ];
      const shouldBypassInventoryCheck = product.productGroupCode
        ? INVENTORY_BYPASS_PRODUCT_GROUP_CODES.includes(product.productGroupCode)
        : false;

      // Bỏ qua kiểm tra tồn kho cho khách hàng đặc biệt
      const customerNameNorm = (customer || '').toLowerCase().trim();
      const isAllowedCustomer = customerNameNorm === 'kho wecare' || customerNameNorm === 'kho wecare (ho chi minh)';

      // Validate: phải có productCode và warehouse để kiểm tra tồn kho (chỉ khi có thay đổi số lượng)
      if (quantityDelta !== 0 && (!finalProductCode || !finalWarehouse)) {
        const errorMsg = `Không thể kiểm tra tồn kho: ${!finalProductCode ? 'thiếu mã sản phẩm' : ''}${!finalProductCode && !finalWarehouse ? ' và ' : ''}${!finalWarehouse ? 'thiếu kho' : ''}. Vui lòng kiểm tra lại.`;
        showToast.warning(errorMsg);
        throw new Error(errorMsg);
      }

      if (quantityDelta > 0 && finalProductCode && finalWarehouse) {
        // Tính base quantity từ quantity và unit conversion factor
        let baseQuantityDelta = quantityDelta;
        if (product.unit && finalProductCode) {
          try {
            const units = await fetchUnits(finalProductCode);
            const selectedUnit = units.find((u) => u.crdfd_name === product.unit);
            if (selectedUnit) {
              const conversionFactor = (selectedUnit as any)?.crdfd_giatrichuyenoi ??
                (selectedUnit as any)?.crdfd_giatrichuyendoi ??
                (selectedUnit as any)?.crdfd_conversionvalue ??
                1;
              const factorNum = Number(conversionFactor);
              if (!isNaN(factorNum) && factorNum > 0) {
                baseQuantityDelta = quantityDelta * factorNum;
              }
            }
          } catch (unitError) {
            console.warn('Không thể lấy conversion factor, sử dụng quantity trực tiếp:', unitError);
          }
        }

        // Kiểm tra tồn kho cho đơn không VAT (đơn VAT không cần check)
        // QUAN TRỌNG: Phải kiểm tra tồn kho TRƯỚC KHI reserve
        if (!isVatOrder && !shouldBypassInventoryCheck && !isAllowedCustomer) {
          // Kiểm tra tồn kho
          const inventoryInfo: InventoryInfo | null = await fetchInventory(
            finalProductCode!,
            finalWarehouse!,
            isVatOrder
          );

          if (!inventoryInfo) {
            const errorMsg = 'Không lấy được thông tin tồn kho. Vui lòng thử lại.';
            showToast.error(errorMsg);
            throw new Error(errorMsg);
          }

          const availableStock = inventoryInfo.availableToSell ??
            (inventoryInfo.theoreticalStock ?? 0) - (inventoryInfo.reservedQuantity ?? 0);

          if (availableStock < baseQuantityDelta) {
            const errorMsg = `Tồn kho không đủ. Hiện có: ${availableStock.toLocaleString('vi-VN')}, cần thêm: ${baseQuantityDelta.toLocaleString('vi-VN')}. Vui lòng điều chỉnh số lượng.`;
            showToast.warning(errorMsg, { autoClose: 5000 });
            throw new Error(errorMsg);
          }
        }

        // Reserve thêm số lượng tăng
        // CHỈ reserve sau khi đã kiểm tra tồn kho (nếu cần)
        try {
          await updateInventory({
            productCode: finalProductCode!,
            quantity: baseQuantityDelta,
            warehouseName: finalWarehouse!,
            operation: 'reserve', // Reserve thêm số lượng tăng
            isVatOrder,
            skipStockCheck: isVatOrder || shouldBypassInventoryCheck || isAllowedCustomer,
            productGroupCode: product.productGroupCode,
          });
        } catch (error: any) {
          const errorMsg = error.message || 'Không thể giữ tồn kho. Vui lòng thử lại.';
          showToast.error(errorMsg);
          throw new Error(errorMsg);
        }
      } else if (quantityDelta < 0 && finalProductCode && finalWarehouse) {
        // Giảm số lượng: Release số lượng giảm
        let baseQuantityDelta = Math.abs(quantityDelta);
        if (product.unit && finalProductCode) {
          try {
            const units = await fetchUnits(finalProductCode);
            const selectedUnit = units.find((u) => u.crdfd_name === product.unit);
            if (selectedUnit) {
              const conversionFactor = (selectedUnit as any)?.crdfd_giatrichuyenoi ??
                (selectedUnit as any)?.crdfd_giatrichuyendoi ??
                (selectedUnit as any)?.crdfd_conversionvalue ??
                1;
              const factorNum = Number(conversionFactor);
              if (!isNaN(factorNum) && factorNum > 0) {
                baseQuantityDelta = Math.abs(quantityDelta) * factorNum;
              }
            }
          } catch (unitError) {
            console.warn('Không thể lấy conversion factor, sử dụng quantity trực tiếp:', unitError);
          }
        }

        // Release số lượng giảm
        try {
          await updateInventory({
            productCode: finalProductCode!,
            quantity: baseQuantityDelta,
            warehouseName: finalWarehouse!,
            operation: 'release', // Giải phóng số lượng giảm
            isVatOrder,
          });
        } catch (error: any) {
          const errorMsg = error.message || 'Không thể giải phóng tồn kho. Vui lòng thử lại.';
          showToast.error(errorMsg);
          throw new Error(errorMsg);
        }
      }

      // Gọi API để update single SOD
      const result = await saveSaleOrderDetails({
        soId,
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
                          cursor: 'pointer',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                          borderLeft: meetsCondition ? '4px solid #10b981' : '4px solid transparent',
                          opacity: meetsCondition ? 1 : 0.6,
                          boxShadow: meetsCondition ? '0 1px 4px rgba(16,185,129,0.08)' : undefined
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
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
                        <span style={{ fontSize: '13px', flex: 1 }}>
                          {promo.name} ({promo.vndOrPercent === '%' ? `${promo.value}%` : `${promo.value?.toLocaleString('vi-VN')} VNĐ`})
                          {promo.chietKhau2 === 191920001 && (
                            <span style={{ marginLeft: '8px', color: '#059669', fontSize: '11px', fontWeight: '600' }}>
                              [Chiết khấu 2]
                            </span>
                          )}
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

      {/* Compact Header - 56px */}
      {!hideHeader && (
        <div className="admin-app-header-compact">
          <div className="admin-app-header-compact-left">
            <div className="admin-app-title-compact">Tạo đơn bán chi tiết</div>
            <div className="admin-app-status-badge">
              {soId ? 'SO ✓' : 'Chưa SO'}
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

      {/* Main Content - 2 Columns Layout */}
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
                    console.log('🔄 [Customer Selection] onChange triggered:', { value, option: !!option });

                    setCustomerId(value);
                    setCustomer(option?.label || '');
                    setCustomerCode(option?.cr44a_makhachhang || option?.cr44a_st || '');
                    setCustomerIndustry(option?.crdfd_nganhnghe ?? null);
                    const districtKey = option?.crdfd_keyquanhuyen || '';
                    console.log('👤 [Customer Selection] Customer data:', {
                      customerId: value,
                      customerName: option?.label || '',
                      customerCode: option?.cr44a_makhachhang || option?.cr44a_st || '',
                      crdfd_keyquanhuyen: option?.crdfd_keyquanhuyen || 'NOT_SET',
                      hasDistrictKey: !!districtKey
                    });
                    setCustomerDistrictKey(districtKey);
                    // Clear SO và các selected khi đổi customer
                    setSo('');
                    setSoId('');
                    setProductList([]); // Clear product list immediately
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
                  SO
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
                  options={saleOrders.map((so) => {
                    // Hiển thị đầy đủ thông tin: tên SO hoặc mã SO
                    // Ưu tiên crdfd_so_code, nếu không có thì dùng crdfd_so_auto
                    const soCode = so.crdfd_so_code || so.crdfd_so_auto || '';
                    const soName = (so.crdfd_name || '').trim();

                    // Kiểm tra xem soName đã chứa soCode chưa để tránh lặp
                    let baseLabel: string;
                    if (soName && soCode) {
                      const soNameLower = soName.toLowerCase();
                      const soCodeLower = soCode.toLowerCase();
                      // Nếu name đã chứa code (hoặc code là substring của name) thì chỉ dùng name
                      if (soNameLower.includes(soCodeLower)) {
                        baseLabel = soName;
                      } else {
                        // Nếu name không chứa code, ghép lại: code - name
                        baseLabel = `${soCode} - ${soName}`;
                      }
                    } else if (soCode) {
                      baseLabel = soCode;
                    } else if (soName) {
                      baseLabel = soName;
                    } else {
                      baseLabel = 'SO không tên';
                    }

                    const vatLabelText = getVatLabelText(so) || 'Không VAT';
                    return {
                      value: so.crdfd_sale_orderid,
                      label: baseLabel,
                      vatLabelText,
                      dropdownTooltip: baseLabel, // Tooltip để hiển thị đầy đủ khi hover
                      ...so,
                    };
                  })}
                  value={soId}
                  onChange={(value, option) => {
                    setSoId(value);
                    setSo(option?.label || '');
                    // Clear các selected khi đổi SO
                    clearFormOnSoChange();
                  }}
                  placeholder={customerId ? "Chọn SO" : "Chọn khách hàng trước"}
                  loading={soLoading}
                  disabled={!customerId}
                />
                {soError && (
                  <div className="admin-app-error-inline">{soError}</div>
                )}
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

        {/* Right Column - Product Info (70%) */}
        <div className="admin-app-column-right" style={{ flex: '1 1 70%', minWidth: 0 }}>
          <ProductEntryForm
            isAdding={isAdding}
            isSaving={isSaving}
            isLoadingDetails={isLoadingDetails}
            showInlineActions={hideHeader}
            hasUnsavedProducts={hasUnsavedProducts}
            product={product}
            setProduct={setProduct}
            productCode={productCode}
            setProductCode={setProductCode}
            unit={unit}
            setUnit={setUnit}
            warehouse={warehouse}
            setWarehouse={setWarehouse}
            customerId={customerId}
            customerCode={customerCode}
            customerName={customer}
            vatText={selectedVatText}
            paymentTerms={selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan}
            orderType={selectedSo?.crdfd_loai_don_hang}
            soId={soId}
            orderTotal={orderSummary.total}
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
            customerIndustry={customerIndustry}
            customerDistrictKey={customerDistrictKey}
            note={note}
            setNote={setNote}
            approver={approver}
            setApprover={setApprover}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            discountAmount={discountAmount}
            setDiscountAmount={setDiscountAmount}
            promotionText={promotionText}
            setPromotionText={setPromotionText}
            onAdd={handleAddProduct}
            onSave={handleSave}
            onRefresh={handleRefresh}
            onInventoryReserved={() => { }} // Callback để trigger reload inventory
            onProductGroupCodeChange={setProductGroupCode} // Callback để cập nhật productGroupCode
          />
        </div>
      </div>

      {/* Product Table - Fixed Height, No Scroll */}
      <div className="admin-app-table-wrapper">
        <ProductTable
          products={productList}
          setProducts={setProductList}
          onUpdate={handleUpdateProduct}
          soId={soId}
          warehouseName={warehouse}
          isVatOrder={!isNonVatSelected}
          onDelete={async (product) => {
            // Giải phóng hàng khi xóa sản phẩm (chỉ cho sản phẩm chưa được save vào CRM)
            if (!product.isSodCreated && product.productCode && product.warehouse && product.quantity > 0) {
              try {
                const isVatOrder = !isNonVatSelected;

                // Tính base quantity từ quantity và unit
                let baseQuantity = product.quantity;
                if (product.unit && product.productCode) {
                  try {
                    const units = await fetchUnits(product.productCode);
                    const selectedUnit = units.find((u) => u.crdfd_name === product.unit);
                    if (selectedUnit) {
                      const conversionFactor = (selectedUnit as any)?.crdfd_giatrichuyenoi ??
                        (selectedUnit as any)?.crdfd_giatrichuyendoi ??
                        (selectedUnit as any)?.crdfd_conversionvalue ??
                        1;
                      const factorNum = Number(conversionFactor);
                      if (!isNaN(factorNum) && factorNum > 0) {
                        baseQuantity = product.quantity * factorNum;
                      }
                    }
                  } catch (unitError) {
                    console.warn('Không thể lấy conversion factor, sử dụng quantity trực tiếp:', unitError);
                  }
                }

                await updateInventory({
                  productCode: product.productCode,
                  quantity: baseQuantity, // Sử dụng base quantity
                  warehouseName: product.warehouse,
                  operation: 'release', // Giải phóng hàng
                  isVatOrder,
                });
              } catch (error: any) {
                showToast.error(error.message || 'Không thể giải phóng tồn kho. Vui lòng thử lại.');
              }
            }
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

