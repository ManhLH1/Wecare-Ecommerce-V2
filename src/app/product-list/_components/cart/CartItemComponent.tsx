import React, { useState, useEffect } from "react";
import { FaTrash } from "react-icons/fa";
import { CartItem } from "@/model/interface/ProductCartData";
import { ProductImage } from "./ProductImage";
import { calculateDiscountedPrice, getPaymentMethodLabel, hasBundledProductInCart } from "./cartUtils";

// Add type augmentation for CartItem to include cr1bb_json_gia
import type { CartItem as BaseCartItem } from '@/model/interface/ProductCartData';
declare module '@/model/interface/ProductCartData' {
  interface CartItem {
    // cr1bb_json_gia?: Array<any>;
    crdfd_gia?: number;
    crdfd_giatheovc?: number;
  }
}

export interface CartItemComponentProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  selectedPaymentMethod: string;
  allItems: CartItem[];
  isOrderWithVAT: boolean;
}

// Hàm lấy giá gốc từ json_giá hoặc các trường khác
function getOriginalPrice(item: CartItem): number {
  // Ưu tiên lấy từ cr1bb_json_gia nếu có
  if (item.cr1bb_json_gia && Array.isArray(item.cr1bb_json_gia) && item.cr1bb_json_gia.length > 0) {
    // Tìm giá có hiệu lực
    const activePrice = item.cr1bb_json_gia.find(
      (g: any) => g.crdfd_trangthaihieulucname === "Còn hiệu lực" || g.crdfd_trangthaihieuluc === 191920000
    );
    if (activePrice && activePrice.crdfd_gia) {
      return Number(activePrice.crdfd_gia);
    }
    // Nếu không có giá còn hiệu lực, lấy giá đầu tiên
    if (item.cr1bb_json_gia[0] && item.cr1bb_json_gia[0].crdfd_gia) {
      return Number(item.cr1bb_json_gia[0].crdfd_gia);
    }
  }
  // Fallback các trường khác
  if (item.crdfd_gia && item.crdfd_gia > 0) return Number(item.crdfd_gia);
  if (item.crdfd_giatheovc && item.crdfd_giatheovc > 0) return Number(item.crdfd_giatheovc);
  if (typeof item.cr1bb_giaban === 'number' && item.cr1bb_giaban > 0) return Number(item.cr1bb_giaban);
  if (typeof item.cr1bb_giaban === 'string') {
    // Lấy tất cả số và dấu chấm, sau đó loại bỏ dấu chấm để parse đúng số tiền
    const priceMatch = item.cr1bb_giaban.match(/[\d.]+/);
    if (priceMatch && priceMatch[0]) {
      const normalized = priceMatch[0].replace(/\./g, '');
      return Number(normalized);
    }
  }
  return 0;
}

