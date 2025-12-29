'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrderBaoGia } from '../_hooks/useDropdownData';
import { saveSOBGDetails, fetchSOBGDetails, SaleOrderDetail, fetchPromotionOrders, applyPromotionOrder, PromotionOrderItem } from '../_api/adminApi';
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
  const [productList, setProductList] = useState<ProductItem[]>([]);

  // Promotion Order Popup state
  const [showPromotionOrderPopup, setShowPromotionOrderPopup] = useState(false);
  const [promotionOrderList, setPromotionOrderList] = useState<PromotionOrderItem[]>([]);
  const [selectedPromotionOrders, setSelectedPromotionOrders] = useState<PromotionOrderItem[]>([]);
  const [isApplyingPromotion, setIsApplyingPromotion] = useState(false);

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

  const selectedSo = soBaoGiaList.find((so) => so.id === soId);
  const selectedVatText = getVatLabelText(selectedSo);
  const isNonVatSelected = (selectedVatText || '').toLowerCase().includes('không');

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
        console.log('Loading SOBG details:', { soId, customerId });
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
            invoiceSurcharge: detail.invoiceSurcharge || 0,
            // Map chiết khấu 2 (stored as decimal or percent)
            discount2: (() => {
              const raw = (detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2 ?? 0;
              const num = Number(raw) || 0;
              if (num > 0 && num <= 1) return Math.round(num * 100);
              return num;
            })(),
            discount2Enabled: Boolean((detail as any).crdfd_chietkhau2 ?? (detail as any).chietKhau2 ?? (detail as any).discount2),
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

    // Trigger promotion popup if this is the first product or total amount qualifies
    if (customerId && orderSummary.total > 0 && !showPromotionOrderPopup) {
      setTimeout(() => autoSelectPromotions(), 500); // Small delay to allow UI update
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
          discount2: item.discount2 ?? 0,
          discount2Enabled: item.discount2Enabled ?? false,
          invoiceSurcharge: item.invoiceSurcharge,
        };
      });

      const userInfo = getStoredUser();

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

      // Clear form fields after successful save (giữ lại SOBG và customer) - giống SO
      // If all saved successfully (no partial), clear entire form (like SalesOrderForm behavior)
      if (!result.partialSuccess && (!result.totalFailed || result.totalFailed === 0)) {
        clearEverything();
      } else {
        // Partial success -> clear only product input fields (keep SOBG/customer)
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
      }
      // Nếu tất cả sản phẩm đã lưu thành công (không partial) => đã clear form (clearEverything)
      // Nếu partial success, chỉ cập nhật các sản phẩm đã được lưu theo response.savedDetails nếu có
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
      console.log('[Auto-select Promotion SOBG] Checking promotions for total amount:', orderSummary.total);

      // Fetch available promotions for current order
      const promotionOrderResult = await fetchPromotionOrders(
        customerId,
        orderSummary.total,
        orderSummary.subtotal,
        orderSummary.vat
      );

      if (promotionOrderResult.availablePromotions && promotionOrderResult.availablePromotions.length > 0) {
        // Auto-select promotions where totalAmount >= totalAmountCondition
        const autoSelectedPromotions = promotionOrderResult.availablePromotions.filter((promo: PromotionOrderItem) => {
          const totalAmountCondition = promo.totalAmountCondition || 0;
          return orderSummary.total >= totalAmountCondition;
        });

        if (autoSelectedPromotions.length > 0) {
          console.log('[Auto-select Promotion SOBG] Auto-selecting promotions based on total amount:', {
            orderTotal: orderSummary.total,
            autoSelectedCount: autoSelectedPromotions.length,
            autoSelectedNames: autoSelectedPromotions.map(p => p.name)
          });

          setPromotionOrderList(promotionOrderResult.availablePromotions);
          setSelectedPromotionOrders(autoSelectedPromotions);
          setShowPromotionOrderPopup(true);
        } else {
          console.log('[Auto-select Promotion SOBG] No promotions auto-selected, but available promotions exist');
          setPromotionOrderList(promotionOrderResult.availablePromotions);
          setSelectedPromotionOrders([]);
          setShowPromotionOrderPopup(true);
        }
      } else {
        console.log('[Auto-select Promotion SOBG] No available promotions for current order');
      }
    } catch (error: any) {
      console.error('[Auto-select Promotion SOBG] Error:', error);
      // Silently fail auto-selection - don't block user flow
    }
  };

  // Áp dụng Promotion Order
  const handleApplyPromotionOrder = async () => {
    if (selectedPromotionOrders.length === 0) {
      showToast.error('Vui lòng chọn ít nhất một Promotion Order');
      return;
    }

    if (!customerId || !soId) {
      showToast.error('Thiếu thông tin khách hàng hoặc SOBG');
      return;
    }

    setIsApplyingPromotion(true);
    try {
      console.log('[Apply Promotion SOBG] Applying promotions:', selectedPromotionOrders.map(p => p.name));

      const result = await applyPromotionOrder({
        customerId,
        sobgId: soId,
        promotionOrderIds: selectedPromotionOrders.map(p => p.id),
        totalAmount: orderSummary.total,
        subtotalAmount: orderSummary.subtotal,
        vatAmount: orderSummary.vat,
      });

      if (result.success) {
        showToast.success(`Đã áp dụng ${selectedPromotionOrders.length} promotion(s) thành công!`);

        // Update promotion text
        const promotionNames = selectedPromotionOrders.map(p => p.name).join(', ');
        setPromotionText(`Promotion: ${promotionNames}`);

        // Close popup
        setShowPromotionOrderPopup(false);
        setSelectedPromotionOrders([]);
        setPromotionOrderList([]);

        // Refresh product list to see promotion discounts
        await handleRefreshSOBGDetails();
      } else {
        showToast.error(result.message || 'Không thể áp dụng Promotion Order');
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
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px' }}>
                  {promotionOrderList.map((promo) => {
                    const isSelected = selectedPromotionOrders.some(p => p.id === promo.id);
                    return (
                      <label
                        key={promo.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
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
            setPromotionText={setPromotionText}
            onAdd={handleAddProduct}
            onSave={handleSave} // Sử dụng handleSave của SOBG
            onRefresh={handleRefresh}
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
