import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Products from '@/model/Product';
import { Promotion } from '@/model/interface/PromotionProps';
import axios from 'axios';

interface BundledProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Products[];
  onAddToCart: (product: Products, quantity: number) => void;
}

const BundledProductsModal: React.FC<BundledProductsModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddToCart,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Products | null>(null);
  const [quantities, setQuantities] = useState<{ [productId: string]: number }>({});
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBundledProducts, setIsLoadingBundledProducts] = useState(false);

  const fetchBundledProducts = useCallback(async (productCodes: string) => {
    try {
      setIsLoadingBundledProducts(true);
      const codes = productCodes.split(',').map(code => code.trim());
      const response = await axios.post('/api/getBundledProducts', {
        productCodes: codes
      });
      // ... xử lý response như cũ
    } catch (error) {
      // ... xử lý lỗi như cũ
    } finally {
      setIsLoadingBundledProducts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Simulate loading time
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const handleAddToCart = (product: Products, quantity: number) => {
    // Xác định giá gốc
    let basePrice = getProductPrice(product);
    if (isNaN(basePrice) || basePrice <= 0) {
      toast.error("Không thể thêm sản phẩm chưa có giá vào giỏ hàng", {
        position: "top-right",
        autoClose: 2000,
      });
      return;
    }

    // Lấy promotion đầu tiên nếu có
    const promotion = getPromotionInfo(product);

    // Tính giá sau khuyến mãi
    const discountedPrice = getDiscountedPrice(product, quantity);
    let safeDiscountedPrice = basePrice;
    if (typeof discountedPrice === 'number' && !isNaN(discountedPrice) && discountedPrice > 0) {
      safeDiscountedPrice = discountedPrice;
    }

    const productWithPromotion: any = {
      ...product,
      regularPrice: String(Number(basePrice) || 0),
      price: String(Number(safeDiscountedPrice) || 0),
      displayPrice: String(Number(safeDiscountedPrice) || 0),
      hasPromotion: !!promotion,
      promotion: promotion
        ? {
            promotionId: promotion.promotionId,
            value: promotion.value,
            value2: promotion.value2,
            value3: promotion.value3,
            congdonsoluong: promotion.congdonsoluong,
            soluongapdung: promotion.soluongapdung,
            vn: promotion.vn,
            cr1bb_vn: promotion.vn,
            discountAmount: String(Number(basePrice) - Number(safeDiscountedPrice)),
          }
        : null,
      promotionId: promotion?.promotionId,
      isApplyPromotion: !!promotion,
      unit: product.unit || product.don_vi_DH || "",
      displayRegularPrice: formatPrice(Number(basePrice) || 0),
      displayDiscountedPrice: formatPrice(Number(safeDiscountedPrice) || 0),
      displayDiscountAmount: formatPrice(Number(basePrice) - Number(safeDiscountedPrice)),
      quantity: Number(quantity) || 1,
      crdfd_gtgt: product.crdfd_gtgt ?? 0,
      crdfd_gtgt_value: product.crdfd_gtgt_value ?? 0,
    };

    onAddToCart(productWithPromotion, quantity);
    setSelectedProduct(null);
    handleQuantityChange(product.crdfd_masanpham, quantity);
    handleClose();
  };

  const handleQuantityChange = (productId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, value),
    }));
  };

  const getProductPrice = (product: Products): number => {
    // Ưu tiên lấy giá từ cr1bb_json_gia
    if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
      const gia = product.cr1bb_json_gia[0].crdfd_gia;
      if (gia && !isNaN(Number(gia))) return Number(gia);
    }
    if (product.crdfd_gia && !isNaN(Number(product.crdfd_gia))) return Number(product.crdfd_gia);
    // Nếu là string kiểu 'Giá bán: 930000 đ/Thùng'
    if (typeof product.cr1bb_giaban === 'string') {
      const match = product.cr1bb_giaban.match(/([0-9.]+)/);
      if (match && match[1]) return Number(match[1].replace(/\./g, ''));
    }
    return 0;
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) {
      return "Liên hệ để được báo giá";
    }
    return isNaN(price)
      ? "Liên hệ để được báo giá"
      : `${Math.round(price).toLocaleString()} đ`;
  };

  const getPromotionInfo = (product: Products) => {
    if (!product.promotions || !Array.isArray(product.promotions) || product.promotions.length === 0) return null;
    
    // For bundled products modal, we want to use the promotion with "Mua kèm" in the name
    const bundledPromotion = product.promotions.find(p => p.name?.includes('Mua kèm'));
    if (bundledPromotion) return bundledPromotion;
    
    // If no bundled promotion found, return the first promotion
    return product.promotions[0];
  };

  const getDiscountedPrice = (product: Products, quantity: number) => {
    const price = getProductPrice(product);
    const promotion = getPromotionInfo(product);
    if (!promotion || !price) return null;

    if (promotion.status !== 1) return null;

    const currentDate = new Date();
    if (promotion.startDate) {
      const startDate = new Date(promotion.startDate);
      if (currentDate < startDate) return null;
    }
    if (promotion.endDate) {
      const endDate = new Date(promotion.endDate);
      if (currentDate > endDate) return null;
    }

    // Tính toán theo quantity
    if (promotion.soluongapdungmuc3 && quantity >= promotion.soluongapdungmuc3) {
      if (String(promotion.vn) === '191920001') {
        return Math.max(0, price - Number(promotion.value3));
      } else if (String(promotion.vn).toLowerCase() === 'percent') {
        return Math.round(price * (1 - Number(promotion.value3) / 100));
      }
    } else if (promotion.congdonsoluong && promotion.soluongapdung && quantity >= promotion.soluongapdung) {
      if (String(promotion.vn) === '191920001') {
        return Math.max(0, price - Number(promotion.value2 || promotion.value));
      } else if (String(promotion.vn).toLowerCase() === 'percent') {
        return Math.round(price * (1 - Number(promotion.value2 || promotion.value) / 100));
      }
    } else {
      if (String(promotion.vn) === '191920001') {
        return Math.max(0, price - Number(promotion.value));
      } else if (String(promotion.vn).toLowerCase() === 'percent') {
        return Math.round(price * (1 - Number(promotion.value) / 100));
      }
    }
    return null;
  };

  const formatPromotionValue = (promotion: any) => {
    if (!promotion) return '';
    
    if (String(promotion.vn) === '191920001') {
      return `Giảm ${parseFloat(promotion.value).toLocaleString('vi-VN')}đ`;
    }
    return `Giảm ${promotion.value}%`;
  };

  const getConditionText = (promotion: any, product: Products, quantity: number) => {
    if (!promotion) return '';
    if (promotion.soluongapdungmuc3 && quantity >= promotion.soluongapdungmuc3) {
      return `(Áp dụng cho đơn từ ${promotion.soluongapdungmuc3} ${product.don_vi_DH || 'sản phẩm'})`;
    } else if (promotion.congdonsoluong && promotion.soluongapdung) {
      if (quantity >= promotion.soluongapdung) {
        return `(Áp dụng cho đơn từ ${promotion.soluongapdung} ${product.don_vi_DH || 'sản phẩm'})`;
      } else {
        return `(Giảm thêm khi mua từ ${promotion.soluongapdung} ${product.don_vi_DH || 'sản phẩm'})`;
      }
    }
    return '';
  };

  const getPromotionDisplay = (product: Products) => {
    const promotion = getPromotionInfo(product);
    if (!promotion) return null;

    const discountedPrice = getDiscountedPrice(product, quantities[product.crdfd_masanpham] || 1);
    const originalPrice = getProductPrice(product);

    if (!discountedPrice || discountedPrice >= originalPrice) return null;

    return (
      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>
          Khuyến mãi
        </div>
        <div className="mt-1 text-sm text-red-700">
          <p className="font-medium">{promotion.name}</p>
          <p className="mt-1">{formatPromotionValue(promotion)}</p>
          {promotion.congdonsoluong && promotion.soluongapdung && (
            <p className="text-xs mt-0.5">
              Áp dụng cho đơn từ {promotion.soluongapdung} {product.don_vi_DH || 'sản phẩm'}
            </p>
          )}
          {promotion.conditions && (
            <p className="text-xs mt-0.5">{promotion.conditions}</p>
          )}
          {promotion.productNames && (
            <p className="text-xs mt-0.5">
              Áp dụng cho: {promotion.productNames}
            </p>
          )}
          {promotion.startDate && (
            <p className="text-xs mt-0.5">
              Thời gian: {new Date(promotion.startDate).toLocaleDateString('vi-VN')}
              {promotion.endDate ? ` - ${new Date(promotion.endDate).toLocaleDateString('vi-VN')}` : ''}
            </p>
          )}
          <div className="mt-1.5">
            <p className="text-xs line-through text-gray-500">{formatPrice(originalPrice)}</p>
            <p className="text-sm font-bold text-red-600">{formatPrice(discountedPrice)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className={`relative bg-white rounded-2xl shadow-2xl w-[95%] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-white to-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Sản phẩm mua kèm
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Chọn sản phẩm mua kèm để được giá tốt nhất</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-gray-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600">Đang tải sản phẩm...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm text-gray-600">Không có sản phẩm mua kèm</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const quantity = quantities[product.crdfd_masanpham] || 1;
                const promotion = getPromotionInfo(product);
                const discountedPrice = getDiscountedPrice(product, quantity);
                const originalPrice = getProductPrice(product);
                const conditionText = getConditionText(promotion, product, quantity);
                return (
                  <div
                    key={product.crdfd_masanpham}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden group"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                      {(product.cr1bb_imageurlproduct || product.cr1bb_imageurl) ? (
                        <img
                          src={product.cr1bb_imageurlproduct || product.cr1bb_imageurl}
                          alt={product.crdfd_name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm lg:text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.crdfd_name}
                        </h4>
                        <div className="text-xs text-gray-500 mt-1">
                          {product.crdfd_thuonghieu && (
                            <p className="mb-0.5">
                              <span className="font-medium">Thương hiệu:</span> {product.crdfd_thuonghieu}
                            </p>
                          )}
                          {product.crdfd_quycach && (
                            <p className="mb-0.5">
                              <span className="font-medium">Quy cách:</span> {product.crdfd_quycach}
                            </p>
                          )}
                        </div>

                        {/* Promotion Display */}
                        {(!promotion || !discountedPrice || discountedPrice >= originalPrice) ? (
                          <div className="mt-2">
                            <span className="text-base font-bold text-blue-600">{formatPrice(originalPrice)}</span>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <div className="promotion-info mb-1.5 p-1.5 bg-blue-50 rounded text-xs text-gray-700">
                              <span className="font-semibold">KM:</span> {promotion.name || ""}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs line-through text-gray-400">{formatPrice(originalPrice)}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-600 rounded">
                                {formatPromotionValue(promotion)}
                              </span>
                            </div>
                            <span className="text-base font-bold text-green-600">{formatPrice(discountedPrice)}</span>
                            {conditionText && (
                              <p className="text-xs text-gray-500 mt-0.5">{conditionText}</p>
                            )}
                          </div>
                        )}

                        {/* Quantity Controls */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button
                              onClick={() => handleQuantityChange(product.crdfd_masanpham, quantity - 1)}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => handleQuantityChange(product.crdfd_masanpham, parseInt(e.target.value) || 1)}
                              className="w-12 text-center border-x border-gray-300 py-1 text-sm focus:outline-none"
                            />
                            <button
                              onClick={() => handleQuantityChange(product.crdfd_masanpham, quantity + 1)}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => handleAddToCart(product, quantity)}
                            disabled={!getProductPrice(product)}
                            className={`flex-1 px-3 py-1.5 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 text-sm shadow-sm hover:shadow-md ${
                              !getProductPrice(product)
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                            </svg>
                            Thêm
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 lg:p-4 border-t border-gray-200 bg-white">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundledProductsModal; 