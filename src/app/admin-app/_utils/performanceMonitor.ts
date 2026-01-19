/**
 * Performance Monitoring Utility
 * Tracks API response times and component render performance
 */

interface PerformanceLog {
    name: string;
    duration: number;
    type: 'api' | 'render' | 'interaction';
    timestamp: number;
    metadata?: any;
}

const logs: PerformanceLog[] = [];
const MAX_LOGS = 100;

export const performanceMonitor = {
    /**
     * Start timing an operation
     */
    start: (name: string) => {
        if (typeof window === 'undefined') return () => 0;
        const startMark = performance.now();
        return (type: PerformanceLog['type'], metadata?: any) => {
            const duration = performance.now() - startMark;
            const log: PerformanceLog = {
                name,
                duration,
                type,
                timestamp: Date.now(),
                metadata,
            };

            this?.log(log);
            return duration;
        };
    },

    /**
     * Log a performance metric
     */
    log: (log: PerformanceLog) => {
        logs.push(log);
        if (logs.length > MAX_LOGS) logs.shift();

        // In dev mode, log to console if it takes too long
        if (process.env.NODE_ENV === 'development') {
            const threshold = log.type === 'api' ? 1000 : 100;
            if (log.duration > threshold) {
                console.warn(`[Performance] ${log.name} slow (${log.duration.toFixed(2)}ms)`, log.metadata);
            }
        }
    },

    /**
     * Get all logs
     */
    getLogs: () => [...logs],

    /**
     * Clear all logs
     */
    clear: () => {
        logs.length = 0;
    }
};
