import React, { useState, useEffect } from 'react';
import {
  CartItem,
  Promotion,
  addToCartWithPromotion,
  getTotalQuantityByPromotion,
  updateItemPromotion
} from '../utils/promotionUtils';

interface AddToCartWithPromotionProps {
  product: {
    productId: string;
    productName: string;
    price: number;
    promotionId?: string;
    crdfd_gtgt?: number;
    crdfd_gtgt_value?:number;
  };
  promotions: Promotion[];
  currentCartItems: CartItem[];
  onAddToCart: (items: CartItem[]) => void;
}

const AddToCartWithPromotion: React.FC<AddToCartWithPromotionProps> = ({
  product,
  promotions,
  currentCartItems,
  onAddToCart
}) => {
  const [quantity, setQuantity] = useState(1);
  const [promotionInfo, setPromotionInfo] = useState<{
    totalQuantity: number;
    isValue2Applied: boolean;
    appliedValue: number;
  } | null>(null);

  // Tìm promotion tương ứng
  const promotion = product.promotionId
    ? promotions.find(p => p.promotionId === product.promotionId)
    : undefined;

  // Cập nhật thông tin khuyến mãi khi có thay đổi
  useEffect(() => {
    if (!promotion || !product.promotionId) return;

    const totalQuantity = getTotalQuantityByPromotion(currentCartItems, product.promotionId);
    const { isValue2Applied, appliedValue } = updateItemPromotion(
      { ...product, quantity: 1 },
      totalQuantity,
      promotion
    );

    setPromotionInfo({
      totalQuantity,
      isValue2Applied: isValue2Applied ?? false,
      appliedValue: appliedValue ?? 0
    });
  }, [product, promotions, currentCartItems]);

  const handleAddToCart = () => {
    if (!product.promotionId) return;

    const newItem: CartItem = {
      ...product,
      quantity,
      promotionId: product.promotionId,
      crdfd_gtgtsanpham: product.crdfd_gtgt_value ?? product.crdfd_gtgt ?? 0,
      crdfd_gtgt_value: product.crdfd_gtgt_value ?? product.crdfd_gtgt ?? 0,
      crdfd_gtgt: product.crdfd_gtgt ?? product.crdfd_gtgt_value ?? 0
    };

    const updatedItems = addToCartWithPromotion(currentCartItems, newItem, promotions);
    onAddToCart(updatedItems);
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
  };

  return (
    <div className="add-to-cart-container p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{product.productName}</h3>
      
      <div className="mb-2">
        <p className="text-gray-600">Giá gốc: {product.price.toLocaleString('vi-VN')}đ</p>
        {promotionInfo && (
          <div className="text-green-600">
            <p>
              Tổng số lượng đã mua: {promotionInfo.totalQuantity}
              {promotionInfo.isValue2Applied && ' (Đạt KM2)'}
            </p>
            <p>
              Giá trị khuyến mãi: {promotionInfo.appliedValue.toLocaleString('vi-VN')}đ
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="px-2 py-1 bg-gray-200 rounded"
          >
            -
          </button>
          <span className="w-10 text-center">{quantity}</span>
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="px-2 py-1 bg-gray-200 rounded"
          >
            +
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Thêm vào giỏ
        </button>
      </div>

      {promotion && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Khuyến mãi: {promotion.congdonsoluong ? 'Cộng dồn' : 'Không cộng dồn'}</p>
          <p>Số lượng áp dụng: {promotion.soluongapdung}</p>
          <p>Giá trị KM1: {promotion.value.toLocaleString('vi-VN')}đ</p>
          {promotion.value2 && (
            <p>Giá trị KM2: {promotion.value2.toLocaleString('vi-VN')}đ</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AddToCartWithPromotion; 