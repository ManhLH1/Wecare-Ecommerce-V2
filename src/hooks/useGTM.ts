'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent, pushToDataLayer } from '@/lib/gtm';

export const useGTM = () => {
  const pathname = usePathname();

  // Tự động track page view khi route thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined' && pathname) {
      trackEvent.pageView(pathname, document.title);
    }
  }, [pathname]);

  return {
    trackEvent,
    pushToDataLayer,
  };
};

// Hook riêng cho tracking e-commerce events
export const useEcommerceTracking = () => {
  const { trackEvent } = useGTM();

  const trackProductView = (productId: string, productName: string, category: string, price: number) => {
    trackEvent.productView(productId, productName, category, price);
  };

  const trackAddToCart = (productId: string, productName: string, category: string, price: number, quantity: number = 1) => {
    trackEvent.addToCart(productId, productName, category, price, quantity);
  };

  const trackPurchase = (transactionId: string, value: number, items: any[]) => {
    trackEvent.purchase(transactionId, value, items);
  };

  const trackSearch = (searchTerm: string) => {
    trackEvent.search(searchTerm);
  };

  return {
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackSearch,
  };
};
