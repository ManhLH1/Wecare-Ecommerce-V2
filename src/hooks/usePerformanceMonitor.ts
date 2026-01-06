import { useEffect, useRef } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const metricsRef = useRef<PerformanceMetric[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  const startMetric = (name: string) => {
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
    };
    metricsRef.current.push(metric);
    return metric;
  };

  const endMetric = (name: string) => {
    const metric = metricsRef.current.find(m => m.name === name && !m.endTime);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;

      // Log performance in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${componentName}] ${name}: ${metric.duration}ms`);
      }
    }
  };

  const logTotalLoadTime = () => {
    const totalTime = Date.now() - startTimeRef.current;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Total load time: ${totalTime}ms`);
      console.table(metricsRef.current.filter(m => m.duration));
    }
  };

  useEffect(() => {
    return () => {
      logTotalLoadTime();
    };
  }, []);

  return { startMetric, endMetric, logTotalLoadTime };
};
