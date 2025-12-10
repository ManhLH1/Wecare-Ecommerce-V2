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
import { ProductImage } from "./ProductImage";
import { CartItemComponent } from "./CartItemComponent";
import { calculateDiscountedPrice, createOrder, fetchCustomerData, PAYMENT_METHODS, getPaymentMethodLabel} from "./cartUtils";

interface CustomerData {
  crdfd_customerid: string;
  crdfd_name: string;
  sdt: string;
  crdfd_address: string;
  saleonline: string;
  saledirect: string;
  potentialProducts: any[];
}

const CartMobile: React.FC<CartProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  customerId,
  onClearCart,
  customerSelectId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [processedItems, setProcessedItems] = useState(
    items.map(item => {
      return {
        ...item,
        isApplyPromotion: false,
        promotion: item.promotion ? {
          ...item.promotion
        } : undefined
      };
    })
  );
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isExportInvoice, setIsExportInvoice] = useState(false);

  // Cập nhật processedItems mỗi khi items hoặc selectedPaymentMethod thay đổi
  useEffect(() => {
    
    const updatedItems = items.map(item => {
      const isApplyPromotion = !!(
        selectedPaymentMethod && 
        (!item.promotion?.ieuKhoanThanhToanApDung || 
          item.promotion.ieuKhoanThanhToanApDung === selectedPaymentMethod)
      );
      
      // Calculate total quantity for this promotion
      const totalQuantity = items.reduce((total, cartItem) => {
        if (
          cartItem.promotion?.promotionId === item.promotion?.promotionId && 
          cartItem.promotion?.congdonsoluong
        ) {
          return total + (cartItem.quantity || 0);
        }
        return total;
      }, 0);

      // Get soluongapdung from either the promotion object or the item itself
      const soluongapdung = Number(item.promotion?.soluongapdung) || Number(item.soluongapdung) || 0;

      // Determine if value2 should be used
      const shouldUseValue2 = totalQuantity >= soluongapdung;
      const selectedValue = shouldUseValue2 && item.promotion?.value2 
        ? item.promotion.value2 
        : item.promotion?.value;

      return {
        ...item,
        isApplyPromotion,
        promotion: item.promotion ? {
          ...item.promotion,
          selectedValue,
          isValue2Applied: shouldUseValue2,
          appliedValue: shouldUseValue2 && item.promotion.value2 
            ? item.promotion.value2 
            : item.promotion.value
        } : undefined
      };
    });

    // Calculate total discount in the same effect to avoid unnecessary re-renders
    let newTotalDiscount = 0;
    updatedItems.forEach(item => {
      if (item.isApplyPromotion && item.promotion) {
        const originalPrice = parseFloat(item.cr1bb_giaban ?? "0");
        const quantity = item.quantity || 0;
        
        // Calculate the discount amount based on the promotion type and value
        let discountAmount = 0;
        if (Number(item.promotion.vn) === 191920000) { // Percentage discount
          // Get the applied value based on tier level (3, 2, or 1)
          let promotionValue;
          if (item.promotion.isValue3Applied && item.promotion.value3) {
            promotionValue = parseFloat(item.promotion.value3);
          } else if (item.promotion.isValue2Applied && item.promotion.value2) {
            promotionValue = parseFloat(item.promotion.value2);
          } else {
            promotionValue = parseFloat(item.promotion.value);
          }
          discountAmount = originalPrice * (promotionValue / 100);
        } else { // Fixed amount discount
          // Get the applied value based on tier level (3, 2, or 1)
          let promotionValue;
          if (item.promotion.isValue3Applied && item.promotion.value3) {
            promotionValue = parseFloat(item.promotion.value3);
          } else if (item.promotion.isValue2Applied && item.promotion.value2) {
            promotionValue = parseFloat(item.promotion.value2);
          } else {
            promotionValue = parseFloat(item.promotion.value);
          }
          discountAmount = promotionValue;
        }
        
        // Add the total discount for this item (discount per unit * quantity)
        newTotalDiscount += discountAmount * quantity;
      }
    });
    
    setProcessedItems(updatedItems);
    setTotalDiscount(newTotalDiscount);
  }, [items, selectedPaymentMethod]);

  // Tạo hàm wrapper cho onUpdateQuantity để đảm bảo recalculate giá khi update số lượng
  const handleUpdateQuantity = useCallback((id: string, newQuantity: number) => {
    
    // Gọi onUpdateQuantity từ props để cập nhật số lượng trong cart
    onUpdateQuantity(id, newQuantity);
    
    // Logic tính toán lại khuyến mãi sẽ được thực hiện trong useEffect khi items thay đổi
  }, [onUpdateQuantity]);

  // Hàm tính tổng tiền gốc
  const calculateOriginalTotal = useCallback(() => {
    return processedItems.reduce(
      (sum, item) => sum + parseFloat(item.cr1bb_giaban ?? "0") * item.quantity,
      0
    );
  }, [processedItems]);

  // Hàm tính tổng tiền sau khuyến mãi có xét điều kiện thanh toán
  const calculateDiscountedTotal = useCallback(() => {
    if (!processedItems || !Array.isArray(processedItems)) return 0;

    return processedItems.reduce((sum, item) => {
      if (!item.isApplyPromotion || !item.promotion) {
        const regularPrice = parseFloat(item.cr1bb_giaban ?? "0") * item.quantity;
        return sum + regularPrice;
      }

      // Sử dụng hàm calculateDiscountedPrice mới với toàn bộ danh sách items
      const discountedPrice = calculateDiscountedPrice(item, processedItems);
      const finalPrice = discountedPrice * item.quantity;
      
      return sum + finalPrice;
    }, 0);
  }, [processedItems]);

  // Xóa toàn bộ các hàm và biến liên quan đến VAT (calculateVAT, totalVAT, finalTotal, isOrderWithVAT...)
  // Thay thế isOrderWithVAT bằng isExportInvoice

  useEffect(() => {
    if (isOpen) {
      setSelectedPaymentMethod("");
      setShowPaymentError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (customerSelectId) {
      fetchCustomerData(customerSelectId).then(setCustomerData);
    }
  }, [customerSelectId]);

  const handleCreateOrder = () => {
    if (!selectedPaymentMethod) {
      setShowPaymentError(true);
      return;
    }
    setShowPaymentError(false);
    createOrder(
      processedItems,
      customerData,
      selectedPaymentMethod,
      setIsLoading,
      onClearCart,
      onClose,
      isExportInvoice // Truyền trạng thái xuất hóa đơn
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header */}
        <div className="pt-2 px-2 pb-2 bg-customBlue text-white flex justify-between items-center">
          <p className="ml-2 text-gray-100">{processedItems.length} sản phẩm</p>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="text-2xl text-white hover:text-gray-200 active:text-gray-300 p-2 -m-2 rounded-full transition-colors duration-200 flex items-center justify-center w-8 h-8"
            aria-label="Đóng giỏ hàng"
          >
            ✕
          </button>
        </div>

        {/* Customer Info */}
        {customerData && (
          <div className="p-2 mt-4 bg-white shadow-sm text-xs">
            <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1">
              <span className="font-semibold text-gray-700">Tên:</span>
              <span className="text-gray-700">{customerData.crdfd_name}</span>
              <span className="font-semibold text-gray-700">SĐT:</span>
              <span className="text-gray-700">{customerData.sdt}</span>
              <span className="font-semibold text-gray-700">Địa chỉ:</span>
              <span className="text-gray-700">{customerData.crdfd_address}</span>
            </div>
          </div>
        )}

        {/* Scrollable Product List */}
        <div className="flex-1 overflow-y-auto relative">
          {processedItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <Image 
                src="https://pngimg.com/d/shopping_cart_PNG46.png" 
                alt="Empty Cart"
                width={160}
                height={160}
                className="opacity-30"
                priority
              />
              <p className="text-gray-300 mt-4 text-[15px] font-arial">Giỏ hàng của bạn đang trống</p>
            </div>
          )}

          {/* Content */}
          <div className="flex flex-col gap-2 p-2 pb-6 relative z-10">
            {processedItems.length > 0 &&
              processedItems.map((item) => (
                <CartItemComponent
                  key={item.crdfd_productsid}
                  item={item}
                  onRemove={onRemoveItem}
                  onUpdateQuantity={handleUpdateQuantity}
                  selectedPaymentMethod={selectedPaymentMethod}
                  allItems={processedItems}
                  isOrderWithVAT={isExportInvoice}
                />
              ))}
          </div>
        </div>

        {/* Fixed Bottom Section */}
        <div className="bg-white border-t shadow-lg mb-2 py-4">
          <div className="p-2 pt-2 pb-4">
            <div className="flex flex-col gap-2 mb-2">
              <label className="text-xs font-medium text-gray-700 mb-0" htmlFor="payment-method">Hình thức thanh toán:</label>
              <div className="relative w-full">
                <select
                  id="payment-method"
                  value={selectedPaymentMethod}
                  onChange={(e) => {
                    setSelectedPaymentMethod(e.target.value);
                    setShowPaymentError(false);
                  }}
                  className={`border ${showPaymentError ? 'border-red-500' : 'border-gray-300'} rounded-md px-2 py-1 text-xs text-gray-700 w-full focus:outline-none focus:ring-1 focus:ring-blue-300 appearance-none dropup-select`}
                  style={{position: 'relative', zIndex: 10}}
                >
                  <option value="">-- Chọn hình thức thanh toán --</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {/* icon arrow up */}
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▲</span>
              </div>
            </div>
            {showPaymentError && (
              <p className="text-red-500 text-xs mt-1">Vui lòng chọn hình thức thanh toán</p>
            )}
            <div className="flex justify-between items-center mb-1 mt-2">
              <span className="text-xs font-medium text-gray-700">Tổng tiền:</span>
              <span className="text-xs font-bold text-gray-700">{calculateOriginalTotal().toLocaleString("vi-VN")} ₫</span>
            </div>
            <div className="flex items-center mb-1 mt-2">
              <input
                type="checkbox"
                id="export-invoice"
                checked={isExportInvoice}
                onChange={e => {
                  setIsExportInvoice(e.target.checked);
                }}
                className="mr-1"
                style={{width: 14, height: 14}}
              />
              <label htmlFor="export-invoice" className="text-xs font-medium text-gray-700">
                Xuất hóa đơn
              </label>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-700">Tiền được giảm:</span>
              <span className="text-xs font-bold text-red-500">{Math.round(totalDiscount).toLocaleString("vi-VN")} ₫</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-700">Thành tiền (đã KM):</span>
              <span className="text-xs font-bold text-green-500">{calculateDiscountedTotal().toLocaleString("vi-VN")} ₫</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>Tạm tính:</span>
              <span>{calculateDiscountedTotal().toLocaleString("vi-VN")}₫</span>
            </div>
          </div>
        </div>
        <div className="bg-white border-t shadow-lg mb-2 py-4">
          <div className="p-2 pt-2 pb-4">
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={handleCreateOrder}
                disabled={isLoading || processedItems.length === 0 || !selectedPaymentMethod}
                className={`w-full bg-customBlue text-white py-2 rounded-lg font-medium text-xs transition duration-200 ${
                  isLoading || processedItems.length === 0 || !selectedPaymentMethod
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-700"
                }`}
                style={{minHeight: 0, lineHeight: '18px'}}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loading />
                    Đang xử lý...
                  </span>
                ) : (
                  "Tạo đơn"
                )}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium text-xs transition duration-200 hover:bg-gray-300"
                style={{minHeight: 0, lineHeight: '18px'}}
              >
                Đóng giỏ hàng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CartMobile; 