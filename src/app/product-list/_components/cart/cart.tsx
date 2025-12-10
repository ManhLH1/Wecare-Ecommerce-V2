import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { FaTrash } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";
import Loading from "@/components/loading";
import { Loader2 } from "lucide-react";
import { getItem } from "@/utils/SecureStorage";
import { Products, CartItem } from "@/model/interface/ProductCartData";
import { CartProps } from "@/model/interface/CartProps";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import CartMobile from "./CartMobile";
import CartWeb from "./CartWeb";
import { PAYMENT_METHODS, getPaymentMethodLabel } from './cartUtils';
import { formatPrice, formatDiscountPercentage } from '@/utils/format';
import { ProductImage } from './ProductImage';

interface CustomerData {
  crdfd_customerid: string;
  crdfd_name: string;
  sdt: string;
  crdfd_address: string;
  saleonline: string;
  saledirect: string;
  potentialProducts: any[];
}

const CartItemComponent: React.FC<{
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  selectedPaymentMethod: string;
}> = ({ item, onRemove, onUpdateQuantity, selectedPaymentMethod }) => {
  const originalPrice = Number(item.price) || 0;
  const [inputWidth, setInputWidth] = useState("2ch");
  let discountedPrice;

  useEffect(() => {
    setInputWidth(`${Math.max(4, item.quantity.toString().length + 4)}ch`);
  }, [item.quantity]);

  // Kiểm tra điều kiện thanh toán
  const isPaymentMethodValid = !item.promotion?.ieuKhoanThanhToanApDung || 
    item.promotion.ieuKhoanThanhToanApDung === selectedPaymentMethod;

  const calculateDiscountedPrice = useCallback((price: number, promotion: any, quantity: number) => {
    if (!promotion) return price;

    const baseValue = parseFloat(promotion.crdfd_value);
    const value2 = parseFloat(promotion.value2 || "0");
    const soluongapdung = parseInt(String(promotion.soluongapdung || "0"), 10);
    
    // Xác định giá trị khuyến mãi áp dụng
    let promotionValue = baseValue;
    if (value2 > 0 && soluongapdung > 0 && quantity >= soluongapdung) {
      promotionValue = value2;
      promotion.value = value2.toString();
      promotion.appliedValue = value2.toString();
      promotion.isValue2Applied = true;
    } else {
      promotionValue = baseValue;
      promotion.value = baseValue.toString();
      promotion.appliedValue = baseValue.toString();
      promotion.isValue2Applied = false;
    }

    // Áp dụng khuyến mãi dựa vào loại (% hoặc số tiền cố định)
    if (promotion.cr1bb_vn === "%") {
      return Math.round(price * (1 - promotionValue / 100));
    } else {
      return Math.round(price - promotionValue);
    }
  }, []);

  // Tính giá sau khuyến mãi
  if (isPaymentMethodValid && item.promotion) {
    discountedPrice = calculateDiscountedPrice(originalPrice, item.promotion, item.quantity);
  } else {
    discountedPrice = Math.round(originalPrice);
  }

  const totalPrice = Math.round(discountedPrice * (item.quantity || 1));

  // Hiển thị thông tin khuyến mãi
  const renderPromotionInfo = () => {
    if (!item.promotion) return null;

    const value2 = parseFloat(item.promotion.value2 || "0");
    const soluongapdung = parseInt(String(item.promotion.soluongapdung || "0"), 10);
    const meetsValue2Condition = item.quantity >= soluongapdung;

    return (
      <div className="m-0 p-0 pt-2">
        <div>
          <p className="text-xs text-grey-100">{item.promotion.name}</p>
          {value2 > 0 && soluongapdung > 0 && (
            <p className="text-xs text-blue-600">
              {meetsValue2Condition ? "✓ " : ""}
              Mua từ {soluongapdung} {item.unit} giảm {item.promotion.cr1bb_vn === "%" ? `${formatDiscountPercentage(value2)}%` : `${value2.toLocaleString()}đ`}
              {meetsValue2Condition && ` (Đã áp dụng)`}
            </p>
          )}
        </div>
      </div>
    );
  };

  const handleQuantityChange = (newQuantity: number) => {
    // Cập nhật số lượng và tính lại giá khuyến mãi
    onUpdateQuantity(item.crdfd_productsid, newQuantity);
  };

  return (
    <div className="border-b border-gray-200 pb-0 pt-2">
      <h3 className="text-sm font-medium text-gray-600">{item.crdfd_name}</h3>
      <div className="flex items-center justify-between py-0">
        <div className="flex items-center">
          <ProductImage
            productGroupId={item._crdfd_productgroup_value}
            productName={item.crdfd_name}
            imageUrl={item.cr1bb_imageurlproduct || item.cr1bb_imageurl}
          />
          <div>
            {!item.promotion ? (
              <p className="text-lg text-gray-500">
                {originalPrice.toLocaleString("vi-VN")} ₫/{item.unit}
                {item.oldPrice && item.priceChangeReason && (
                  <p className="text-sm text-grey-500 line-through m-0 p-0 opacity-90">
                    {parseFloat(item.oldPrice).toLocaleString("vi-VN")} ₫/{item.unit}
                  </p>
                )}
              </p>
            ) : (
              <div className="flex flex-col">
                <p className="text-lg text-green-500 m-0 p-0">
                  {discountedPrice.toLocaleString("vi-VN")} ₫/{item.unit}
                </p>
                <div className="flex items-center">
                  <p className="text-sm text-grey-500 line-through m-0 p-0 opacity-90">
                    {originalPrice.toLocaleString("vi-VN")} ₫/{item.unit}
                  </p>
                  <p className="text-sm text-grey-100 m-0 pl-2 italic ml-2 opacity-90">
                    -{item.promotion.cr1bb_vn === "%" 
                      ? `${item.promotion.appliedValue}%` 
                      : `${parseInt(item.promotion.appliedValue || "0").toLocaleString()}đ`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <input
            type="number"
            min="1"
            value={item.quantity !== null && item.quantity !== undefined ? item.quantity : 1}
            inputMode="numeric"
            onChange={(e) => {
              const value = parseInt(e.target.value);
              handleQuantityChange(value || 1);
            }}
            style={{ width: inputWidth }}
            className="px-2 py-1 text-center border border-gray-300 rounded"
          />
          <button
            onClick={() => onRemove(item.crdfd_productsid)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            <FaTrash />
          </button>
        </div>
      </div>
      {renderPromotionInfo()}
      <div className="flex justify-between pt-2">
        <div className="flex-grow" />
        <p className="text-base font-bold text-custom-blue">
          {totalPrice.toLocaleString("vi-VN")} ₫
        </p>
      </div>
    </div>
  );
};

const Cart: React.FC<CartProps> = (props) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("0");
  
  return isMobile ? <CartMobile {...props} /> : <CartWeb {...props} />;
};

export default Cart;
