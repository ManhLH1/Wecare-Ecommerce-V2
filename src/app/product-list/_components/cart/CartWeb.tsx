import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Loading from "@/components/loading";
import { CartProps } from "@/model/interface/CartProps";
import { CartItemComponent } from "./CartItemComponent";
import { CartItem } from "@/model/interface/ProductCartData";
import {
  calculateDiscountedPrice,
  createOrder,
  fetchCustomerData,
  PAYMENT_METHODS,
  calculateTotalQuantityByPromotion,
} from "./cartUtils";

interface CustomerData {
  crdfd_customerid: string;
  crdfd_name: string;
  sdt: string;
  crdfd_address: string;
  saleonline: string;
  saledirect: string;
  potentialProducts: any[];
}

const CartWeb: React.FC<CartProps> = ({
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
  // Removed unused cartItems state
  const [processedItems, setProcessedItems] = useState<CartItem[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isExportInvoice, setIsExportInvoice] = useState(false);

  // Debug logging để track cart items changes
  React.useEffect(() => {
  }, [items]);

  React.useEffect(() => {

  }, [processedItems]);

  // Initialize processedItems when items prop changes
  React.useEffect(() => {
    const initialProcessedItems = items.map(item => ({
      ...item,
      isApplyPromotion: false,
      promotion: item.promotion ? {
        ...item.promotion
      } : undefined
    }));
    setProcessedItems(initialProcessedItems);
  }, [items]);

  // Cập nhật processedItems mỗi khi items hoặc selectedPaymentMethod thay đổi
  useEffect(() => {
    const updatedItems = items.map(item => {
      // Kiểm tra điều kiện phương thức thanh toán
      const isPaymentMethodValid = !!(
        selectedPaymentMethod && 
        (!item.promotion?.ieuKhoanThanhToanApDung || 
          item.promotion.ieuKhoanThanhToanApDung === selectedPaymentMethod)
      );
      
      // Kiểm tra điều kiện sản phẩm mua kèm
      const hasBundledProduct =
        // Nếu không có điều kiện mua kèm thì luôn true
        (!item.promotion?.maSanPhamMuaKem && !item.promotion?.maNhomSPMuaKem )
        ||
        // Nếu có mã sản phẩm mua kèm
        (item.promotion?.maSanPhamMuaKem && items.some(cartItem =>
          cartItem.crdfd_productsid !== item.crdfd_productsid &&
          cartItem.crdfd_masanpham &&
          (item.promotion?.maSanPhamMuaKem?.includes(cartItem.crdfd_masanpham) ?? false)
        ))
        ||
        // Nếu có nhóm sản phẩm mua kèm
        (item.promotion?.maNhomSPMuaKem && items.some(cartItem =>
          cartItem.crdfd_productsid !== item.crdfd_productsid &&
          (cartItem as any).crdfd_manhomsp &&
          (item.promotion?.maNhomSPMuaKem?.includes((cartItem as any).crdfd_manhomsp) ?? false)
        ))
     
      
      // Chỉ áp dụng khuyến mãi khi cả hai điều kiện đều thỏa mãn
      const isApplyPromotion = Boolean(isPaymentMethodValid && hasBundledProduct);
      
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
        const originalPrice = Number(
          typeof item.cr1bb_giaban === "number"
            ? item.cr1bb_giaban
            : (item.cr1bb_giaban || "").replace(/[^\d.]/g, "")
        );
        const quantity = Number(item.quantity) || 0;
        let discountAmount = 0;
        if (Number(item.promotion.vn) === 191920000) {
          // % discount
          let promotionValue = Number(item.promotion.value);
          discountAmount = originalPrice * (promotionValue / 100);
        } else {
          // fixed discount
          let promotionValue = Number(item.promotion.value);
          discountAmount = promotionValue;
        }
        // Log để kiểm tra
        newTotalDiscount += discountAmount * quantity;
      }
    });
    
    setProcessedItems(updatedItems);
    setTotalDiscount(newTotalDiscount);
  }, [items, selectedPaymentMethod]);

  // Tạo hàm wrapper cho onUpdateQuantity để đảm bảo recalculate giá khi update số lượng
  const handleUpdateQuantity = useCallback((id: string, newQuantity: number) => {
    
    // Update the quantity in the items array
    const updatedItems = items.map(item => {
      if (item.crdfd_productsid === id) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    // Recalculate promotions for all items
    const recalculatedItems = updatedItems.map(item => {
      if (item.promotion && item.isApplyPromotion) {
        const totalQuantity = calculateTotalQuantityByPromotion(updatedItems, item.promotion.promotionId);
        const discountedPrice = calculateDiscountedPrice(item, updatedItems);
        
        // Check if the conditions for tier 3 and tier 2 are met
        const isValue3Applied = item.promotion.value3 && 
          item.promotion.soluongapdungmuc3 && 
          totalQuantity >= Number(item.promotion.soluongapdungmuc3);
        
        const isValue2Applied = !isValue3Applied && 
          item.promotion.value2 && 
          totalQuantity >= (Number(item.promotion.soluongapdung) || 0);
        
        return {
          ...item,
          discountedPrice,
          promotion: {
            ...item.promotion,
            isValue3Applied,
            isValue2Applied
          }
        } as CartItem;
      }
      return item;
    });

    // Update both the parent component and local state
    onUpdateQuantity(id, newQuantity);
    setProcessedItems(recalculatedItems);
  }, [items, onUpdateQuantity]);

  // Hàm tính tổng tiền gốc
  const calculateOriginalTotal = useCallback(() => {
    return processedItems.reduce((sum, item) => {
      const price = Number(
        typeof item.cr1bb_giaban === "number"
          ? item.cr1bb_giaban
          : (item.cr1bb_giaban || "")
              .replace(/[^\d.]/g, "") // loại bỏ ký tự không phải số
      );
      const quantity = Number(item.quantity) || 0;
      return sum + (isNaN(price) ? 0 : price) * (isNaN(quantity) ? 0 : quantity);
    }, 0);
  }, [processedItems]);

  // Hàm tính tổng tiền sau khuyến mãi có xét điều kiện thanh toán
  const calculateDiscountedTotal = useCallback(() => {
    if (!processedItems || !Array.isArray(processedItems)) return 0;

    return processedItems.reduce((sum, item) => {

      const originalPrice = parseFloat(item.cr1bb_giaban ?? "0");
      const quantity = item.quantity || 0;
      const totalOriginalPrice = originalPrice * quantity;

      if (!item.isApplyPromotion || !item.promotion) {
        return sum + totalOriginalPrice;
      }

      // Sử dụng hàm calculateDiscountedPrice mới với toàn bộ danh sách items
      const discountedPrice = calculateDiscountedPrice(item, processedItems);
      const finalPrice = discountedPrice * quantity;
    
      return sum + finalPrice;
    }, 0);
  }, [processedItems]);

  // Tính các giá trị tổng
  const originalTotal = calculateOriginalTotal();
  const discountedTotal = calculateDiscountedTotal();
  const savedAmount = totalDiscount;
  // Xóa toàn bộ các hàm và biến liên quan đến VAT (totalVAT, finalTotal, isOrderWithVAT...)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col relative">
        <div className="pt-2 px-2 pb-2 bg-customBlue text-white flex justify-between items-center">
          <p className="ml-2 text-gray-100">{items.length} sản phẩm</p>
          <button
            onClick={onClose}
            className="text-2xl text-white"
          >
            &times;
          </button>
        </div>

        {customerData && (
          <div className="p-2 bg-white shadow-sm rounded-lg border border-gray-200 text-xs">
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

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center">
              <Image 
                src="https://pngimg.com/d/shopping_cart_PNG46.png" 
                alt="Empty Cart"
                width={160}
                height={160}
                className="opacity-30"
                priority
              />
              <p className="text-gray-300 mt-4 text-[15px] font-arial">
                Giỏ hàng của bạn đang trống
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-2">
              {processedItems.map((item) => (
                <CartItemComponent
                  key={item.crdfd_productsid}
                  item={item}
                  onRemove={onRemoveItem}
                  onUpdateQuantity={handleUpdateQuantity}
                  selectedPaymentMethod={selectedPaymentMethod}
                  allItems={processedItems}
                  isOrderWithVAT={false} // Always false as VAT is removed
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Hình thức thanh toán:
            </span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(e.target.value);
                setShowPaymentError(false);
              }}
              className={`border ${showPaymentError ? 'border-red-500' : 'border-gray-300'} rounded-md px-2 py-1 text-sm text-gray-700`}
            >
              <option value="">-- Chọn hình thức thanh toán --</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          {showPaymentError && (
            <p className="text-red-500 text-sm mt-1">Vui lòng chọn hình thức thanh toán</p>
          )}

          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="export-invoice"
              checked={isExportInvoice}
              onChange={e => {
                setIsExportInvoice(e.target.checked);
              }}
              className="mr-2"
            />
            <label htmlFor="export-invoice" className="text-sm font-medium text-gray-700">
              Xuất hóa đơn
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-lg font-bold mb-2">
              <span>Tổng cộng:</span>
              <span>{discountedTotal.toLocaleString("vi-VN")}₫</span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-customBlue hover:text-blue-700 text-sm font-medium underline w-full text-center mb-2"
            >
              {showDetails ? "Ẩn chi tiết" : "Xem chi tiết"}
            </button>
            {showDetails && (
              <>
                <div className="flex justify-between text-base">
                  <span>Tổng tiền hàng:</span>
                  <span>{originalTotal.toLocaleString("vi-VN")}₫</span>
                </div>
                {savedAmount > 0 && (
                  <div className="flex justify-between text-base text-green-600">
                    <span>Tiết kiệm:</span>
                    <span>-{Math.round(savedAmount).toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                <div className="flex justify-between text-base">
                  <span>Tạm tính:</span>
                  <span>{discountedTotal.toLocaleString("vi-VN")}₫</span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleCreateOrder}
            disabled={isLoading || items.length === 0 || !selectedPaymentMethod}
            className={`mt-4 w-full bg-customBlue text-white py-2 px-4 rounded-lg font-medium text-sm transition duration-200 ${
              isLoading || items.length === 0 || !selectedPaymentMethod
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700"
            }`}
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
        </div>
      </div>
    </div>
  );
};

export default CartWeb;
