export interface CircuitBreakerConfig {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
    expectedErrors?: string[];
}

export interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    nextAttempt: Date;
    lastFailureTime?: Date;
}

export interface CircuitBreakerMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    circuitOpenCount: number;
    averageResponseTime: number;
}
