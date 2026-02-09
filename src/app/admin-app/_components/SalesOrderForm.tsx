'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrders } from '../_hooks/useDropdownData';
import { fetchSaleOrders, SaleOrderDetail, saveSaleOrderDetails, updateInventory, fetchInventory, fetchUnits, fetchPromotionOrders, fetchSpecialPromotionOrders, applyPromotionOrder, PromotionOrderItem, InventoryInfo, fetchProductPromotions, fetchProductPromotionsBatch, Promotion } from '../_api/adminApi';
import { queryKeys } from '../_hooks/useReactQueryData';
import { APPROVERS_LIST } from '../../../constants/constants';
import { showToast } from '../../../components/ToastManager';
import { getItem } from '../../../utils/SecureStorage';
import { getStoredUser } from '../_utils/implicitAuthService';

interface ProductTableItem {
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
  priceNoVat: number | null;
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
  discountRate?: number; // Chiết khấu theo rate từ prices array
  discount2?: number;
  discount2Enabled?: boolean;
  promotionText?: string;
  promotionId?: string; // ID của promotion được apply cho item này
  eligibleForPromotion?: boolean; // Item có đủ điều kiện promotion không (dựa trên productCode + total amount condition)
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
  const searchParams = useSearchParams();

  // Helpers
  const normalizePromoKey = (p: any) => String(p.promotionId || p.id || p.name || '');
  const uniquePromotions = (promos: PromotionOrderItem[]) => {
    const seen = new Set<string>();
    const out: PromotionOrderItem[] = [];
    for (const p of promos || []) {
      const k = normalizePromoKey(p);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
    return out;
  };
  const vndCodeEquals = (p: any, code: number) => {
    if (p === null || p === undefined) return false;
    // fetchProductPromotions trả về field `vn` (string) từ promotions.ts API
    // fetchPromotionOrders trả về field `vndOrPercent`
    const v = p.vn ?? p.vndOrPercent ?? p.crdfd_vn;
    // Xử lý null, undefined, và empty string - đều coi như không có giá trị
    if (v === undefined || v === null || v === '') return false;
    const vs = String(v).trim();
    // Dùng == để so sánh string vs number (vn có thể là "191920000" hoặc 191920000)
    // biome-ignore lint/style/useIsNan: <explanation>
    return vs == String(code);
  };

  // ============================================================
  // Hàm recalculate promotion eligibility cho TẤT CẢ items
  // Called khi thêm item mới có promotion → cần check lại items khác
  // ============================================================
  const recalculatePromotionEligibility = useCallback(async (
    currentProducts: ProductTableItem[],
    soIdValue: string,
    customerCodeValue: string,
    selectedSo: any
  ): Promise<ProductTableItem[]> => {
    if (!soIdValue || currentProducts.length === 0) return currentProducts;

    // 1. Tìm items đã có promotion (eligibleForPromotion = true)
    const promoItems = currentProducts.filter(item => item.eligibleForPromotion);

    // 2. Tìm items CHƯA có promotion
    const nonPromoItems = currentProducts.filter(item => !item.eligibleForPromotion);

    // NOTE: KHÔNG early return ở đây vì vẫn cần kiểm tra promoItems
    // (promo có thể thay đổi hoặc bị loại bỏ khi tổng đơn thay đổi)

    // 3. Helper function: Tính tổng tiền từ các sản phẩm match với promotion
    // Chỉ tính tổng từ sản phẩm có productCode trong crdfd_masanpham_multiple
    // hoặc productGroupCode trong cr1bb_manhomsp_multiple của promotion
    const calculateTotalForPromotion = (
      products: ProductTableItem[],
      promotion: Promotion
    ): number => {
      const promoAny = promotion as any;
      const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';
      const productGroupCodesStr = promotion.productGroupCodes || promoAny.cr1bb_manhomsp_multiple || '';
      
      // Parse danh sách mã sản phẩm và mã nhóm sản phẩm (comma-separated)
      const allowedProductCodes = productCodesStr
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean);
      const allowedProductGroupCodes = productGroupCodesStr
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean);
      
      // Nếu promotion không có điều kiện về sản phẩm/nhóm sản phẩm → tính tổng tất cả
      const hasProductFilter = allowedProductCodes.length > 0 || allowedProductGroupCodes.length > 0;
      
      return products.reduce((sum, item) => {
        // Kiểm tra item có match với promotion không
        const matchesProductCode = !hasProductFilter || 
          (item.productCode && allowedProductCodes.includes(item.productCode));
        const matchesProductGroupCode = !hasProductFilter || 
          (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));
        
        // Chỉ tính tổng nếu item match với promotion
        if (matchesProductCode || matchesProductGroupCode) {
          const basePrice = item.price;
          const lineSubtotal = basePrice * (item.quantity || 0);
          const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
          return sum + lineSubtotal + lineVat;
        }
        return sum;
      }, 0);
    };

    // 3. Tính TỔNG TẤT CẢ items dùng BASE PRICE (giá gốc) để check điều kiện promotion
    // QUAN TRỌNG: Dùng price (giá gốc) để tính tổng, KHÔNG dùng discountedPrice
    // Vì điều kiện promotion (totalAmountCondition) áp dụng cho GIÁ TRỊ ĐƠN HÀNG GỐC,
    // sau đó mới tính discount cho từng item
    // LƯU Ý: Tổng này chỉ dùng cho fallback, mỗi promotion sẽ tính tổng riêng dựa trên sản phẩm match
    const totalOrderAmount = currentProducts.reduce((sum, item) => {
      // Dùng price (giá gốc), không phải discountedPrice
      const basePrice = item.price;
      const lineSubtotal = basePrice * (item.quantity || 0);
      const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
      return sum + lineSubtotal + lineVat;
    }, 0);

    const isDebug =
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('admin_app_debug_recalc') === '1';
    const debug = (...args: unknown[]) => {
      if (isDebug) console.debug(...args);
    };

    debug('[SalesOrderForm][RECALC] Starting recalculation:', {
      promoItemCount: promoItems.length,
      nonPromoItemCount: nonPromoItems.length,
      totalOrderAmount,
    });

