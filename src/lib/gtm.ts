// Google Tag Manager Configuration
export const GTM_ID = 'GTM-NG7R2R2L';
export const GA4_ID = 'G-8Z0G457R7M';

// Khai báo kiểu dữ liệu cho dataLayer
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Hàm push event vào dataLayer
export const pushToDataLayer = (event: any) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(event);
  }
};

// Các event tracking phổ biến cho e-commerce
export const trackEvent = {
  // Track page view
  pageView: (pagePath: string, pageTitle: string) => {
    pushToDataLayer({
      event: 'page_view',
      page_path: pagePath,
      page_title: pageTitle,
    });
  },

  // Track product view
  productView: (productId: string, productName: string, category: string, price: number) => {
    pushToDataLayer({
      event: 'view_item',
      currency: 'VND',
      value: price,
      items: [{
        item_id: productId,
        item_name: productName,
        item_category: category,
        price: price,
        quantity: 1
      }]
    });
  },

  // Track add to cart
  addToCart: (productId: string, productName: string, category: string, price: number, quantity: number = 1) => {
    pushToDataLayer({
      event: 'add_to_cart',
      currency: 'VND',
      value: price * quantity,
      items: [{
        item_id: productId,
        item_name: productName,
        item_category: category,
        price: price,
        quantity: quantity
      }]
    });
  },

  // Track purchase
  purchase: (transactionId: string, value: number, items: any[]) => {
    pushToDataLayer({
      event: 'purchase',
      transaction_id: transactionId,
      currency: 'VND',
      value: value,
      items: items
    });
  },

  // Track search
  search: (searchTerm: string) => {
    pushToDataLayer({
      event: 'search',
      search_term: searchTerm
    });
  },

  // Track custom event
  custom: (eventName: string, parameters: any = {}) => {
    pushToDataLayer({
      event: eventName,
      ...parameters
    });
  }
};

// Hàm khởi tạo GTM
export const initializeGTM = () => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
};
