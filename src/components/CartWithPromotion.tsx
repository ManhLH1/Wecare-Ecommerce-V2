import React, { useEffect, useState } from 'react';
import {
  CartItem,
  Promotion,
  addToCartWithPromotion,
  updateCartItemQuantity,
  updateCartPromotions
} from '../utils/promotionUtils';

interface CartWithPromotionProps {
  initialItems?: CartItem[];
  promotions: Promotion[];
  onCartUpdate?: (items: CartItem[]) => void;
}

const CartWithPromotion: React.FC<CartWithPromotionProps> = ({
  initialItems = [],
  promotions,
  onCartUpdate
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(initialItems);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const updatedItems = updateCartPromotions(cartItems, promotions);
    setCartItems(updatedItems);
    onCartUpdate?.(updatedItems);
  }, [promotions]);

  // Thêm sản phẩm vào giỏ hàng
  const handleAddToCart = (item: CartItem) => {
    const updatedItems = addToCartWithPromotion(cartItems, item, promotions);
    setCartItems(updatedItems);
    onCartUpdate?.(updatedItems);
  };

  // Cập nhật số lượng sản phẩm
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const updatedItems = updateCartItemQuantity(cartItems, productId, newQuantity, promotions);
    setCartItems(updatedItems);
    onCartUpdate?.(updatedItems);
  };

  // Tính tổng tiền giỏ hàng
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.promotedPrice || item.price;
      return total + price * item.quantity;
    }, 0);
  };

  return (
    <div className="cart-container">
      <h2 className="text-xl font-bold mb-4">Giỏ hàng</h2>
      
      {cartItems.length === 0 ? (
        <p>Giỏ hàng trống</p>
      ) : (
        <>
          {/* Danh sách sản phẩm */}
          <div className="cart-items space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.productId}
                className="cart-item border p-4 rounded-lg flex justify-between items-center"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{item.productName}</h3>
                  <div className="text-sm text-gray-600">
                    <p>Giá gốc: {item.price.toLocaleString('vi-VN')}đ</p>
                    {item.promotedPrice && (
                      <p className="text-green-600">
                        Giá KM: {item.promotedPrice.toLocaleString('vi-VN')}đ
                        {item.isValue2Applied && ' (Đạt KM2)'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Số lượng */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.productId, Math.max(0, item.quantity - 1))}
                    className="px-2 py-1 bg-gray-200 rounded"
                  >
                    -
                  </button>
                  <span className="w-10 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                    className="px-2 py-1 bg-gray-200 rounded"
                  >
                    +
                  </button>
                </div>

                {/* Thành tiền */}
                <div className="ml-4 text-right">
                  <p className="font-semibold">
                    {((item.promotedPrice || item.price) * item.quantity).toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tổng tiền */}
          <div className="mt-6 text-right">
            <p className="text-lg font-bold">
              Tổng tiền: {calculateTotal().toLocaleString('vi-VN')}đ
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default CartWithPromotion; 