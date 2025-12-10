import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from 'next/image';

interface PriceInfo {
  crdfd_gia: number;
  crdfd_giatheovc: number;
  crdfd_nhomoituongname: string;
  crdfd_onvichuantext: string;
}

interface Product {
  productId: string;
  productName: string;
  fullName: string;
  productCode: string;
  brand?: string;
  specification?: string;
  material?: string;
  surfaceFinish?: string;
  price?: number;
  vat?: number;
  imageUrl?: string;
  groupName?: string;
  groupCode?: string;
  unitName?: string;
  standardUnit?: string;
  priceJson?: string;
}

interface PromotionProductsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  groupCode: string;
  groupName: string;
}

const DISCOUNT_PERCENTAGE = 3;

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN').format(price);
};

const calculateDiscountedPrice = (price: number) => {
  return Math.round(price * (1 - DISCOUNT_PERCENTAGE / 100));
};

const PromotionProductsPopup: React.FC<PromotionProductsPopupProps> = ({
  isOpen,
  onClose,
  groupCode,
  groupName,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isOpen || !groupCode) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`/api/getPromotionProductsByGroup?groupCode=${groupCode}`);
        setProducts(response.data.products);
      } catch (err) {
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen, groupCode]);

  const getShopPrice = (priceJson?: string): { price: number; unit: string } | null => {
    if (!priceJson) return null;
    
    try {
      const prices: any[] = JSON.parse(priceJson);
      const shopPrice = prices.find(p => p.crdfd_nhomoituongname === "Shop");
      if (!shopPrice) return null;
      
      return {
        price: shopPrice.crdfd_gia,
        unit: shopPrice.crdfd_onvichuan || shopPrice.crdfd_onvichuantext || ''
      };
    } catch (err) {
      console.error('Error parsing price JSON:', err);
      return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-0 rounded-3xl shadow-2xl border border-blue-200 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50">
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-white/80 z-10 rounded-t-3xl">
          <DialogTitle className="flex items-center gap-3">
            <span className="text-blue-600 text-2xl">📦</span>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-blue-700 tracking-wide">{groupName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{products.length} sản phẩm</span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">-{DISCOUNT_PERCENTAGE}%</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/70">
            <div className="flex space-x-2 mb-4">
              <span className="inline-block w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.32s]"></span>
              <span className="inline-block w-4 h-4 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.16s]"></span>
              <span className="inline-block w-4 h-4 bg-blue-300 rounded-full animate-bounce"></span>
            </div>
            <span className="text-base font-semibold text-blue-700">Đang tải sản phẩm...</span>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center p-3 bg-red-50 mx-3 my-2 rounded text-xs">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const priceInfo = getShopPrice(product.priceJson);
                const originalPrice = priceInfo?.price || 0;
                const discountedPrice = calculateDiscountedPrice(originalPrice);
                return (
                  <div
                    key={product.productId}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group hover:border-blue-200 p-4 flex flex-col justify-between min-h-[260px]"
                  >
                    <div className="aspect-square relative bg-gray-50 rounded-xl mb-3 flex items-center justify-center">
                      <Image
                        src={/via\.placeholder\.com/i.test(product.imageUrl || '') ? '/placeholder-product.jpg' : (product.imageUrl || '/placeholder-product.jpg')}
                        alt={product.productName}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-bold text-base text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 transition-colors">
                        {product.productName}
                      </h3>
                      <div className="space-y-0.5 mb-2 text-xs text-gray-500">
                        {product.productCode && (
                          <div>Mã SP: <span className="font-medium text-gray-700">{product.productCode}</span></div>
                        )}
                        {product.brand && (
                          <div>Thương hiệu: <span className="font-medium text-gray-700">{product.brand}</span></div>
                        )}
                        {product.specification && (
                          <div>Quy cách: <span className="font-medium text-gray-700">{product.specification}</span></div>
                        )}
                        {product.material && (
                          <div>Chất liệu: <span className="font-medium text-gray-700">{product.material}</span></div>
                        )}
                        {product.surfaceFinish && (
                          <div>Hoàn thiện: <span className="font-medium text-gray-700">{product.surfaceFinish}</span></div>
                        )}
                      </div>
                      {priceInfo && (
                        <div className="flex flex-row items-center justify-between gap-4 mb-3 mt-2 w-full">
                          <div className="flex flex-col items-start min-w-[70px]">
                            <span className="text-2xl font-extrabold text-red-600 leading-tight drop-shadow-sm">{formatPrice(discountedPrice)}đ</span>
                            <span className="text-xs text-gray-400 line-through mt-0.5">{formatPrice(originalPrice)}đ</span>
                          </div>
                          <div className="flex flex-col items-center min-w-[60px]">
                            <span className="text-2xl mb-0.5 text-yellow-400">★</span>
                            <span className="text-xs font-semibold text-gray-700">
                              {priceInfo?.unit ? `Giá/ ${priceInfo.unit}` : 'Giá/ ---'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PromotionProductsPopup; 