export const CartItemComponent: React.FC<CartItemComponentProps> = ({
  item,
  onRemove,
  onUpdateQuantity,
  selectedPaymentMethod,
  allItems,
  isOrderWithVAT
}) => {
  const [inputWidth, setInputWidth] = useState("2ch");
  
  useEffect(() => {
    setInputWidth(`${Math.max(4, item.quantity.toString().length + 4)}ch`);
  }, [item.quantity]);

  // Tính toán giá gốc - lấy từ getOriginalPrice
  const originalPrice = getOriginalPrice(item);
  const totalOriginalPrice = originalPrice * (Number(item.quantity) || 1);

  // Kiểm tra điều kiện thanh toán
  const hasPaymentCondition = item.promotion?.ieuKhoanThanhToanApDung != null;
  const isPaymentMethodValid = hasPaymentCondition ? 
    item.promotion?.ieuKhoanThanhToanApDung === selectedPaymentMethod : 
    true;

  // Tính giá sau khuyến mãi
  let finalPrice = totalOriginalPrice;
  let discountedPrice = originalPrice;
  
  // Áp dụng khuyến mãi nếu có promotion và thỏa mãn điều kiện thanh toán (hoặc không có điều kiện)
  if (item.promotion && (!hasPaymentCondition || isPaymentMethodValid)) {
    discountedPrice = calculateDiscountedPrice(item, allItems);
    finalPrice = discountedPrice * (Number(item.quantity) || 1);
  }

  // Đảm bảo giá không âm
  discountedPrice = Math.max(0, discountedPrice);
  finalPrice = Math.max(0, finalPrice);

  // Chỉ hiển thị thông báo lỗi khi có điều kiện thanh toán cụ thể và không thỏa mãn
  const shouldShowPaymentError = hasPaymentCondition && selectedPaymentMethod && !isPaymentMethodValid;

  // Lấy label phương thức thanh toán nếu có
  const paymentMethodLabel = hasPaymentCondition ? getPaymentMethodLabel(item.promotion?.ieuKhoanThanhToanApDung) : "";

  // Tìm phần hiển thị thông tin khuyến mãi và thêm thông báo khi không đáp ứng điều kiện sản phẩm mua kèm
  const isApplyPromotion = item.promotion && item.isApplyPromotion;

  return (
    <div className="flex flex-col p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-start gap-4">
        {/* Cột trái - Hình ảnh và thông tin cơ bản */}
        <div className="flex items-start gap-4 flex-1">
          <div className="relative">
            <ProductImage
              productGroupId={item._crdfd_productgroup_value}
              productName={item.crdfd_name}
              className="w-20 h-20 object-contain rounded-md border border-gray-100 p-1"
              imageUrl={item.cr1bb_imageurlproduct || item.cr1bb_imageurl}
            />
          </div>
          
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {/* Tên sản phẩm */}
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2">
              {item.crdfd_name}
            </h3>

            {/* Thông tin sản phẩm */}
            <div className="text-xs text-gray-500 space-y-0.5">
              {item.crdfd_thuonghieu && (
                <p>Thương hiệu: <span className="text-gray-700">{item.crdfd_thuonghieu}</span></p>
              )}
              {item.crdfd_quycach && (
                <p>Quy cách: <span className="text-gray-700">{item.crdfd_quycach}</span></p>
              )}
            </div>

            {/* Hiển thị giá */}
            <div className="mt-1">
              {item.promotion ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-green-600">
                      {(!hasPaymentCondition || isPaymentMethodValid ? discountedPrice : originalPrice).toLocaleString("vi-VN")} ₫/{item.unit}
                    </p>
                    {item.promotion.isValue2Applied && (!hasPaymentCondition || isPaymentMethodValid) && (
                      <span className="text-xs text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                        Ưu đãi đặc biệt
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-400 line-through">
                      {originalPrice.toLocaleString("vi-VN")} ₫/{item.unit}
                    </p>
                    <p className="text-xs text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded">
                      {`Giảm ${item.promotion.isValue2Applied && item.promotion.value2 
                        ? item.promotion.value2 
                        : item.promotion.value}${Number(item.promotion.vn) === 191920000 ? "%" : "₫"}${paymentMethodLabel ? ` với ${paymentMethodLabel}` : ''}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <p className="text-base font-medium text-gray-700">
                    {discountedPrice.toLocaleString("vi-VN")} ₫/{item.unit}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải - Số lượng và nút xóa */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
              <button
                onClick={() => {
                  if (item.quantity > 1) {
                    onUpdateQuantity(item.crdfd_productsid, item.quantity - 1);
                  }
                }}
                className="px-2 py-1 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={item.quantity}
                inputMode="numeric"
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 0) {
                    onUpdateQuantity(item.crdfd_productsid, value);
                  }
                }}
                style={{ width: inputWidth }}
                className="px-2 py-1 text-center border-x border-gray-200 text-gray-700 focus:outline-none"
              />
              <button
                onClick={() => onUpdateQuantity(item.crdfd_productsid, item.quantity + 1)}
                className="px-2 py-1 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={() => onRemove(item.crdfd_productsid)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Xóa sản phẩm"
            >
              <FaTrash size={14} />
            </button>
          </div>

          <div className="text-right">
            <p className="font-medium">
              Thành tiền: {finalPrice.toLocaleString("vi-VN")}₫
            </p>
          </div>
        </div>
      </div>

      {/* Thông tin khuyến mãi nếu có */}
      {item.promotion && (
        <div className="mt-3 text-xs bg-blue-50 p-2.5 rounded-md space-y-1">
          {/* Nếu không áp dụng khuyến mãi, hiển thị tên CTKM và chữ Chưa áp dụng màu đỏ */}
          {!item.isApplyPromotion && (
            <p className="font-medium">
              <span className="text-blue-700">{item.promotion.name}</span>
              <span className="text-red-500 font-medium"> - Chưa áp dụng</span>
            </p>
          )}
          {/* Nếu áp dụng khuyến mãi, hiển thị KM: ... (-xxđ) trong vùng xanh */}
          {item.isApplyPromotion && (
            <div className="flex items-center">
              <span className="text-green-600 font-medium">
                KM: {item.promotion.name}
              </span>
              <span className="ml-1 text-gray-500">
                ({item.promotion.vn === 191920000 || item.promotion.cr1bb_vn === "191920000"
                  ? `-${item.promotion.appliedValue || item.promotion.value}%`
                  : `-${parseInt(item.promotion.appliedValue?.toString() || item.promotion.value?.toString() || "0").toLocaleString()}đ`})
              </span>
            </div>
          )}
          {/* Các điều kiện khác nếu cần */}
          {item.isApplyPromotion && item.promotion.conditions && (
            <p className="text-gray-600">{item.promotion.conditions}</p>
          )}
          {item.isApplyPromotion && shouldShowPaymentError && paymentMethodLabel && (
            <p className="text-red-500 bg-red-50 p-1.5 rounded">
              Khuyến mãi chỉ áp dụng cho hình thức thanh toán: {paymentMethodLabel}
            </p>
          )}
          {item.isApplyPromotion && item.promotion.congdonsoluong && (item.promotion.soluongapdung || item.promotion.soluongapdung) && (
            <p className={`${item.promotion.isValue2Applied ? 'text-green-600' : 'text-blue-600'}`}>
              {item.promotion.isValue2Applied 
                ? `✓ Đã đạt đủ số lượng cho ưu đãi đặc biệt (≥ ${item.promotion.soluongapdung || item.promotion.soluongapdung})`
                : `→ Mua đủ ${item.promotion.soluongapdung || item.promotion.soluongapdung} sản phẩm để nhận ưu đãi đặc biệt`}
            </p>
          )}
          {item.isApplyPromotion && item.promotion.soluongcondon !== undefined && item.promotion.value2 && (
            <p className="text-gray-600">
              Số lượng ưu đãi đặc biệt còn lại: <span className="font-medium">{item.promotion.soluongcondon > 0 ? item.promotion.soluongcondon : 'Đã hết'}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};