/**
 * Circuit Breaker Utility
 * Prevents cascading failures when external services are slow or failing
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitConfig {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenMaxRequests: number;
}

const defaultConfig: CircuitConfig = {
    failureThreshold: 5,        // Open circuit after 5 failures
    resetTimeout: 30000,        // Stay open for 30 seconds
    halfOpenMaxRequests: 2,     // Allow 2 requests in half-open state
};

class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failures = 0;
    private lastFailureTime = 0;
    private halfOpenRequests = 0;
    private config: CircuitConfig;
    private name: string;

    constructor(name: string, config: Partial<CircuitConfig> = {}) {
        this.name = name;
        this.config = { ...defaultConfig, ...config };
    }

    async execute<T>(action: () => Promise<T>, fallback?: () => T): Promise<T> {
        if (this.state === 'OPEN') {
            const now = Date.now();
            if (now - this.lastFailureTime > this.config.resetTimeout) {
                this.state = 'HALF_OPEN';
                this.halfOpenRequests = 0;
                console.log(`[CircuitBreaker:${this.name}] State changed to HALF_OPEN`);
            } else {
                if (fallback) return fallback();
                throw new Error(`Circuit breaker [${this.name}] is OPEN`);
            }
        }

        if (this.state === 'HALF_OPEN') {
            if (this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
                if (fallback) return fallback();
                throw new Error(`Circuit breaker [${this.name}] is HALF_OPEN (max requests reached)`);
            }
            this.halfOpenRequests++;
        }

        try {
            const result = await action();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            if (fallback) return fallback();
            throw error;
        }
    }

    private onSuccess() {
        this.failures = 0;
        if (this.state !== 'CLOSED') {
            this.state = 'CLOSED';
            console.log(`[CircuitBreaker:${this.name}] State changed to CLOSED`);
        }
    }

    private onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
            this.state = 'OPEN';
            console.error(`[CircuitBreaker:${this.name}] State changed to OPEN - threshold reached`);
        } else if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            console.error(`[CircuitBreaker:${this.name}] State changed back to OPEN after HALF_OPEN failure`);
        }
    }

    getState() {
        return this.state;
    }
}

// Registry for named circuit breakers
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, config?: Partial<CircuitConfig>) {
    if (!breakers.has(name)) {
        breakers.set(name, new CircuitBreaker(name, config));
    }
    return breakers.get(name)!;
}
