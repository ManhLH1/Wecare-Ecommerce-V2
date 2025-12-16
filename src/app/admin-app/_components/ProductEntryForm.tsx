'use client';

import { useState, useEffect, useMemo } from 'react';
import Dropdown from './Dropdown';
import { useProducts, useUnits, useWarehouses } from '../_hooks/useDropdownData';
import {
  fetchProductPrice,
  fetchProductPromotions,
  fetchInventory,
  Promotion,
  Product,
} from '../_api/adminApi';

// Map option set value of crdfd_gtgt/crdfd_gtgtnew to VAT percentage
const VAT_OPTION_MAP: Record<number, number> = {
  191920000: 0,  // 0%
  191920001: 5,  // 5%
  191920002: 8,  // 8%
  191920003: 10, // 10%
};

interface ProductEntryFormProps {
  product: string;
  setProduct: (value: string) => void;
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
  onAdd: () => void;
  onSave: () => void;
  onRefresh: () => void;
}

export default function ProductEntryForm({
  product,
  setProduct,
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
  onAdd,
  onSave,
  onRefresh,
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
  const [inventoryMessage, setInventoryMessage] = useState<string>('SL theo kho (tồn lý thuyết): 0');
  const [inventoryColor, setInventoryColor] = useState<string | undefined>(undefined);
  
  // Calculate buttons disabled state based on PowerApps canvas logic
  const buttonsDisabled = useMemo(() => {
    // If form is disabled (no customer or SO), disable buttons
    if (isFormDisabled) return true;
    
    // Condition 1: If product group code is in allowed list OR customer is "Kho Wecare" → Enable
    const allowedProductGroupCodes = [
      'NSP-00027',
      'NSP-000872',
      'NSP-000409',
      'NSP-000474',
      'NSP-000873'
    ];
    const productGroupCode = selectedProduct?.crdfd_manhomsp || '';
    const customerNameLower = (customerName || '').toLowerCase();
    
    if (allowedProductGroupCodes.includes(productGroupCode) ||
        customerNameLower === 'kho wecare' ||
        customerNameLower === 'kho wecare (hồ chí minh)') {
      return false; // Enable
    }
    
    // Condition 2: If Order Type = "Đơn hàng khuyến mãi" → Enable
    // Note: Need to determine OptionSet value for "Đơn hàng khuyến mãi"
    // For now, we'll skip this check as we don't know the exact value
    
    // Condition 3: Check disable conditions
    // 3a: var_warning_gia.value - skip for now (complex logic)
    
    // 3b: Đơn hàng Không VAT && Tên kho = Tên kho trong tồn kho && (Tồn kho <= 0 hoặc rỗng || Số lượng theo kho > Tồn kho)
    // Skip for now - need inventory data from Inventory Weshops
    
    // Determine VAT order flags
    const vatTextLower = (vatText || '').toLowerCase();
    const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;
    const isNonVatOrder = vatTextLower.includes('không vat') || vatPercent === 0;
    
    // 3c: Đơn hàng Có VAT && GTGT của sản phẩm = 0% → disable
    if (isVatOrder) {
      const vatOptionValue = selectedProduct?.crdfd_gtgt_option ?? selectedProduct?.crdfd_gtgt;
      const productVatPercent = vatOptionValue !== undefined ? VAT_OPTION_MAP[Number(vatOptionValue)] : undefined;
      if (productVatPercent === 0 || productVatPercent === undefined) {
        return true;
      }
    }
    
    // 3d: Đơn hàng Không VAT && GTGT > 0% && Tồn kho < Số lượng * Giá trị chuyển đổi
    // Skip for now - need inventory data
    
    // 3e: Tên kho trống && VAT = "Không VAT" && Đã chọn sản phẩm
    if (isNonVatOrder && !warehouse && selectedProduct) {
      return true;
    }
    
    // Default: Enable
    return false;
  }, [isFormDisabled, selectedProduct, customerName, vatText, vatPercent, warehouse]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>('');
  const [priceGroupText, setPriceGroupText] = useState<string>('');
  const [priceEntryMethod, setPriceEntryMethod] = useState<'Nhập thủ công' | 'Theo chiết khấu'>('Nhập thủ công');
  const [discountRate, setDiscountRate] = useState<string>('1');
  const [approver, setApprover] = useState<string>('');
  const [basePriceForDiscount, setBasePriceForDiscount] = useState<number>(0);

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

  const normalizePriceInput = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Remove thousand separators to keep numeric parsing consistent
    return str.replace(/,/g, '').trim();
  };

  // Fetch data for dropdowns
  const { products, loading: productsLoading } = useProducts(productSearch);
  const { units, loading: unitsLoading } = useUnits(selectedProductCode);
  const { warehouses, loading: warehousesLoading } = useWarehouses(customerId);

  // Load inventory (Var_ton_kho_lythuyet_inventory) when product code & warehouse change
  useEffect(() => {
    const loadInventory = async () => {
      if (!selectedProductCode || !warehouse) {
        setInventoryTheoretical(0);
        setStockQuantity(0);
        setInventoryMessage('SL theo kho (tồn lý thuyết): 0');
        setInventoryColor(undefined);
        return;
      }

      try {
        setInventoryLoading(true);
        // Determine VAT order: nếu vatText chứa "Có VAT" hoặc vatPercent > 0 => VAT
        const vatTextLower = (vatText || '').toLowerCase();
        const isVatOrder = vatTextLower.includes('có vat') || vatPercent > 0;

        const result = await fetchInventory(selectedProductCode, warehouse, isVatOrder);
        if (!result) {
          setInventoryTheoretical(0);
          setStockQuantity(0);
          setInventoryMessage('Inventory không có sản phẩm này');
          setInventoryColor('red');
          return;
        }

        const theoretical = result.theoreticalStock ?? 0;
        setInventoryTheoretical(theoretical);
        setStockQuantity(theoretical);

        const labelPrefix = isVatOrder ? 'Tồn kho (bỏ mua):' : 'Tồn kho (inventory):';
        setInventoryMessage(`${labelPrefix} ${theoretical.toLocaleString('vi-VN')}`);
        setInventoryColor(theoretical <= 0 ? 'red' : undefined);
      } catch (e) {
        console.error('Failed to load inventory info', e);
        setInventoryTheoretical(0);
        setStockQuantity(0);
        setInventoryMessage('Inventory không có sản phẩm này');
        setInventoryColor('red');
      } finally {
        setInventoryLoading(false);
      }
    };

    loadInventory();
  }, [selectedProductCode, warehouse, vatText, vatPercent, setStockQuantity]);

  // Sync product and unit with parent state
  useEffect(() => {
    if (product && !productId) {
      // If product is set from parent but productId is not, try to find it
      const found = products.find((p) => p.crdfd_name === product);
      if (found) {
        setProductId(found.crdfd_productsid);
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

    if (unit && unitIdIsEmpty) {
      // If unit is set from parent but unitId is not, try to find it; otherwise fallback to first
      const found = units.find((u) => u.crdfd_name === unit);
      if (found) {
        setUnitId(found.crdfd_unitsid);
      } else if (units.length > 0) {
        setUnitId(units[0].crdfd_unitsid);
        setUnit(units[0].crdfd_name);
      }
      return;
    }

    if (!unit && unitIdIsEmpty && units.length > 0) {
      // Auto-select first unit when available
      setUnitId(units[0].crdfd_unitsid);
      setUnit(units[0].crdfd_name);
      return;
    }

    if (!unitIdIsEmpty && !currentUnitExists && units.length > 0) {
      // If current unitId is no longer in list (e.g., after product change), fallback to first
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
  useEffect(() => {
    const loadPrice = async () => {
      if (!selectedProductCode) return;
      setPriceLoading(true);
      const result = await fetchProductPrice(selectedProductCode, customerCode, unitId);

      // Determine which price field to use based on "Bản chất giá phát ra" from selected product
      const selectedProduct = products.find((p) => p.crdfd_masanpham === selectedProductCode);
      const priceNature = selectedProduct?.cr1bb_banchatgiaphatra; // OptionSet value
      const isVatOrder = vatPercent > 0; // analogous to var_selected_VAT_SO = Có VAT

      let basePrice: number | null = null;
      const priceWithVat = result?.price;       // crdfd_gia
      const priceNoVat = (result as any)?.priceNoVat; // cr1bb_giakhongvat

      switch (priceNature) {
        // Giá đã bao gồm VAT (OptionSet 283640000)
        case 283640000:
          basePrice = isVatOrder ? priceNoVat ?? priceWithVat : priceWithVat ?? priceNoVat;
          break;
        // Giá chưa bao gồm VAT (OptionSet 283640001)
        case 283640001:
          basePrice = priceNoVat ?? priceWithVat;
          break;
        // Giá đã bao gồm VAT (VAT hỗ trợ) (OptionSet 283640002)
        case 283640002:
          basePrice = isVatOrder ? priceNoVat ?? priceWithVat : priceWithVat ?? priceNoVat;
          break;
        default:
          // Mặc định dùng Giá (with VAT) nếu có, else non-VAT
          basePrice = priceWithVat ?? priceNoVat;
          break;
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
      if (priceStr !== '') {
        // Lưu basePrice để tính chiết khấu
        setBasePriceForDiscount(roundedBase ?? 0);
        // Chỉ set giá nếu không đang dùng "Theo chiết khấu"
        if (priceEntryMethod === 'Nhập thủ công' || !approvePrice) {
          handlePriceChange(priceStr);
        }
      }
      setPriceGroupText(
        result?.priceGroupText ||
        result?.priceGroupName ||
        result?.priceGroup ||
        ''
      );
      setPriceLoading(false);
    };

    loadPrice();
  }, [selectedProductCode, customerCode, unitId]);

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
        setPromotions(data);
        // Auto-select the first promotion returned (PowerApps First(ListPromotion))
        const firstId = normalizePromotionId(data[0]?.id);
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
  }, [selectedProductCode, customerCode]);

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

  // Tính giá theo chiết khấu khi chọn "Theo chiết khấu"
  useEffect(() => {
    if (approvePrice && priceEntryMethod === 'Theo chiết khấu' && basePriceForDiscount > 0) {
      const discountPercent = parseFloat(discountRate) || 0;
      const discountedPrice = basePriceForDiscount - (basePriceForDiscount * discountPercent / 100);
      const roundedPrice = Math.round(discountedPrice);
      handlePriceChange(String(roundedPrice));
    }
  }, [approvePrice, priceEntryMethod, discountRate, basePriceForDiscount]);

  // Calculate subtotal when quantity or price changes
  const handleQuantityChange = (value: number) => {
    setQuantity(value);
    const priceNum = parseFloat(price) || 0;
    const newSubtotal = value * priceNum;
    setSubtotal(newSubtotal);
    const newVat = (newSubtotal * vatPercent) / 100;
    setVatAmount(newVat);
    setTotalAmount(newSubtotal + newVat);
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    const priceNum = parseFloat(value) || 0;
    const newSubtotal = quantity * priceNum;
    setSubtotal(newSubtotal);
    const newVat = (newSubtotal * vatPercent) / 100;
    setVatAmount(newVat);
    setTotalAmount(newSubtotal + newVat);
  };

  const handleVatChange = (value: number) => {
    setVatPercent(value);
    const newVat = (subtotal * value) / 100;
    setVatAmount(newVat);
    setTotalAmount(subtotal + newVat);
  };

  const productLabel = vatPercent === 0 ? 'Sản phẩm không VAT' : 'Sản phẩm có VAT';

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

  return (
    <div className="admin-app-section">
      <h3 className="admin-app-section-title">Thông tin sản phẩm</h3>
      {/* Product Entry Rows */}
      <div className="admin-app-form-row">
        <div className="admin-app-field-group">
          <label className="admin-app-label">{productLabel}</label>
          <Dropdown
            options={products.map((p) => ({
              value: p.crdfd_productsid,
              label: p.crdfd_name || p.crdfd_fullname || '',
              ...p,
            }))}
            value={productId}
            onChange={(value, option) => {
              setProductId(value);
              setProduct(option?.label || '');
              // Get product code from selected product
              const selectedProductData = products.find((p) => p.crdfd_productsid === value);
              setSelectedProduct(selectedProductData || null);
              setSelectedProductCode(selectedProductData?.crdfd_masanpham);
              // Apply VAT percent based on crdfd_gtgt option set
              const vatOptionValue = (option?.crdfd_gtgt_option ?? option?.crdfd_gtgt) as number | undefined;
              const vatFromOption = vatOptionValue !== undefined ? VAT_OPTION_MAP[Number(vatOptionValue)] : undefined;
              if (vatFromOption !== undefined) {
                handleVatChange(vatFromOption);
              }
              // Reset unit when product changes
              setUnitId('');
              setUnit('');
            }}
            placeholder={isFormDisabled ? "Chọn khách hàng và SO trước" : "Chọn sản phẩm"}
            loading={productsLoading}
            searchable
            onSearch={setProductSearch}
            className="admin-app-input-wide"
            disabled={isFormDisabled}
          />
          <div
            className="admin-app-hint"
            style={{ marginTop: 4, color: inventoryColor }}
          >
            {inventoryLoading ? 'Đang tải tồn kho...' : inventoryMessage}
          </div>
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Vị trí kho</label>
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
            placeholder={isFormDisabled ? "Chọn khách hàng và SO trước" : "Chọn vị trí kho"}
            loading={warehousesLoading}
            disabled={isFormDisabled}
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Đơn vị</label>
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
            }}
            placeholder={isFormDisabled ? "Chọn khách hàng và SO trước" : "Chọn đơn vị"}
            loading={unitsLoading}
            disabled={isFormDisabled}
          />
        </div>
      </div>

      <div className="admin-app-form-row">
        <div className="admin-app-field-group">
          <label className="admin-app-label">Số lượng</label>
          <div className="admin-app-input-wrapper">
            <input
              type="number"
              className="admin-app-input"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
              placeholder="0"
              disabled={isFormDisabled}
            />
            <span className="admin-app-dropdown-arrow">▼</span>
          </div>
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">
            Giá {priceGroupText ? `- ${priceGroupText}` : ''}
          </label>
          <div className="admin-app-input-wrapper">
            <input
              type="text"
              className="admin-app-input"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder={priceLoading ? "Đang tải giá..." : isFormDisabled ? "Chọn khách hàng và SO trước" : "Giá"}
              readOnly={priceLoading || (approvePrice && priceEntryMethod === 'Theo chiết khấu')}
              disabled={isFormDisabled}
            />
            <span className="admin-app-dropdown-arrow">▼</span>
          </div>
          <div className="admin-app-hint">
            {priceLoading ? 'Đang tải giá từ báo giá...' : 'Giá bình thường'}
          </div>
        </div>

        <div className="admin-app-field-group admin-app-field-group-large">
          <label className="admin-app-label">Khuyến mãi áp dụng</label>
          <div className="admin-app-promotion-box">
            {promotionLoading && <div className="admin-app-hint">Đang tải khuyến mãi...</div>}
            {!promotionLoading && promotionError && (
              <div className="admin-app-error">{promotionError}</div>
            )}
            {!promotionLoading && !promotionError && promotions.length === 0 && (
              <div className="admin-app-hint">Không có khuyến mãi</div>
            )}
            {!promotionLoading && !promotionError && promotions.length > 0 && (
              <div className="admin-app-select-wrapper">
                <select
                  className="admin-app-input admin-app-input-wide"
                  value={normalizePromotionId(selectedPromotionId || normalizePromotionId(promotions[0]?.id))}
                  onChange={(e) => setSelectedPromotionId(normalizePromotionId(e.target.value))}
                  disabled={isFormDisabled}
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
                        ? ` - ${displayValue}`
                        : '';
                    return (
                      <option key={normalizePromotionId(promo.id)} value={normalizePromotionId(promo.id)}>
                        {`${promo.name}${valueLabel}`}
                      </option>
                    );
                  })}
                </select>
                <span className="admin-app-dropdown-arrow">▼</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-app-form-row">
        <div className="admin-app-field-group">
          <label className="admin-app-label">Thành tiền</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-readonly"
            value={subtotal.toLocaleString('vi-VN')}
            readOnly
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">VAT (%)</label>
          <div className="admin-app-input-wrapper">
            <input
              type="number"
              className="admin-app-input admin-app-input-readonly"
              value={vatPercent}
              readOnly
              placeholder="0"
            />
          </div>
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">GTGT</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-readonly"
            value={vatAmount.toLocaleString('vi-VN')}
            readOnly
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Tổng tiền</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-readonly"
            value={totalAmount.toLocaleString('vi-VN')}
            readOnly
          />
        </div>
      </div>

      {/* Checkboxes and Additional Fields */}
      <div className="admin-app-form-row admin-app-form-row-checkboxes">
        <div className="admin-app-checkbox-group">
          <input
            type="checkbox"
            id="approvePrice"
            checked={approvePrice}
            onChange={(e) => setApprovePrice(e.target.checked)}
            className="admin-app-checkbox"
            disabled={isFormDisabled}
          />
          <label htmlFor="approvePrice" className="admin-app-checkbox-label">
            Duyệt giá
          </label>
        </div>

        <div className="admin-app-checkbox-group">
          <input
            type="checkbox"
            id="approveSupPrice"
            checked={approveSupPrice}
            onChange={(e) => setApproveSupPrice(e.target.checked)}
            className="admin-app-checkbox"
            disabled={isFormDisabled}
          />
          <label htmlFor="approveSupPrice" className="admin-app-checkbox-label">
            Duyệt giá SUP
          </label>
        </div>

        <div className="admin-app-checkbox-group">
          <input
            type="checkbox"
            id="urgentOrder"
            checked={urgentOrder}
            onChange={(e) => setUrgentOrder(e.target.checked)}
            className="admin-app-checkbox"
            disabled={isFormDisabled}
          />
          <label htmlFor="urgentOrder" className="admin-app-checkbox-label">
            Đơn hàng gấp
          </label>
        </div>
      </div>

      {/* Price Approval Section */}
      {approvePrice && (
        <div className="admin-app-form-row">
          <div className="admin-app-field-group">
            <label className="admin-app-label">Phương thức nhập giá</label>
            <Dropdown
              options={[
                { value: 'Nhập thủ công', label: 'Nhập thủ công' },
                { value: 'Theo chiết khấu', label: 'Theo chiết khấu' },
              ]}
              value={priceEntryMethod}
              onChange={(value) => {
                setPriceEntryMethod(value as 'Nhập thủ công' | 'Theo chiết khấu');
                // Reset về giá gốc khi chuyển sang "Nhập thủ công"
                if (value === 'Nhập thủ công' && basePriceForDiscount > 0) {
                  handlePriceChange(String(Math.round(basePriceForDiscount)));
                }
              }}
              placeholder="Chọn phương thức"
              disabled={isFormDisabled}
            />
          </div>

          {priceEntryMethod === 'Theo chiết khấu' && (
            <div className="admin-app-field-group">
              <label className="admin-app-label">Tỉ lệ chiết khấu (%)</label>
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

          <div className="admin-app-field-group">
            <label className="admin-app-label">Người duyệt</label>
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
          </div>
        </div>
      )}

      {/* Approver Info Display */}
      {(approvePrice || approveSupPrice) && approver && (
        <div className="admin-app-form-row">
          <div className="admin-app-field-group admin-app-field-group-wide">
            <div style={{ color: '#ff4444', fontSize: '14px', fontWeight: '500' }}>
              Duyệt giá bởi {approver}
            </div>
          </div>
        </div>
      )}

      {/* Delivery Date and Note */}
      <div className="admin-app-form-row admin-app-form-row-actions">
        <div className="admin-app-field-group">
          <label className="admin-app-label">Ngày giao NM</label>
          <div className="admin-app-input-wrapper">
            <input
              type="text"
              className="admin-app-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              placeholder={isFormDisabled ? "Chọn khách hàng và SO trước" : "dd/mm/yyyy"}
              disabled={isFormDisabled}
            />
            <span className="admin-app-calendar-icon">📅</span>
          </div>
        </div>

        <div className="admin-app-field-group admin-app-field-group-note">
          <label className="admin-app-label">Ghi chú</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-wide"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isFormDisabled ? "Chọn khách hàng và SO trước" : "Ghi chú"}
            disabled={isFormDisabled}
          />
        </div>

        {/* Action Buttons */}
        <div className="admin-app-action-buttons">
          <button
            className="admin-app-action-btn admin-app-action-btn-add"
            onClick={onAdd}
            title="Thêm sản phẩm"
            disabled={buttonsDisabled}
          >
            <span className="admin-app-action-icon">+</span>
          </button>
          <button
            className="admin-app-action-btn admin-app-action-btn-save"
            onClick={onSave}
            title="Lưu"
            disabled={buttonsDisabled}
          >
            <span className="admin-app-action-icon">💾</span>
          </button>
          <button
            className="admin-app-action-btn admin-app-action-btn-refresh"
            onClick={onRefresh}
            title="Làm mới"
            disabled={buttonsDisabled}
          >
            <span className="admin-app-action-icon">↻</span>
          </button>
        </div>
      </div>
    </div>
  );
}

