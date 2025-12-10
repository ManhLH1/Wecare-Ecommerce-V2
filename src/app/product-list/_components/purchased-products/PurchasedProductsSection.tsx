import React from 'react';
import PurchasedProductsList from './purchased-products-list';
import { getItem } from "@/utils/SecureStorage";

interface PurchasedProductsSectionProps {
  onAddToCart: (product: any, quantity: number) => void;
}

const PurchasedProductsSection: React.FC<PurchasedProductsSectionProps> = ({ onAddToCart }) => {
  const customerId = getItem("id");
  const type = getItem("type");
  
  if (!customerId || type !== "customer") {
    return null;
  }

  return (
    <div className="purchased-products-section">
      <PurchasedProductsList products={[]} onAddToCart={onAddToCart} />
    </div>
  );
};

export default PurchasedProductsSection; 