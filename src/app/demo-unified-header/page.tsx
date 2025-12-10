"use client";

import React, { useState } from 'react';
import UnifiedHeaderHero from '@/components/UnifiedHeaderHero';

export default function DemoUnifiedHeader() {
  const [cartItemsCount, setCartItemsCount] = useState(0);

  const handleSearch = (term: string, type?: string) => {
    console.log('Search:', term, type);
  };

  const handleCartClick = () => {
    console.log('Cart clicked');
  };

  return (
    <div className="min-h-screen">
      <UnifiedHeaderHero
        cartItemsCount={cartItemsCount}
        onSearch={handleSearch}
        onCartClick={handleCartClick}
        backgroundImage="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80"
        heroTitle="WECARE - Siêu thị công nghiệp cho doanh nghiệp"
        heroSubtitle="giải pháp mua sắm vật tư & thiết bị cho doanh nghiệp"
        searchPlaceholder="Tìm kiếm sản phẩm, ngành hàng, thương hiệu..."
        quickSearchTags={["iphones 15 pro max", "gun", "women's intimates", "quần áo"]}
      />
      
      {/* Demo content below */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Demo Unified Header & Hero
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto">
            This demonstrates the unified header and hero section with a single background image covering both areas, 
            similar to the Alibaba.com example. The background image spans the entire header and hero area with a dark overlay 
            for better text readability.
          </p>
        </div>
      </div>
    </div>
  );
}
