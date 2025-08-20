export interface CircuitBreakerConfig {
    expectedErrors?: string[];
    failureThreshold: number;
    monitoringPeriod: number;
    recoveryTimeout: number;
}

export interface CircuitBreakerMetrics {
    averageResponseTime: number;
    circuitOpenCount: number;
    failedRequests: number;
    successfulRequests: number;
    totalRequests: number;
}

export interface CircuitBreakerState {
    failureCount: number;
    lastFailureTime?: Date;
    nextAttempt: Date;
    state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
}
