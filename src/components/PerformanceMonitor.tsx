'use client';

import React, { useEffect, useState } from 'react';

interface CacheStats {
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  hitRate: number;
  longCacheSize: number;
  shortCacheSize: number;
}

interface PerformanceMetrics {
  cacheStats: CacheStats | null;
  renderTime: number;
  memoryUsage?: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheStats: null,
    renderTime: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const fetchCacheStats = async () => {
      try {
        const response = await fetch('/api/admin-app/cache-stats');
        if (response.ok) {
          const data = await response.json();
          setMetrics(prev => ({ ...prev, cacheStats: data.data }));
        }
      } catch (error) {
        console.warn('Failed to fetch cache stats:', error);
      }
    };

    // Fetch stats every 30 seconds
    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, 30000);

    // Track render performance
    const startTime = performance.now();
    const endTime = performance.now();
    setMetrics(prev => ({ ...prev, renderTime: endTime - startTime }));

    return () => clearInterval(interval);
  }, []);

  // Only render in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
        cursor: 'pointer',
      }}
      onClick={() => setIsVisible(!isVisible)}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🚀 Performance Monitor
      </div>

      {isVisible && (
        <>
          {metrics.cacheStats && (
            <div style={{ marginBottom: '10px' }}>
              <div><strong>Cache Stats:</strong></div>
              <div>Hits: {metrics.cacheStats.cacheHits}</div>
              <div>Misses: {metrics.cacheStats.cacheMisses}</div>
              <div>Hit Rate: {metrics.cacheStats.hitRate}%</div>
              <div>Long Cache: {metrics.cacheStats.longCacheSize}/500</div>
              <div>Short Cache: {metrics.cacheStats.shortCacheSize}/200</div>
            </div>
          )}

          <div>
            <div>Render Time: {metrics.renderTime.toFixed(2)}ms</div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceMonitor;
















