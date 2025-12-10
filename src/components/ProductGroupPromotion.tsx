import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { IoMdClose } from 'react-icons/io';
import Loading from './loading';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  fullName: string;
  code: string;
  groupId: string;
  groupName: string;
  price: number;
  vat: number;
  imageUrl: string;
  brand: string;
  specification: string;
  material: string;
  finish: string;
}

interface ProductGroupPromotionProps {
  groupCode: string;
  groupName: string;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

const ProductGroupPromotion: React.FC<ProductGroupPromotionProps> = ({
  groupCode,
  groupName,
  onClose,
  onAddToCart
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/getProductsByGroupCode?groupCode=${groupCode}`);
        setProducts(response.data.products);
      } catch (err) {
        setError('Failed to load products');
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [groupCode]);

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle className="flex justify-between items-center">
        <span>Products in {groupName}</span>
        <IconButton onClick={onClose} size="small">
          <IoMdClose />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="text-red-500 text-center p-4">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {products.map((product) => (
              <div key={product.id} className="border rounded-lg p-4 shadow-sm">
                {product.imageUrl && (
                  <div className="w-full h-48 mb-4 relative">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      priority={false}
                    />
                  </div>
                )}
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-2">{product.fullName}</p>
                <p className="text-sm text-gray-500 mb-2">Code: {product.code}</p>
                <p className="text-sm text-gray-500 mb-2">Brand: {product.brand}</p>
                <p className="text-sm text-gray-500 mb-2">Specification: {product.specification}</p>
                <p className="text-sm text-gray-500 mb-2">Material: {product.material}</p>
                <p className="text-sm text-gray-500 mb-2">Finish: {product.finish}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-bold text-lg">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(product.price)}
                  </span>
                  <button
                    onClick={() => onAddToCart(product, 1)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductGroupPromotion; 