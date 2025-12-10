import React from 'react';
import TopProductsList from './top-products-list';

interface TopProductsSectionProps {
  onAddToCart: (product: any, quantity: number) => void;
}

const TopProductsSection: React.FC<TopProductsSectionProps> = ({ onAddToCart }) => {
  return (
    <div className="top-products-section">
      <TopProductsList products={[]} onAddToCart={onAddToCart} />
    </div>
  );
};

export default TopProductsSection; 