    // 4. Fetch promotions cho TẤT CẢ items bằng fetchProductPromotions (cho cả CK1 và CK2)
    // Dùng promotions.ts API thay vì promotion-orders.ts
    try {
      // Collect tất cả items
      const allItems = [...nonPromoItems, ...promoItems];
      debug('[SalesOrderForm][RECALC] All items for promotions:', {
        totalProducts: allItems.length,
        promoItems: promoItems.map(p => ({ code: p.productCode, name: p.productName?.substring(0, 20), eligible: p.eligibleForPromotion })),
        nonPromoItems: nonPromoItems.map(p => ({ code: p.productCode, name: p.productName?.substring(0, 20), eligible: p.eligibleForPromotion })),
      });

      // Tối ưu: gọi promotions 1 lần cho tất cả productCodes (tránh N request tuần tự)
      const uniqueCodes = Array.from(
        new Set(
          allItems
            .map((i) => i.productCode)
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        )
      );

      const paymentTermsValue =
        selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan;

      debug('[SalesOrderForm][RECALC] Fetching promotions (batch):', {
        uniqueProducts: uniqueCodes.length,
        paymentTerms: paymentTermsValue,
      });

      const promotionsAll = await fetchProductPromotionsBatch(
        uniqueCodes,
        customerCodeValue || undefined,
        undefined, // region
        paymentTermsValue
      );

      const promotionsByCode = new Map<string, Promotion[]>();
      for (const code of uniqueCodes) {
        // Giữ behavior hiện tại: backend filter dùng contains(), nên ở client cũng match theo substring
        promotionsByCode.set(
          code,
          (promotionsAll || []).filter((p) => String(p.productCodes || '').includes(code))
        );
      }

      const promotionMap = new Map<string, { discountPercent: number; promotionId: string }>();
      let promotionsFetched = 0;

      // Helper: normalize promotionId để so sánh an toàn
      const normalizePromotionId = (id: string | undefined | null): string =>
        (id ?? '').toString().trim().toLowerCase();

      // Helper: xác định item đang dùng VND-based promotion (chiết khấu theo tiền, không theo %)
      const isVndBasedItem = (item: ProductTableItem): boolean => {
        const pct = Number(item.discountPercent ?? 0) || 0;
        const amt = Number(item.discountAmount ?? item.discount ?? 0) || 0;
        // VND-based: không có % nhưng có số tiền chiết khấu
        return pct === 0 && amt > 0;
      };

      for (const item of allItems) {
        if (!item.productCode) continue;

        // Tôn trọng các dòng đang có khuyến mãi VND (discountAmount > 0, discountPercent = 0)
        // → KHÔNG áp dụng lại promotion % cho các dòng này
        if (isVndBasedItem(item)) {
          continue;
        }

        const promotions = promotionsByCode.get(item.productCode) || [];

        // Filter promotions: percent-based và meets total condition
        const candidates = promotions.filter(p => {
          const isPercent = vndCodeEquals(p, 191920000);
          // Xử lý null/undefined/string "null" đúng cách
          // Dùng ?? thay vì || để handle string "null" (vì "" ?? 0 = "" ≠ 0)
          const rawCond = p.totalAmountCondition ?? null;
          // Chỉ convert sang number nếu là giá trị truthy, ngược lại coi như 0
          const minTotal = rawCond !== null ? Number(rawCond) : 0;
          
          // QUAN TRỌNG: Tính tổng tiền chỉ từ các sản phẩm match với promotion
          // (có trong cr1bb_manhomsp_multiple hoặc crdfd_masanpham_multiple)
          const totalForThisPromotion = calculateTotalForPromotion(currentProducts, p);
          
          // Nếu minTotal = 0 hoặc NaN → coi như không có điều kiện tối thiểu → luôn đáp ứng
          const meetsTotal = !minTotal || minTotal === 0 || isNaN(minTotal) || totalForThisPromotion >= minTotal;

          return isPercent && meetsTotal;
        });

        // Lấy promotion áp dụng cho item này:
        // - ƯU TIÊN: promotionId đang gắn trên item (người dùng đã chọn tay) nếu vẫn hợp lệ
        // - FALLBACK: promotion có giá trị cao nhất trong candidates
        if (candidates.length > 0) {
          const currentPromoIdNorm = normalizePromotionId(item.promotionId);

          // Thử tìm promotion khớp với promotionId hiện tại (tôn trọng lựa chọn của user)
          let chosenPromo =
            currentPromoIdNorm
              ? candidates.find(c => normalizePromotionId(c.id) === currentPromoIdNorm) || null
              : null;

          // Nếu không tìm thấy (hoặc item chưa có promotionId) → fallback chọn promotion tốt nhất
          if (!chosenPromo) {
            chosenPromo = candidates.reduce((best, current) => {
              // QUAN TRỌNG: promotions.ts trả về valueWithVat cho CK1 VAT
              // Dùng valueWithVat thay vì value khi value = 0
              const bestVal = Number(best.valueWithVat || best.value) || 0;
              const currVal = Number(current.valueWithVat || current.value) || 0;
              return currVal > bestVal ? current : best;
            }, candidates[0]);
          }

          // QUAN TRỌNG: Dùng valueWithVat thay vì value khi value = 0
          const discountPercent = Number(chosenPromo.valueWithVat || chosenPromo.value) || 0;

          promotionMap.set(item.productCode, {
            discountPercent,
            promotionId: chosenPromo.id
          });
        }

        promotionsFetched++;
      }

      debug('[SalesOrderForm][RECALC] Final promotionMap:', {
        mapSize: promotionMap.size,
        totalProducts: allItems.length,
        promotionsFetched,
        promotions: Array.from(promotionMap.entries()).map(([code, info]) => ({
          productCode: code,
          discountPercent: info.discountPercent,
          promotionId: info.promotionId,
        })),
      });

      // 6. Update TẤT CẢ items dựa trên promotionMap
      // Logic đơn giản:
      // - Nếu item có trong promotionMap → ÁP DỤNG promotion
      // - Nếu item không có trong promotionMap → LOẠI BỎ promotion
      let updatedCount = 0;
      let removedCount = 0;
      const updatedProducts = currentProducts.map(item => {
        const promoInfo = promotionMap.get(item.productCode || '');

        console.debug('[SalesOrderForm][RECALC] Processing item for update:', {
          productCode: item.productCode,
          productName: item.productName?.substring(0, 30),
          currentEligibleForPromotion: item.eligibleForPromotion,
          currentDiscountPercent: item.discountPercent,
          currentPromotionId: item.promotionId,
          hasPromoInfo: !!promoInfo,
          promoInfoDiscount: promoInfo?.discountPercent,
          promoInfoPromotionId: promoInfo?.promotionId,
          inPromotionMap: !!promoInfo,
        });

        // Nếu item đang dùng khuyến mãi VND (discountAmount > 0, discountPercent = 0) → giữ nguyên, không sửa
        if (isVndBasedItem(item)) {
          console.debug('[SalesOrderForm][RECALC] Skip VND-based promotion item (keep as is):', {
            productCode: item.productCode,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount ?? item.discount,
            promotionId: item.promotionId,
          });
          return item;
        }

        // Case A: Item có trong promotionMap → ÁP DỤNG promotion
        if (promoInfo) {
          // Nếu đã có promotion, discount giống nhau VÀ promotionId trùng → giữ nguyên
          // Lưu ý: cần so sánh cả promotionId để tránh giữ lại promotion cũ khi backend đổi sang promotion mới nhưng % giống nhau
          if (
            item.eligibleForPromotion &&
            item.discountPercent === promoInfo.discountPercent &&
            normalizePromotionId(item.promotionId) === normalizePromotionId(promoInfo.promotionId)
          ) {
            console.debug('[SalesOrderForm][RECALC] Item already has same promotion & id, skipping:', {
              productCode: item.productCode,
              discountPercent: item.discountPercent,
              promotionId: item.promotionId,
            });
            return item;
          }

          updatedCount++;
          console.debug('[SalesOrderForm][RECALC] Applied promotion to item:', {
            productCode: item.productCode,
            newDiscountPercent: promoInfo.discountPercent,
            wasEligibleForPromotion: item.eligibleForPromotion,
          });

          // Tính discountedPrice từ basePrice
          const basePrice = item.price;
          const discountAmount = basePrice * (promoInfo.discountPercent / 100);
          const discountedPrice = basePrice - discountAmount;

          const subtotal = Math.round((item.quantity || 0) * discountedPrice);
          const vatAmount = Math.round((subtotal * (item.vat || 0)) / 100);
          const totalAmount = subtotal + vatAmount;

          return {
            ...item,
            eligibleForPromotion: true,
            discountPercent: promoInfo.discountPercent,
            discount: discountAmount,
            discountedPrice,
            subtotal,
            vatAmount,
            totalAmount,
            promotionId: promoInfo.promotionId,
          };
        }

        // Case B: Item không có trong promotionMap → LOẠI BỎ promotion (%)
        // LƯU Ý: KHÔNG đụng vào các dòng VND-based (đã được return ở trên)
        if (item.eligibleForPromotion) {
          removedCount++;
          console.debug('[SalesOrderForm][RECALC] Removed promotion from item:', {
            productCode: item.productCode,
            reason: 'Không có promotion khả dụng hoặc tổng đơn không đủ điều kiện',
            previousDiscountPercent: item.discountPercent,
          });

          // Khôi phục giá gốc
          const basePrice = item.price;
          const subtotal = Math.round((item.quantity || 0) * basePrice);
          const vatAmount = Math.round((subtotal * (item.vat || 0)) / 100);
          const totalAmount = subtotal + vatAmount;

          return {
            ...item,
            eligibleForPromotion: false,
            discountPercent: 0,
            discount: 0,
            discountedPrice: basePrice,
            subtotal,
            vatAmount,
            totalAmount,
            promotionId: undefined,
            promotionText: undefined,
          };
        }

        // Case C: Item không có promotion và không có trong promotionMap → giữ nguyên
        console.debug('[SalesOrderForm][RECALC] Item unchanged (no promotion applicable):', {
          productCode: item.productCode,
          productName: item.productName?.substring(0, 30),
          currentEligibleForPromotion: item.eligibleForPromotion,
          inPromotionMap: !!promoInfo,
        });
        return item;
      });

      console.debug('[SalesOrderForm][RECALC] Completed:', {
        updatedCount,    // Số items được THÊM promotion
        removedCount,    // Số items được LOẠI BỎ promotion
        totalProducts: updatedProducts.length,
      });

      return updatedProducts;
    } catch (err) {
      console.warn('[SalesOrderForm][RECALC] Error:', err);
      return currentProducts;
    }
  }, []);

  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [so, setSo] = useState('');
  const [soId, setSoId] = useState('');
  // Dùng để force reload details ngay cả khi user chọn lại đúng cùng 1 SO (soId không đổi)
  const [soReloadSeq, setSoReloadSeq] = useState(0);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isOrderInfoCollapsed, setIsOrderInfoCollapsed] = useState(false);

  // Read soId from URL params on mount
  useEffect(() => {
    const urlSoId = searchParams?.get('soId');
    if (urlSoId && urlSoId !== soId) {
      setSoId(urlSoId);
    }
  }, [searchParams, soId]);

  // Fetch data for dropdowns
  const { customers, loading: customersLoading } = useCustomers(customerSearch);
  // Load SO - if customerId is selected, filter by customer, otherwise load all
  const { saleOrders, loading: soLoading, error: soError } = useSaleOrders(customerId || undefined);
  const queryClient = useQueryClient();
  const [product, setProduct] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productGroupCode, setProductGroupCode] = useState('');
  const [unit, setUnit] = useState('');
  const [unitId, setUnitId] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [priceNoVat, setPriceNoVat] = useState<number | null>(null);
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
  const [customerRegion, setCustomerRegion] = useState<string>('');
  const [customerWecareRewards, setCustomerWecareRewards] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [approver, setApprover] = useState('');
  const [priceEntryMethod, setPriceEntryMethod] = useState<'Nhập thủ công' | 'Theo chiết khấu'>('Nhập thủ công');
  const [discountRate, setDiscountRate] = useState<string>('1');
  const [discountPercent, setDiscountPercent] = useState(0);

  const discountRates = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20'];
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promotionText, setPromotionText] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [productList, setProductList] = useState<ProductTableItem[]>([]);

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
  const [specialPromotionList, setSpecialPromotionList] = useState<PromotionOrderItem[]>([]);
  const [selectedPromotionOrders, setSelectedPromotionOrders] = useState<PromotionOrderItem[]>([]); // Multi-select
  const [isApplyingPromotion, setIsApplyingPromotion] = useState(false);
  const [promotionPopupOrderTotal, setPromotionPopupOrderTotal] = useState<number | null>(null);
  const SPECIAL_PROMOTION_KEYWORDS = [
    '[ALL] GIẢM GIÁ ĐẶC BIỆT',
    '[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA',
    '[ALL] VOUCHER SINH NHẬT'
  ];

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

      // Quan trọng: tránh gọi `sale-order-details` khi `sale-orders` còn đang load (sẽ gây 2 API call cùng lúc).
      // Chờ `saleOrders` về rồi dùng dữ liệu đã `$expand`.
      if (soLoading) {
        setIsLoadingDetails(true);
        return;
      }

      // Nếu đã load xong mà không có SO nào thì clear details
      if (!soLoading && (!saleOrders || saleOrders.length === 0)) {
        setProductList([]);
        setIsLoadingDetails(false);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const currentSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
        // Ưu tiên dùng dữ liệu từ expanded relationship gốc `crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O`
        // Fallback sang field `details` nếu cần (backward-compatible).
        const expandedDetails =
          (currentSo as any)?.crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O ??
          (currentSo as any)?.details;

        // Dữ liệu chi tiết đang có từ state (nếu sale-orders đã expand)
        const detailsFromState: SaleOrderDetail[] = Array.isArray(expandedDetails)
          ? expandedDetails
          : [];

        // Nếu user vừa chọn lại SO (soReloadSeq thay đổi) HOẶC chưa có details trong state
        // → gọi lại API `sale-orders` với forceRefresh để lấy bản mới nhất (đã expand SOD).
        const shouldForceRefetch = soReloadSeq > 0 || detailsFromState.length === 0;

        let details: SaleOrderDetail[] = detailsFromState;
        if (shouldForceRefetch) {
          const refreshedOrders = await fetchSaleOrders(customerId || undefined, true);
          queryClient.setQueryData(queryKeys.saleOrders(customerId || undefined), refreshedOrders);
          const refreshedSo = refreshedOrders.find((so) => so.crdfd_sale_orderid === soId);
          const refreshedExpanded =
            (refreshedSo as any)?.crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O ??
            (refreshedSo as any)?.details;
          details = Array.isArray(refreshedExpanded) ? refreshedExpanded : [];
        }

        const normalizeApproveNote = (note: string | undefined, approverId: string | undefined) => {
          const rawNote = note || '';
          const prefix = 'Duyệt giá bởi ';
          if (!rawNote.startsWith(prefix)) return rawNote;

          // Backward-compatible: dữ liệu cũ có thể đang lưu GUID thay vì tên
          const maybeId = rawNote.slice(prefix.length).trim();
          const nameFromNoteId = APPROVERS_LIST.find((a) => a.id === maybeId)?.name;
          if (nameFromNoteId) return `${prefix}${nameFromNoteId}`;

          const nameFromApprover = APPROVERS_LIST.find((a) => a.id === approverId)?.name;
          if (approverId && maybeId === approverId && nameFromApprover) return `${prefix}${nameFromApprover}`;

          return rawNote;
        };

        // Map SaleOrderDetail to ProductTableItem
        const mappedProducts: ProductTableItem[] = details.map((detail: SaleOrderDetail) => {
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
              // Normalize backend decimal formats:
              // - Very small fractions (e.g., 0.027) -> show as percent with one decimal (2.7)
              // - Larger decimals between 0.05 and 1 likely represent percent-with-decimals (e.g., 0.94 -> 0.94)
              // - Values > 1 are percent-like, keep one decimal
              if (num > 0 && num < 0.05) return Math.round(num * 1000) / 10;
              if (num > 0 && num <= 1) return Math.round(num * 100) / 100;
              return Math.round(num * 10) / 10;
            })(),
            discount2Enabled: Boolean((detail as any).crdfd_chieckhau2 ?? (detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2),
            unit: detail.unit,
            quantity: detail.quantity,
            price: detail.price,
            priceNoVat: null,
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
            note: normalizeApproveNote(detail.note, detail.approver),
            approvePrice: detail.approvePrice,
            approveSupPrice: detail.approveSupPrice,
            discountPercent: detail.discountPercent,
            discountAmount: detail.discountAmount,
            discountRate: detail.discountRate,
            promotionText: detail.promotionText,
            promotionId: detail.promotionId,
            // Existing products: nếu có discount hoặc promotion thì được tính là eligible
            // Đây là products đã được save trước đó nên đã có promotion status từ backend
            eligibleForPromotion: (detail.discountPercent ?? 0) > 0 || (detail.discountAmount ?? 0) > 0 || Boolean(detail.promotionId),
            invoiceSurcharge: detail.invoiceSurcharge,
            isSodCreated: true,
            isModified: false, // Mặc định chưa sửa
            originalQuantity: detail.quantity, // Lưu số lượng gốc
          };
        });
        // Sort by STT descending (already sorted by API, but ensure it)
        mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
        setProductList(mappedProducts);

        // Set customer wecare rewards from customer list if available
        const customerOption = customers.find(c => c.crdfd_customerid === customerId);
        if (customerOption && (customerOption as any).crdfd_wecare_rewards) {
          setCustomerWecareRewards((customerOption as any).crdfd_wecare_rewards);
        }
      } catch (error) {
        console.error('Error loading sale order details:', error);
        setProductList([]);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadSaleOrderDetails();
  }, [soId, soReloadSeq, customerId, soLoading, saleOrders]);

  // NOTE: promotion-orders API should only be called when user explicitly requests promotions
  // (on Save or when clicking the special promotions button). The previous auto-fetch
  // logic was removed to avoid unnecessary server calls on every product/total change.

  const handleAddProduct = async (overrides?: { promotionId?: string, discountPercent?: number, discountAmount?: number, discountRate?: number }) => {
    console.debug('[SalesOrderForm] handleAddProduct called', {
      overrides,
      localDiscountPercent: discountPercent,
      localDiscountAmount: discountAmount,
      promotionId,
      productCode,
      price,
      quantity,
    });
    // Debug: log when called to help trace missing discountPercent issues reported by users
    try {
      console.debug('[SalesOrderForm][DEBUG] Before compute - overrides.discountPercent:', overrides?.discountPercent, 'parent discountPercent:', discountPercent);
    } catch (err) { /* ignore logging errors */ }
    // Validation: product, unit, quantity, price
    // Khi bật "Duyệt giá" cho phép giá = 0, khi không bật thì bắt buộc > 0
    const priceNum = parseFloat(price || '0') || 0;
    const hasValidPrice = approvePrice ? priceNum >= 0 : priceNum > 0;

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
    // Prefer overrides from child to avoid React state propagation timing issues.
    const basePrice = priceNum;

    // Helper function: Tính tổng tiền từ các sản phẩm match với promotion
    // Chỉ tính tổng từ sản phẩm có productCode trong crdfd_masanpham_multiple
    // hoặc productGroupCode trong cr1bb_manhomsp_multiple của promotion
    const calculateTotalForPromotion = (
      products: ProductTableItem[],
      promotion: any,
      newProduct?: { productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }
    ): number => {
      const productCodesStr = promotion.productCodes || promotion.crdfd_masanpham_multiple || '';
      const productGroupCodesStr = promotion.productGroupCodes || promotion.cr1bb_manhomsp_multiple || '';
      
      // Parse danh sách mã sản phẩm và mã nhóm sản phẩm (comma-separated)
      const allowedProductCodes = productCodesStr
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean);
      const allowedProductGroupCodes = productGroupCodesStr
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean);
      
      // Nếu promotion không có điều kiện về sản phẩm/nhóm sản phẩm → tính tổng tất cả
      const hasProductFilter = allowedProductCodes.length > 0 || allowedProductGroupCodes.length > 0;
      
      let total = 0;
      
      // Tính tổng từ các sản phẩm hiện tại trong đơn
      if (products && products.length > 0) {
        total += products.reduce((sum, item) => {
          const matchesProductCode = !hasProductFilter || 
            (item.productCode && allowedProductCodes.includes(item.productCode));
          const matchesProductGroupCode = !hasProductFilter || 
            (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));
          
          if (matchesProductCode || matchesProductGroupCode) {
            const basePrice = item.price;
            const lineSubtotal = basePrice * (item.quantity || 0);
            const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
            return sum + lineSubtotal + lineVat;
          }
          return sum;
        }, 0);
      }
      
      // Thêm sản phẩm đang thêm vào tổng nếu match với promotion
      if (newProduct) {
        const matchesProductCode = !hasProductFilter || 
          (newProduct.productCode && allowedProductCodes.includes(newProduct.productCode));
        const matchesProductGroupCode = !hasProductFilter || 
          (newProduct.productGroupCode && allowedProductGroupCodes.includes(newProduct.productGroupCode));
        
        if (matchesProductCode || matchesProductGroupCode) {
          const basePrice = newProduct.price;
          const lineSubtotal = basePrice * (newProduct.quantity || 0);
          const lineVat = Math.round((lineSubtotal * (newProduct.vat ?? 0)) / 100);
          total += lineSubtotal + lineVat;
        }
      }
      
      return total;
    };

    // Tính subtotal và VAT ƯỚC TÍNH của sản phẩm mới (chưa discount)
    const newProductSubtotalEstimate = Math.round(quantity * basePrice);
    const newProductVatEstimate = Math.round((newProductSubtotalEstimate * (vatPercent || 0)) / 100);
    const newProductTotalEstimate = newProductSubtotalEstimate + newProductVatEstimate;
    
    // Dữ liệu sản phẩm mới để tính tổng
    const newProductForCalc = {
      productCode: productCode,
      productGroupCode: productGroupCode,
      price: basePrice,
      quantity: quantity,
      vat: vatPercent || 0,
    };

    // QUAN TRỌNG: Check promotion eligibility RIÊNG CHO TỪNG ITEM
    // Mỗi item sẽ tự check xem nó có promotion applicable không dựa trên:
    // 1. productCode của chính nó
    // 2. Tổng tiền của TẤT CẢ promotional items (không phải toàn bộ order)
    let inferredDiscountPercent: number | null = null;
    let inferredPromotionId: string | undefined;
    let currentItemEligibleForPromotion = false; // Item hiện tại có đủ điều kiện promotion không

    // Luôn gọi API để kiểm tra promotion cho item này
    if (soId) {
      try {
        // Ask server for promotions for this SO restricted to this product
        // Tính tổng tất cả sản phẩm để filter ở backend (backend sẽ filter theo totalAmountCondition)
        // Sau đó frontend sẽ tính lại tổng chính xác theo từng promotion cụ thể
        const totalAllProducts = productList.reduce((sum, item) => {
          const lineSubtotal = item.price * (item.quantity || 0);
          const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
          return sum + lineSubtotal + lineVat;
        }, 0) + newProductTotalEstimate;
        
        const res = await fetchPromotionOrders(
          soId,
          customerCode || undefined,
          totalAllProducts,
          productCode ? [productCode] : [],
          productGroupCode ? [productGroupCode] : [],
          selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
        );

        // Lấy tất cả promotions percent-based đáp ứng điều kiện (bao gồm cả CK1 và CK2)
        const allPromotions = res.availablePromotions || res.allPromotions || [];

        console.debug('[SalesOrderForm][PROMO API RESPONSE]', {
          hasAvailablePromotions: Array.isArray(res.availablePromotions),
          availablePromotionsCount: res.availablePromotions?.length,
          hasAllPromotions: Array.isArray(res.allPromotions),
          allPromotionsCount: res.allPromotions?.length,
          productCode,
          productGroupCode,
        });

        // Log detailed info about each promotion
        allPromotions.forEach((p, idx) => {
          console.debug(`[SalesOrderForm][PROMO API] [${idx}]`, {
            id: p.id,
            name: p.name?.substring(0, 60),
            type: p.type,
            value: p.value,
            vndOrPercent: p.vndOrPercent,
            chietKhau2: p.chietKhau2,
            totalAmountCondition: p.totalAmountCondition,
            applicable: p.applicable,
          });
        });

        const candidates = allPromotions.filter(p => {
          // Chỉ lấy percent-based promotions
          const isPercent = vndCodeEquals(p, 191920000);

          // QUAN TRỌNG: Tính tổng tiền chỉ từ các sản phẩm match với promotion này
          // (có trong cr1bb_manhomsp_multiple hoặc crdfd_masanpham_multiple)
          const totalForThisPromotion = calculateTotalForPromotion(
            productList,
            p,
            newProductForCalc
          );

          // Kiểm tra điều kiện tổng tiền (tongTienApDung)
          const minTotal = Number(p.totalAmountCondition || 0);
          const meetsTotalCondition = minTotal === 0 || totalForThisPromotion >= minTotal;

          const shouldInclude = isPercent && meetsTotalCondition;

          // Debug: Log tất cả promotions và lý do
          const pAny = p as any;
          console.debug('[SalesOrderForm][PROMO FILTER]', {
            id: p.id,
            name: p.name?.substring(0, 50),
            isPercent,
            vndOrPercent: p.vndOrPercent,
            chietKhau2: p.chietKhau2,
            minTotal,
            totalForThisPromotion,
            productCodes: p.productCodes || pAny.crdfd_masanpham_multiple,
            productGroupCodes: p.productGroupCodes || pAny.cr1bb_manhomsp_multiple,
            meetsTotalCondition,
            shouldInclude,
          });

          return shouldInclude;
        });

        if (candidates && candidates.length > 0) {
          // ƯU TIÊN: nếu child (ProductEntryForm) đã gửi overrides.promotionId (user chọn tay)
          // và promotion đó vẫn hợp lệ trong candidates thì dùng đúng promotion đó.
          const overridesPromoIdNorm = overrides?.promotionId
            ? overrides.promotionId.trim().toLowerCase()
            : '';

          let pick =
            overridesPromoIdNorm !== ''
              ? candidates.find(c => String(c.id || '').trim().toLowerCase() === overridesPromoIdNorm) || null
              : null;

          // Nếu không tìm thấy (hoặc không có overrides) → fallback như cũ: chọn promotion đầu tiên (server đã filter)
          if (!pick) {
            pick = candidates[0];
          }

          const num = Number(pick.value) || 0;
          if (!isNaN(num) && num > 0) {
            inferredDiscountPercent = num;
            currentItemEligibleForPromotion = true; // Item này có promotion!
          }

          // Luôn dùng promotionId từ promotion đã chọn
          inferredPromotionId = pick.id;

          // Tính lại tổng cho promotion được chọn để log
          const totalForSelectedPromotion = calculateTotalForPromotion(
            productList,
            pick,
            newProductForCalc
          );
          
          const pickAny = pick as any;
          console.debug('[SalesOrderForm][PROMO DEBUG] Found valid promotion for item (respect overrides):', {
            productCode,
            promotionId: pick.id,
            name: pick.name,
            value: num,
            minTotalCondition: pick.totalAmountCondition,
            totalForSelectedPromotion,
            productCodes: pick.productCodes || pickAny.crdfd_masanpham_multiple,
            productGroupCodes: pick.productGroupCodes || pickAny.cr1bb_manhomsp_multiple,
            currentItemEligibleForPromotion,
            usedOverridesPromotionId: overridesPromoIdNorm !== '',
          });
        } else {
          // Không tìm thấy promotion phù hợp cho item này
          currentItemEligibleForPromotion = false;
          console.debug('[SalesOrderForm][PROMO DEBUG] No valid promotion found for item:', {
            productCode,
            currentItemEligibleForPromotion,
            allPromotionsCount: allPromotions.length,
          });
        }
      } catch (err) {
        console.warn('[SalesOrderForm] Could not fetch promotions to infer discountPercent:', err);
      }
    }

    // ƯU TIÊN DISCOUNT:
    // 1. overrides.discountPercent (từ ProductEntryForm - manual entry, ƯU TIÊN CAO NHẤT)
    // 2. inferredDiscountPercent (từ promotion valid - đáp ứng điều kiện)
    // 3. 0 (không có discount)
    // Lưu ý: inferredDiscountPercent chỉ có giá trị KHI currentItemEligibleForPromotion = true
    const usedDiscountPercent = overrides?.discountPercent ?? inferredDiscountPercent ?? 0;
    const usedDiscountAmount = overrides?.discountAmount ?? discountAmount;

    console.debug('[SalesOrderForm][DISCOUNT FINAL] Final discount calculation:', {
      inferredDiscountPercent,
      currentItemEligibleForPromotion,
      overridesDiscountPercent: overrides?.discountPercent,
      overridesDiscountAmount: overrides?.discountAmount,
      usedDiscountPercent,
      usedDiscountAmount,
      hasSoId: !!soId,
    });

    const discountedPriceCalc = basePrice * (1 - (usedDiscountPercent || 0) / 100) - (usedDiscountAmount || 0);
    const finalPrice = discountedPriceCalc * (1 + invoiceSurchargeRate);

    console.debug('[SalesOrderForm][DISCOUNT DEBUG] Price calculation:', {
      basePrice,
      currentItemEligibleForPromotion,
      inferredDiscountPercent,
      overridesDiscountPercent: overrides?.discountPercent,
      usedDiscountPercent,
      usedDiscountAmount,
      discountedPriceCalc,
      invoiceSurchargeRate,
      finalPrice,
    });

    // Add new product (always create new line, no merging)
    // Calculate amounts (round VAT per line)
    // IMPORTANT: Use discountedPriceCalc (not finalPrice) to match orderSummary calculation logic
    // Invoice surcharge is tracked separately in invoiceSurcharge field
    const subtotalCalc = Math.round(quantity * discountedPriceCalc);
    const vatCalc = Math.round((subtotalCalc * (vatPercent || 0)) / 100);
    const totalCalc = subtotalCalc + vatCalc;

    // Auto-increment STT
    const maxStt = productList.length > 0 ? Math.max(...productList.map((p) => p.stt || 0)) : 0;
    const newStt = maxStt + 1;

    // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [tên người duyệt]"
    // Tại sao: approver đang là GUID (lookup Employee). Note cần hiển thị tên để dễ đọc.
    const approverName = APPROVERS_LIST.find((a) => a.id === approver)?.name ?? approver;
    const formattedNote = approvePrice && approverName ? `Duyệt giá bởi ${approverName}` : note;

    // Xác định promotionId để sử dụng:
    // Ưu tiên: overrides.promotionId > inferredPromotionId
    // Nếu không có inferredPromotionId (không tìm thấy promotion phù hợp), dùng chuỗi rỗng
    // Đảm bảo KHÔNG fallback về promotionId cũ từ state khi không có promotion phù hợp
    const promoIdToUse = overrides?.promotionId ?? inferredPromotionId ?? '';
    const promotionTextToUse = inferredPromotionId ? (() => {
      // Lấy promotion name từ candidates nếu có
      // Note: candidates được define trong scope trên, có thể truy cập nếu inferredPromotionId có giá trị
      return '';
    })() : '';
    const newProduct: ProductTableItem = {
      id: `${Date.now()}-${newStt}`,
      stt: newStt,
      productCode: productCode,
      productName: product,
      productGroupCode: productGroupCode,
      unit: unit,
      quantity,
      price: priceNum,
      priceNoVat: priceNoVat,
      surcharge: 0,
      discount: usedDiscountAmount,
      // CRITICAL FIX: Use discountedPriceCalc (before surcharge) instead of finalPrice
      // discountedPrice should be: price after discount, before VAT and invoice surcharge
      discountedPrice: approvePrice ? (priceNoVat ?? discountedPriceCalc) : discountedPriceCalc,
      discountPercent: usedDiscountPercent,
      discountAmount: usedDiscountAmount,
      discountRate: overrides?.discountRate,
      vat: vatPercent,
      subtotal: subtotalCalc,
      vatAmount: vatCalc,
      totalAmount: totalCalc,
      approver: approver, // Should be GUID ID now
      deliveryDate: deliveryDate,
      warehouse: warehouse,
      note: formattedNote,
      urgentOrder: urgentOrder,
      approvePrice: approvePrice,
      approveSupPrice: approveSupPrice,
      promotionText: promotionTextToUse,
      promotionId: promoIdToUse,
      // Trạng thái promotion eligibility của item này
      // true = item này có promotion (đáp ứng điều kiện totalAmountCondition)
      // false = item này không có promotion
      eligibleForPromotion: currentItemEligibleForPromotion,
      invoiceSurcharge: invoiceSurchargeRate,
      createdOn: new Date().toISOString(),
      isSodCreated: false,
    };
    // Debug: log constructed product to verify approver field
    try {
      console.debug('[SalesOrderForm][DEBUG] New product prepared', {
        approver: approver,
        approverType: typeof approver,
        discountPercent: usedDiscountPercent,
        discountedPrice: newProduct.discountedPrice,
        promotionId: promoIdToUse,
        eligibleForPromotion: currentItemEligibleForPromotion,
      });
    } catch (err) { /* ignore logging errors */ }

    console.debug('[SalesOrderForm] Adding product with promotionId:', promoIdToUse, 'eligibleForPromotion:', currentItemEligibleForPromotion);

    // Thêm product mới vào danh sách tạm
    const productsWithNew = [...productList, newProduct];

    // ============================================================
    // QUAN TRỌNG: Recalculate promotion eligibility cho TẤT CẢ items
    // Nếu item mới có promotion (eligibleForPromotion = true),
    // các items khác CHƯA có promotion có thể đã đủ điều kiện
    // ============================================================
    const recalculatedProducts = await recalculatePromotionEligibility(
      productsWithNew,
      soId,
      customerCode,
      selectedSo
    );
    setProductList(recalculatedProducts);

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
    setPromotionId('');
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
        // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [tên người duyệt]"
        const approverName = APPROVERS_LIST.find((a) => a.id === item.approver)?.name ?? item.approver;
        const formattedNote = item.approvePrice && approverName ? `Duyệt giá bởi ${approverName}` : item.note || '';

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
          priceNoVat: item.priceNoVat ?? null,
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
          discountRate: item.discountRate,
          // Secondary discount (Chiết khấu 2) - percent value (e.g., 5 = 5%)
          discount2: item.discount2 ?? 0,
          discount2Enabled: item.discount2Enabled ?? false,
          crdfd_chietkhau2: item.discount2 ?? 0, // Send to backend as crdfd_chietkhau2
          promotionText: item.promotionText,
          promotionId: item.promotionId,
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
          // Refresh sale-orders (đã expand SOD) để tránh gọi thêm `sale-order-details`
          const refreshedOrders = await fetchSaleOrders(customerId || undefined, true);
          queryClient.setQueryData(queryKeys.saleOrders(customerId || undefined), refreshedOrders);
          const currentSo = refreshedOrders.find((so) => so.crdfd_sale_orderid === soId);
          const updatedDetails: SaleOrderDetail[] =
            (currentSo as any)?.details ??
            (currentSo as any)?.crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O ??
            [];

          const mappedProducts: ProductTableItem[] = updatedDetails.map((detail: SaleOrderDetail) => {
            const subtotal = (detail.discountedPrice || detail.price) * detail.quantity;
            const vatAmount = (subtotal * detail.vat) / 100;
            return {
              id: detail.id,
              stt: detail.stt,
              productName: detail.productName,
              unit: detail.unit,
              quantity: detail.quantity,
              price: detail.price,
              priceNoVat: null,
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
      setPromotionId('');
      // Logic mới: Chỉ hiển thị popup promotion order sau khi save nếu có chiết khấu 2
      // Chỉ check khi có soId và customerCode (đã save thành công)
      if (savedSoId && savedCustomerCode) {
        try {
          const promotionOrderResult = await fetchPromotionOrders(
            savedSoId,
            savedCustomerCode,
            savedTotalAmount,
            savedProductCodes,
            savedProductGroupCodes,
            selectedSo?.crdfd_dieu_khoan_thanh_toan
          );

          // Determine promotions based on allPromotions but filter out those not applicable or not meeting total condition
          const allPromos: PromotionOrderItem[] = promotionOrderResult.allPromotions || [];
          const available: PromotionOrderItem[] = allPromos.filter(p => {
            const cond = Number(p.totalAmountCondition || 0);
            const meetsTotal = isNaN(cond) || cond === 0 || Number(savedTotalAmount) >= cond;
            const isApplicable = (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true');
            return isApplicable && meetsTotal;
          });
          let chietKhau2Promotions = allPromos.filter(p => {
            const cond = Number(p.totalAmountCondition || 0);
            const meetsTotal = isNaN(cond) || cond === 0 || Number(savedTotalAmount) >= cond;
            const isApplicable = (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true');
            return isApplicable && meetsTotal && vndCodeEquals(p, 191920000);
          }) || [];
          chietKhau2Promotions = uniquePromotions(chietKhau2Promotions);

          // Determine special promotions as those with crdfd_vn = 191920001
          let special: PromotionOrderItem[] = (promotionOrderResult.specialPromotions && promotionOrderResult.specialPromotions.length > 0)
            ? promotionOrderResult.specialPromotions
            : (promotionOrderResult.allPromotions || []);
          special = (special || []).filter((p: PromotionOrderItem) =>
            vndCodeEquals(p, 191920001) && ((p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'))
          );
          special = uniquePromotions(special);

          // Populate top list with filtered allPromotions (already removed non-applicable items)
          const topList = uniquePromotions(available.length > 0 ? available : chietKhau2Promotions);
          setPromotionOrderList(topList);
          // Ensure special list does not contain items already in topList
          const topKeys = new Set(topList.map(p => normalizePromoKey(p)));
          const filteredSpecials = special.filter(p => !topKeys.has(normalizePromoKey(p)));
          if (filteredSpecials.length > 0) setSpecialPromotionList(filteredSpecials);

          // Pre-select chietKhau2 promotions if present, otherwise none
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
            // No applicable promotions -> clear all form data after successful save
            clearEverything();
          }
        } catch (error) {
          console.error('[Promotion Order] ❌ Error checking promotion orders:', error);
          // Nếu có lỗi khi fetch, vẫn không hiển thị popup
        }
      } else {
      }

      // Thay vào đó, promotions được save kèm luôn trong handleSaveWithPromotions
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
    setPromotionId('');
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
    setPromotionId('');
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
    setDeliveryDate('');  // Allow ProductEntryForm to auto-calculate
    // Keep note - không clear ghi chú
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setPromotionId('');
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
      // Chuẩn bị dữ liệu đơn hàng
      // Dedupe selected promotions before including in payload
      const promosToInclude = Array.from(new Map(selectedPromotionOrders.map(p => [p.id, p])).values());

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
            priceNoVat: item.priceNoVat ?? null,
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
            promotionId: item.promotionId,
            invoiceSurcharge: item.invoiceSurcharge,
            stockQuantity: item.stockQuantity,
            discount2: item.discount2 ?? 0,
            discount2Enabled: item.discount2Enabled ?? false,
            crdfd_chietkhau2: item.discount2 ?? 0, // Send to backend as crdfd_chietkhau2
          };
        }),
        // Only include unique selected promotions (dedupe by id)
        promotions: promosToInclude.map((promo: PromotionOrderItem) => ({
          promotionId: promo.id,
          promotionName: promo.name,
          promotionValue: promo.value || 0,
          vndOrPercent: String(promo.vndOrPercent ?? '%'),
          chietKhau2: String(promo.chietKhau2) === '191920001' || String(promo.chietKhau2).toLowerCase() === 'true',
          productCodes: promo.productCodes,
          productGroupCodes: promo.productGroupCodes,
        }))
      };

      // Validate promotions against order total (cr1bb_tongtienapdung)
      const orderTotalForValidation = orderSummary?.total || totalAmount || productList.reduce((s, p) => s + (p.totalAmount || ((p.discountedPrice ?? p.price) * (p.quantity || 0) + ((p.vat || 0) ? Math.round(((p.discountedPrice ?? p.price) * (p.quantity || 0) * (p.vat || 0)) / 100) : 0))), 0);
      const promosToValidate = Array.from(new Map(selectedPromotionOrders.map(p => [p.id, p])).values());
      const invalidPromos = promosToValidate.filter((promo) => {
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

        // Check if any applied promotions are chiết khấu 2
        const hasDiscount2 = promosToInclude.some(promo => promo.chietKhau2 === 191920001);
        const message = hasDiscount2
          ? 'Đã lưu đơn hàng với chiết khấu 2 thành công!'
          : 'Đã lưu đơn hàng với khuyến mãi thành công!';

        showToast.success(message);
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
      const computedOrderTotal = totalAmount || orderSummary?.total || productList.reduce((s, p) => s + (p.totalAmount || ((p.discountedPrice ?? p.price) * (p.quantity || 0) + ((p.vat || 0) ? Math.round(((p.discountedPrice ?? p.price) * (p.quantity || 0) * (p.vat || 0)) / 100) : 0))), 0);
      const currentOrderTotal = (promotionPopupOrderTotal ?? computedOrderTotal);
      const promosToApply = Array.from(new Map(selectedPromotionOrders.map(p => [p.id, p])).values());
      const invalid = promosToApply.filter(p => {
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
      for (const promo of promosToApply) {
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
          // Support both textual values and OptionSet numeric codes:
          //  - "191920000" -> "%"
          //  - "191920001" -> "VNĐ"
          const OPTION_PERCENT = '191920000';
          const OPTION_VND = '191920001';
          const rawVndOrPercent = promo.vndOrPercent ?? '%';
          let normalizedVndOrPercent = typeof rawVndOrPercent === 'string'
            ? rawVndOrPercent.trim()
            : String(rawVndOrPercent).trim();

          // Normalize known numeric option set codes
          if (normalizedVndOrPercent === OPTION_PERCENT) {
            normalizedVndOrPercent = '%';
          } else if (normalizedVndOrPercent === OPTION_VND) {
            normalizedVndOrPercent = 'VNĐ';
          } else {
            // Handle textual forms (case-insensitive). Treat '%' specially, everything else -> 'VNĐ'
            if (normalizedVndOrPercent.toLowerCase() === '%') {
              normalizedVndOrPercent = '%';
            } else {
              // Accept 'vnd' or 'vnđ' (with/without diacritics)
              const up = normalizedVndOrPercent.toUpperCase();
              if (up === 'VND' || up === 'VNĐ') {
                normalizedVndOrPercent = 'VNĐ';
              } else {
                // Fallback: treat unknown as 'VNĐ' to avoid sending empty value
                normalizedVndOrPercent = 'VNĐ';
              }
            }
          }

          const result = await applyPromotionOrder({
            soId: soId,
            promotionId: promo.id,
            promotionName: promo.name,
            promotionValue: promo.value || 0,
            vndOrPercent: normalizedVndOrPercent,
            chietKhau2: String(promo.chietKhau2) === '191920001' || String(promo.chietKhau2).toLowerCase() === 'true', // 191920001 = Yes
            productCodes: promo.productCodes,
            productGroupCodes: promo.productGroupCodes,
            orderTotal: currentOrderTotal, // Pass the UI-calculated order total for validation
          });

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
          // After applying promotion on server, attempt to persist the effective promotion value
          // into detail field `crdfd_chieckhau2` (discount2) so SOD reflects applied CK2 value.
          // Use promo.value (effective value chosen) as the value to save.
          if ((result && result.success) && typeof promo.value === 'number') {
            try {
              // Refresh sale-orders (đã expand SOD) để tránh gọi thêm `sale-order-details`
              const refreshedOrders = await fetchSaleOrders(customerId || undefined, true);
              queryClient.setQueryData(queryKeys.saleOrders(customerId || undefined), refreshedOrders);
              const currentSo = refreshedOrders.find((so) => so.crdfd_sale_orderid === soId);
              const sodDetails: SaleOrderDetail[] =
                (currentSo as any)?.details ??
                (currentSo as any)?.crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O ??
                [];

              if (Array.isArray(sodDetails) && sodDetails.length > 0) {
                const productsToSave = sodDetails
                  .filter((d: any) => {
                    // Update details that were affected by this promotion.
                    // Heuristic: match by promotionId or productCodes/productGroupCodes inclusion.
                    const detailPromoId = (d as any).promotionId ?? (d as any).promotion?.id ?? null;
                    if (detailPromoId && String(detailPromoId) === String(promo.id)) return true;
                    const prodCode = (d as any).productCode ?? '';
                    if (promo.productCodes && String(promo.productCodes).split(',').map(s => s.trim()).includes(String(prodCode))) return true;
                    const pg = (d as any).productGroupCode ?? '';
                    if (promo.productGroupCodes && String(promo.productGroupCodes).split(',').map(s => s.trim()).includes(String(pg))) return true;
                    return false;
                  })
                  .map((d: any, idx: number) => {
                    return {
                      id: d.id,
                      productId: d.productId,
                      productCode: d.productCode,
                      productName: d.productName,
                      productGroupCode: d.productGroupCode,
                      productCategoryLevel4: d.productCategoryLevel4,
                      unitId: d.unitId,
                      unit: d.unit,
                      quantity: d.quantity,
                      price: d.price,
                      priceNoVat: d.priceNoVat ?? null,
                      discountedPrice: d.discountedPrice ?? d.price,
                      originalPrice: d.originalPrice ?? d.price,
                      vat: d.vat,
                      vatAmount: d.vatAmount ?? Math.round(((d.discountedPrice ?? d.price) * d.quantity) * (d.vat || 0) / 100),
                      subtotal: d.subtotal ?? Math.round((d.discountedPrice ?? d.price) * d.quantity),
                      totalAmount: d.totalAmount ?? Math.round((d.subtotal ?? ((d.discountedPrice ?? d.price) * d.quantity)) + (d.vatAmount ?? 0)),
                      stt: d.stt ?? (idx + 1),
                      deliveryDate: d.deliveryDate,
                      note: d.note,
                      urgentOrder: d.urgentOrder,
                      approvePrice: d.approvePrice,
                      approveSupPrice: d.approveSupPrice,
                      approveSupPriceId: d.approveSupPriceId,
                      approver: d.approver,
                      discountPercent: d.discountPercent ?? 0,
                      discountAmount: d.discountAmount ?? 0,
                      discountRate: d.discountRate ?? undefined,
                      promotionText: d.promotionText ?? '',
                      promotionId: d.promotionId ?? null,
                      invoiceSurcharge: d.invoiceSurcharge ?? 0,
                      // Persist discount2 (crdfd_chieckhau2) as numeric percent value
                      discount2: promo.value,
                      discount2Enabled: true,
                      crdfd_chietkhau2: promo.value, // Send to backend as crdfd_chietkhau2
                    } as any;
                  });

                if (productsToSave.length > 0) {
                  // call saveSaleOrderDetails to persist the change
                  try {
                    await saveSaleOrderDetails({
                      soId: soId,
                      warehouseName: warehouse,
                      isVatOrder: !isNonVatSelected,
                      customerLoginId: getItem('id') as string | undefined,
                      customerId: customerId,
                      userInfo: undefined,
                      products: productsToSave,
                    });
                  } catch (err) {
                    console.warn('[Promotion Order] Could not persist discount2 to SOD details:', err);
                  }
                }
              }
            } catch (err) {
              console.warn('[Promotion Order] Error fetching SOD details for persisting discount2:', err);
            }
          }
        } catch (error: any) {
          console.error(`[Promotion Order] Error applying promotion ${promo.name}:`, error);
          const errorMessage = error.message || error.response?.data?.details || `Lỗi khi áp dụng ${promo.name}`;
          results.push({ success: false, message: errorMessage });
        }
      }

      const successCount = results.filter(r => r && r.success === true).length;
      const failedCount = results.filter(r => r && r.success === false).length;

      if (successCount > 0) {
        // Check if any applied promotions are chiết khấu 2
        const hasDiscount2 = promosToApply.some(promo => promo.chietKhau2 === 191920001);
        const message = hasDiscount2
          ? `Đã áp dụng ${successCount}/${promosToApply.length} chiết khấu 2 thành công!`
          : `Đã áp dụng ${successCount}/${promosToApply.length} Promotion Order thành công!`;

        showToast.success(message);
        setShowPromotionOrderPopup(false);
        setSelectedPromotionOrders([]);
        setPromotionOrderList([]);
        setSpecialPromotionList([]);
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
    setSpecialPromotionList([]);
    // Clear entire form when closing promotion popup
    clearEverything();
    setPromotionPopupOrderTotal(null);
  };

  // Handler để update một sản phẩm đơn lẻ (đã sửa)
  const handleUpdateProduct = async (product: ProductTableItem) => {
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

    // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [tên người duyệt]"
    const approverName = APPROVERS_LIST.find((a) => a.id === product.approver)?.name ?? product.approver;
    const formattedNote = product.approvePrice && approverName ? `Duyệt giá bởi ${approverName}` : product.note || '';

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
          priceNoVat: product.priceNoVat ?? null,
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
          promotionId: product.promotionId,
          invoiceSurcharge: product.invoiceSurcharge,
          discount2: product.discount2 ?? 0,
          discount2Enabled: product.discount2Enabled ?? false,
          crdfd_chietkhau2: product.discount2 ?? 0, // Send to backend as crdfd_chietkhau2
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

  // Prefer header total from selected SO to match server-side validation
  const headerTotalSo = selectedSo?.crdfd_tongtien;
  const computedLineTotalSo = productList.reduce((s, p) => s + (p.totalAmount || ((p.discountedPrice ?? p.price) * (p.quantity || 0) + ((p.vat || 0) ? Math.round(((p.discountedPrice ?? p.price) * (p.quantity || 0) * (p.vat || 0)) / 100) : 0))), 0);
  const currentOrderTotal = Number(headerTotalSo ?? totalAmount ?? orderSummary?.total ?? computedLineTotalSo ?? 0);

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
                  Tổng tiền đơn: {(promotionPopupOrderTotal ?? currentOrderTotal) ? `${(promotionPopupOrderTotal ?? currentOrderTotal).toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px' }}>
                  {promotionOrderList.map((promo) => {
                    const isSelected = selectedPromotionOrders.some(p => p.id === promo.id);
                    const conditionNum = (promo && promo.totalAmountCondition !== null && promo.totalAmountCondition !== undefined)
                      ? Number(promo.totalAmountCondition)
                      : null;
                    const effectiveOrderTotalForCheck = (promotionPopupOrderTotal ?? currentOrderTotal);
                    const meetsCondition = conditionNum === null || (!isNaN(conditionNum) && effectiveOrderTotalForCheck >= conditionNum);

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
                          {/* Detailed reasons */}
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
                  {specialPromotionList && specialPromotionList.length > 0 && (() => {
                    // remove any special promos that are already present in promotionOrderList
                    const promotionKeys = new Set((promotionOrderList || []).map(p => normalizePromoKey(p)));
                    const filteredSpecialsRender = (specialPromotionList || []).filter(p => !promotionKeys.has(normalizePromoKey(p)));
                    if (filteredSpecialsRender.length === 0) return null;
                    return (
                      <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff7ed', border: '1px dashed #f59e0b' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>Khuyến mãi đặc biệt</div>
                        {filteredSpecialsRender.map((promo) => {
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
                    );
                  })()}
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
              className="admin-app-header-btn admin-app-header-btn-secondary"
              onClick={async () => {
                try {
                  if (!soId || !customerCode) {
                    showToast.warning('Vui lòng chọn khách hàng và lưu SO trước khi tải chiết khấu 2.');
                    return;
                  }
                  const orderTotal = orderSummary.total;
                  const productCodes = productList.map(p => p.productCode).filter(Boolean) as string[];
                  const productGroupCodes = productList.map(p => p.productGroupCode).filter(Boolean) as string[];
                  const res = await fetchPromotionOrders(soId, customerCode, orderTotal, productCodes, productGroupCodes, selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan);

                  console.log('🔍 Chiết khấu 2 - Raw API response:', res);

                  // Get available promotions from API (already filtered)
                  // Try availablePromotions first, fallback to allPromotions if needed
                  let availablePromotions: PromotionOrderItem[] = res.availablePromotions || res.allPromotions || [];

                  // If availablePromotions is empty but allPromotions has data, filter it
                  if (availablePromotions.length === 0 && res.allPromotions && res.allPromotions.length > 0) {
                    availablePromotions = res.allPromotions.filter(p => {
                      const cond = Number(p.totalAmountCondition || 0);
                      const meetsTotal = isNaN(cond) || cond === 0 || Number(orderTotal) >= cond;
                      const isApplicable = (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true');
                      return isApplicable && meetsTotal;
                    });
                  }

                  console.log('🔍 Chiết khấu 2 - Available promotions array:', availablePromotions);

                  // Filter chiết khấu 2 by vnd code = 191920000 (crdfd_vn)
                  let discount2Promotions = (availablePromotions || []).filter((p: PromotionOrderItem) =>
                    vndCodeEquals(p, 191920000)
                  );
                  discount2Promotions = uniquePromotions(discount2Promotions);

                  console.log('🔍 Chiết khấu 2 debug:', {
                    soId,
                    customerCode,
                    orderTotal,
                    availablePromotionsCount: availablePromotions.length,
                    discount2PromotionsCount: discount2Promotions.length,
                    discount2Promotions: discount2Promotions.map(p => ({ name: p.name, chietKhau2: p.chietKhau2, applicable: p.applicable }))
                  });

                  if (!availablePromotions || availablePromotions.length === 0) {
                    showToast.info('Không tìm thấy chương trình khuyến mãi khả dụng.');
                    return;
                  }

                  // Show only chiết khấu 2 promotions in popup (no duplicates)
                  setPromotionOrderList(discount2Promotions);
                  setSpecialPromotionList([]);
                  // Pre-select chiết khấu 2 promotions
                  setSelectedPromotionOrders(discount2Promotions);
                  setSoId(soId);
                  setShowPromotionOrderPopup(true);
                } catch (err: any) {
                  console.error('Error loading chiết khấu 2:', err);
                  showToast.error('Lỗi khi tải chiết khấu 2.');
                }
              }}
              title={`Chiết khấu 2 ${!customerId || !soId ? '(Cần chọn KH & SO)' : ''}`}
              disabled={!customerId || !soId}
            >
              💰 Chiết khấu 2
            </button>
            <button
              className="admin-app-header-btn admin-app-header-btn-secondary"
              onClick={async () => {
                try {
                  if (!soId || !customerCode) {
                    showToast.warning('Vui lòng chọn khách hàng và lưu SO trước khi tải khuyến mãi đặc biệt.');
                    return;
                  }
                  const orderTotal = orderSummary.total;
                  const productCodes = productList.map(p => p.productCode).filter(Boolean) as string[];
                  const productGroupCodes = productList.map(p => p.productGroupCode).filter(Boolean) as string[];
                  const res = await fetchPromotionOrders(soId, customerCode, orderTotal, productCodes, productGroupCodes, selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan);
                  // Show only special promotions where crdfd_vn = 191920001
                  let specials = Array.isArray(res.specialPromotions) && res.specialPromotions.length > 0
                    ? res.specialPromotions
                    : (res.allPromotions || []);
                  specials = (specials || []).filter((p: PromotionOrderItem) =>
                    vndCodeEquals(p, 191920001) && ((p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'))
                  );
                  specials = uniquePromotions(specials);

                  if (!specials || specials.length === 0) {
                    showToast.info('Không tìm thấy khuyến mãi đặc biệt.');
                    return;
                  }
                  // Avoid duplicates: ensure specials are not already in promotionOrderList
                  setPromotionOrderList(specials);
                  setSpecialPromotionList([]);
                  setSelectedPromotionOrders([]);
                  setSoId(soId);
                  setShowPromotionOrderPopup(true);
                } catch (err: any) {
                  console.error('Error loading special promotions:', err);
                  showToast.error('Lỗi khi tải khuyến mãi đặc biệt.');
                }
              }}
              title="Khuyến mãi đặc biệt"
              disabled={!customerId || !soId}
            >
              Khuyến mãi đặc biệt
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
      {/* Floating buttons when header is hidden */}
      {hideHeader && customerId && soId && (
        <>
          <button
            onClick={async () => {
              try {
                const orderTotal = orderSummary.total;
                const productCodes = productList.map(p => p.productCode).filter(Boolean) as string[];
                const productGroupCodes = productList.map(p => p.productGroupCode).filter(Boolean) as string[];
                const res = await fetchPromotionOrders(soId, customerCode, orderTotal, productCodes, productGroupCodes, selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan);

                // Prefer server-filtered availablePromotions, fallback to allPromotions and filter locally
                let availablePromotions: PromotionOrderItem[] = res.availablePromotions || res.allPromotions || [];
                if (availablePromotions.length === 0 && res.allPromotions && res.allPromotions.length > 0) {
                  availablePromotions = res.allPromotions.filter((p: PromotionOrderItem) => {
                    const cond = Number(p.totalAmountCondition || 0);
                    const meetsTotal = isNaN(cond) || cond === 0 || Number(orderTotal) >= cond;
                    const isApplicable = (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true');
                    return isApplicable && meetsTotal;
                  });
                }

                // Filter chiết khấu 2 by vnd code = 191920000 (crdfd_vn)
                let discount2Promotions = (availablePromotions || []).filter((p: PromotionOrderItem) =>
                  vndCodeEquals(p, 191920000) && ((p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'))
                );
                discount2Promotions = uniquePromotions(discount2Promotions);

                if (!discount2Promotions || discount2Promotions.length === 0) {
                  showToast.info('Không tìm thấy chiết khấu 2 khả dụng.');
                  return;
                }
                setPromotionOrderList(discount2Promotions);
                setSpecialPromotionList([]);
                setSelectedPromotionOrders([]);
                setSoId(soId);
                setShowPromotionOrderPopup(true);
              } catch (err: any) {
                console.error('Error loading chiết khấu 2 (floating):', err);
                showToast.error('Lỗi khi tải chiết khấu 2.');
              }
            }}
            title="Chiết khấu 2"
            style={{
              position: 'fixed',
              right: 70,
              top: 14,
              zIndex: 60,
              padding: '8px 12px',
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              cursor: 'pointer'
            }}
          >
            💰
          </button>
          <button
            onClick={async () => {
              try {
                const orderTotal = orderSummary.total;
                const productCodes = productList.map(p => p.productCode).filter(Boolean) as string[];
                const productGroupCodes = productList.map(p => p.productGroupCode).filter(Boolean) as string[];
                const res = await fetchPromotionOrders(soId, customerCode, orderTotal, productCodes, productGroupCodes, selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan);
                let specials = Array.isArray(res.specialPromotions) && res.specialPromotions.length > 0
                  ? res.specialPromotions
                  : (res.allPromotions || []);
                specials = (specials || []).filter((p: PromotionOrderItem) =>
                  vndCodeEquals(p, 191920001) && ((p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'))
                );
                specials = uniquePromotions(specials);
                if (!specials || specials.length === 0) {
                  showToast.info('Không tìm thấy khuyến mãi đặc biệt.');
                  return;
                }
                setPromotionOrderList(specials);
                setSpecialPromotionList([]);
                setSelectedPromotionOrders([]);
                setSoId(soId);
                setShowPromotionOrderPopup(true);
              } catch (err: any) {
                console.error('Error loading special promotions (floating):', err);
                showToast.error('Lỗi khi tải khuyến mãi đặc biệt.');
              }
            }}
            title="Khuyến mãi đặc biệt"
            style={{
              position: 'fixed',
              right: 120,
              top: 14,
              zIndex: 60,
              padding: '8px 12px',
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              cursor: 'pointer'
            }}
          >
            🎁
          </button>
        </>
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
                    setCustomerId(value);
                    setCustomer(option?.label || '');
                    setCustomerCode(option?.cr44a_makhachhang || option?.cr44a_st || '');
                    setCustomerIndustry(option?.crdfd_nganhnghe ?? null);
                    const districtKey = option?.crdfd_keyquanhuyen || '';
                    setCustomerDistrictKey(districtKey);
                    // Capture region text (e.g. "Miền Nam", "Miền Trung") from customer option
                    setCustomerRegion(option?.cr1bb_vungmien_text || option?.cr1bb_vungmien || '');
                    // Capture wecare rewards
                    setCustomerWecareRewards((option as any)?.crdfd_wecare_rewards || null);
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
                    setPromotionId('');
                    // Keep note - không clear ghi chú khi đổi khách hàng
                  }}
                  placeholder="Chọn khách hàng"
                  loading={customersLoading}
                  searchable
                  onSearch={setCustomerSearch}
                />
              </div>

              {/* Wecare rewards badge (display under customer dropdown) */}
              <div className="admin-app-field-compact" style={{ marginTop: 6 }}>
                {customerWecareRewards ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Wecare Rewards:</span>
                    <span className="admin-app-badge" title={`Wecare Rewards: ${customerWecareRewards}`} style={{ background: 'rgba(99,102,241,0.08)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.18)' }}>
                      {customerWecareRewards}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Không có thông tin rewards</div>
                )}
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
                    setSoReloadSeq((v) => v + 1);
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
            customerRegion={customerRegion}
            customerWecareRewards={customerWecareRewards}
            vatText={selectedVatText}
            paymentTerms={selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan}
            orderType={selectedSo?.crdfd_loai_don_hang}
            soId={soId}
            soCreatedOn={selectedSo?.createdon}
            orderTotal={orderSummary.total}
            currentProducts={productList.map(p => ({
              productCode: p.productCode,
              productGroupCode: p.productGroupCode,
              price: p.price,
              quantity: p.quantity || 0,
              vat: p.vat || 0,
            }))}
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
            promotionId={promotionId}
            setPromotionText={setPromotionText}
            setPromotionId={setPromotionId}
            onAdd={handleAddProduct}
            onSave={handleSave}
            onRefresh={handleRefresh}
            onInventoryReserved={() => { }} // Callback để trigger reload inventory
            onProductGroupCodeChange={setProductGroupCode} // Callback để cập nhật productGroupCode
            onOpenDiscount2={async (orderTotalOverride?: number) => {
              try {
                // Allow child to pass an override including the current line (unsaved) product total
                const orderTotal = (typeof orderTotalOverride === 'number') ? orderTotalOverride : orderSummary.total;
                // Save override so modal shows correct "Tổng tiền đơn"
                setPromotionPopupOrderTotal(orderTotal);
                const productCodes = productList.map(p => p.productCode).filter(Boolean) as string[];
                const productGroupCodes = productList.map(p => p.productGroupCode).filter(Boolean) as string[];

                // Fetch promotions even if soId/customerCode are not present; backend will filter accordingly
                const res = await fetchPromotionOrders(
                  soId || undefined,
                  customerCode || undefined,
                  orderTotal,
                  productCodes,
                  productGroupCodes,
                  selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
                );

                // Prefer server-filtered availablePromotions, fallback to allPromotions and filter locally
                let availablePromotions: PromotionOrderItem[] = res.availablePromotions || res.allPromotions || [];
                if (availablePromotions.length === 0 && res.allPromotions && res.allPromotions.length > 0) {
                  availablePromotions = res.allPromotions.filter((p: PromotionOrderItem) => {
                    const cond = Number(p.totalAmountCondition || 0);
                    const meetsTotal = isNaN(cond) || cond === 0 || Number(orderTotal) >= cond;
                    const isApplicable = (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true');
                    return isApplicable && meetsTotal;
                  });
                }

                // Filter for chiết khấu 2 promotions (support both numeric code and boolean)
                const discount2Promotions = (availablePromotions || []).filter((p: PromotionOrderItem) =>
                  (p.chietKhau2 === 191920001 || String(p.chietKhau2).toLowerCase() === 'true')
                  && ((p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'))
                );

                if (!discount2Promotions || discount2Promotions.length === 0) {
                  showToast.info('Không tìm thấy chiết khấu 2 khả dụng.');
                  return;
                }
                setSpecialPromotionList(discount2Promotions);
                setPromotionOrderList(discount2Promotions);
                setSelectedPromotionOrders([]);
                if (soId) setSoId(soId);
                setShowPromotionOrderPopup(true);
              } catch (err: any) {
                console.error('Error loading chiết khấu 2 from child:', err);
                showToast.error('Lỗi khi tải chiết khấu 2.');
              }
            }}
            onOpenSpecialPromotions={async () => {
              try {
                if (!soId || !customerCode) {
                  showToast.warning('Vui lòng chọn khách hàng và lưu SO trước khi tải khuyến mãi đặc biệt.');
                  return;
                }

                // Use the dedicated special promotions API
                const res = await fetchSpecialPromotionOrders(
                  soId,
                  customerCode,
                  selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
                );

                if (!res.specialPromotions || res.specialPromotions.length === 0) {
                  showToast.info('Không tìm thấy khuyến mãi đặc biệt cho khách hàng này.');
                  return;
                }

                setSpecialPromotionList(res.specialPromotions as PromotionOrderItem[]);
                setPromotionOrderList(res.specialPromotions as PromotionOrderItem[]);
                setSelectedPromotionOrders([]);
                setSoId(soId);
                setShowPromotionOrderPopup(true);
              } catch (err: any) {
                console.error('Error loading special promotions from child:', err);
                showToast.error('Lỗi khi tải khuyến mãi đặc biệt.');
              }
            }}
            onPriceNoVatChange={setPriceNoVat}
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
          customerCode={customerCode}
          paymentTerms={selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan}
          saleOrders={saleOrders}
          onReloadAfterDeactivate={async () => {
            if (!soId) return;
            setIsLoadingDetails(true);
            try {
              // Refetch sale-orders (đã expand SOD) để đồng bộ cả header + details từ backend,
              // thay vì gọi riêng sale-order-details.
              const refreshedOrders = await fetchSaleOrders(customerId || undefined, true);
              queryClient.setQueryData(queryKeys.saleOrders(customerId || undefined), refreshedOrders);
              const currentSoRefreshed = refreshedOrders.find(so => so.crdfd_sale_orderid === soId);
              const expandedDetailsRefreshed =
                (currentSoRefreshed as any)?.crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O ??
                (currentSoRefreshed as any)?.details;
              const details: SaleOrderDetail[] = Array.isArray(expandedDetailsRefreshed)
                ? expandedDetailsRefreshed
                : [];

              const mappedProducts: ProductTableItem[] = details.map((detail: SaleOrderDetail) => {
                const subtotal = (detail.discountedPrice || detail.price) * detail.quantity;
                const vatAmount = (subtotal * detail.vat) / 100;
                return {
                  id: detail.id,
                  stt: detail.stt,
                  productCode: detail.productCode,
                  productId: detail.productId,
                  productGroupCode: detail.productGroupCode,
                  productName: detail.productName,
                  discount2: (() => {
                    const raw =
                      (detail as any).crdfd_chieckhau2 ??
                      (detail as any).crdfd_chietkhau2 ??
                      (detail as any).chietKhau2 ??
                      (detail as any).discount2 ??
                      0;
                    const num = Number(raw) || 0;
                    if (num > 0 && num < 0.05) return Math.round(num * 1000) / 10;
                    if (num > 0 && num <= 1) return Math.round(num * 100) / 100;
                    return Math.round(num * 10) / 10;
                  })(),
                  discount2Enabled: Boolean(
                    (detail as any).crdfd_chieckhau2 ??
                      (detail as any).crdfd_chietkhau2 ??
                      (detail as any).chietKhau2 ??
                      (detail as any).discount2
                  ),
                  unit: detail.unit,
                  quantity: detail.quantity,
                  price: detail.price,
                  priceNoVat: null,
                  surcharge: detail.surcharge,
                  discount: detail.discount,
                  discountedPrice: detail.discountedPrice,
                  vat: detail.vat,
                  subtotal,
                  vatAmount,
                  totalAmount: detail.totalAmount ?? (subtotal + vatAmount),
                  approver: detail.approver,
                  deliveryDate: detail.deliveryDate || '',
                  warehouse: warehouse,
                  note: detail.note,
                  approvePrice: detail.approvePrice,
                  approveSupPrice: detail.approveSupPrice,
                  discountPercent: detail.discountPercent,
                  discountAmount: detail.discountAmount,
                  discountRate: detail.discountRate,
                  promotionText: detail.promotionText,
                  promotionId: detail.promotionId,
                  eligibleForPromotion:
                    (detail.discountPercent ?? 0) > 0 || (detail.discountAmount ?? 0) > 0 || Boolean(detail.promotionId),
                  invoiceSurcharge: detail.invoiceSurcharge,
                  isSodCreated: true,
                  isModified: false,
                  originalQuantity: detail.quantity,
                };
              });
              mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
              setProductList(mappedProducts);
            } catch (err) {
              console.warn('[SalesOrderForm] Reload SOD details after deactivate failed:', err);
            } finally {
              setIsLoadingDetails(false);
            }
          }}
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

