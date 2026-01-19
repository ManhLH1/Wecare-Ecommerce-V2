// Smart data preloader for admin app
// Preloads commonly used data based on user behavior patterns

interface PreloadConfig {
  customerCode?: string;
  region?: string;
  warehouseName?: string;
  vatText?: string;
  preloadTopProducts?: number;
  preloadRecentCustomers?: number;
}

class SmartPreloader {
  private preloadQueue: Map<string, Promise<any>> = new Map();
  private preloadHistory: Set<string> = new Set();
  private maxConcurrentPreloads = 3;

  // Preload top products data
  async preloadTopProducts(config: PreloadConfig): Promise<void> {
    const { customerCode, region, warehouseName, vatText, preloadTopProducts = 5 } = config;

    try {
      // Get top products from localStorage (tracked from user behavior)
      const topProducts = JSON.parse(localStorage.getItem('wecare_top_products') || '[]');

      if (topProducts.length === 0) return;

      // Create batch requests for top products
      const requests = topProducts.slice(0, preloadTopProducts).map((productCode: string) => ({
        productCode,
        customerCode,
        region,
        warehouseName,
        isVatOrder: vatText?.toLowerCase().includes('có vat'),
      }));

      // Execute batch preload
      const preloadKey = `top-products-${customerCode}-${region}`;
      if (this.preloadHistory.has(preloadKey)) return;

      this.preloadHistory.add(preloadKey);

      const promise = fetch('/api/admin-app/batch-product-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      }).then(res => res.json());

      this.preloadQueue.set(preloadKey, promise);

      // Clean up after completion
      promise.finally(() => {
        this.preloadQueue.delete(preloadKey);
      });

    } catch (error) {
      console.warn('Smart preload failed:', error);
    }
  }

  // Preload customer data
  async preloadCustomerData(customerIds: string[]): Promise<void> {
    if (customerIds.length === 0) return;

    const preloadKey = `customers-${customerIds.join(',')}`;
    if (this.preloadHistory.has(preloadKey)) return;

    try {
      this.preloadHistory.add(preloadKey);

      const promise = fetch('/api/admin-app/customers-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds }),
      }).then(res => res.json());

      this.preloadQueue.set(preloadKey, promise);
      promise.finally(() => {
        this.preloadQueue.delete(preloadKey);
      });

    } catch (error) {
      console.warn('Customer preload failed:', error);
    }
  }

  // Track user behavior for better preloading
  trackProductUsage(productCode: string): void {
    try {
      const usage = JSON.parse(localStorage.getItem('wecare_product_usage') || '{}');
      usage[productCode] = (usage[productCode] || 0) + 1;

      // Keep only top 20 products
      const sorted = Object.entries(usage)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 20);

      localStorage.setItem('wecare_product_usage', JSON.stringify(Object.fromEntries(sorted)));
      localStorage.setItem('wecare_top_products', JSON.stringify(sorted.map(([code]) => code)));
    } catch (error) {
      console.warn('Failed to track product usage:', error);
    }
  }

  // Get preloaded data if available
  async getPreloadedData(key: string): Promise<any> {
    const promise = this.preloadQueue.get(key);
    if (promise) {
      try {
        return await promise;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Clear all preloads (useful when switching contexts)
  clearPreloads(): void {
    this.preloadQueue.clear();
    this.preloadHistory.clear();
  }

  // Get preload stats for monitoring
  getStats() {
    return {
      activePreloads: this.preloadQueue.size,
      totalPreloaded: this.preloadHistory.size,
      maxConcurrent: this.maxConcurrentPreloads,
    };
  }
}

// Global instance
export const smartPreloader = new SmartPreloader();

// Auto-start preloading when app initializes
if (typeof window !== 'undefined') {
  // Preload data when user is active
  let preloadTimeout: NodeJS.Timeout;

  const startSmartPreload = () => {
    if (preloadTimeout) clearTimeout(preloadTimeout);

    preloadTimeout = setTimeout(async () => {
      const customerCode = localStorage.getItem('last_customer_code');
      const region = localStorage.getItem('last_region');
      const warehouse = localStorage.getItem('last_warehouse');
      const vatText = localStorage.getItem('last_vat_text');

      if (customerCode) {
        await smartPreloader.preloadTopProducts({
          customerCode,
          region: region || undefined,
          warehouseName: warehouse || undefined,
          vatText: vatText || undefined,
          preloadTopProducts: 5,
        });
      }
    }, 2000); // Wait 2 seconds after user activity
  };

  // Track user activity
  ['click', 'keydown', 'scroll'].forEach(event => {
    document.addEventListener(event, startSmartPreload, { passive: true });
  });

  // Expose for debugging
  (window as any).smartPreloader = smartPreloader;
}