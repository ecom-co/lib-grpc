import { Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerConfig, CircuitBreakerMetrics, CircuitBreakerState } from './interfaces';

@Injectable()
export class CircuitBreakerService {
    private state: CircuitBreakerState;
    private readonly config: CircuitBreakerConfig;
    private readonly logger = new Logger(CircuitBreakerService.name);
    private metrics: CircuitBreakerMetrics;
    private readonly requests: Array<{ responseTime: number; success: boolean; timestamp: Date }> = [];

    constructor(config: CircuitBreakerConfig) {
        this.config = config;
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            nextAttempt: new Date(),
        };
        this.metrics = {
            averageResponseTime: 0,
            circuitOpenCount: 0,
            failedRequests: 0,
            successfulRequests: 0,
            totalRequests: 0,
        };
    }

    getMetrics(): CircuitBreakerMetrics {
        return { ...this.metrics };
    }

    private getRecentRequests(): Array<{ responseTime: number; success: boolean; timestamp: Date }> {
        const cutoffTime = new Date(Date.now() - this.config.monitoringPeriod);

        return this.requests.filter((req) => req.timestamp > cutoffTime);
    }

    getState(): CircuitBreakerState {
        return { ...this.state };
    }

    private updateAverageResponseTime(): void {
        const recentRequests = this.getRecentRequests();

        if (recentRequests.length > 0) {
            const totalResponseTime = recentRequests.reduce((sum, req) => sum + req.responseTime, 0);

            this.metrics.averageResponseTime = totalResponseTime / recentRequests.length;
        }
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state.state === 'OPEN') {
            if (Date.now() < this.state.nextAttempt.getTime()) {
                throw new Error('Circuit breaker is OPEN - requests blocked');
            }

            this.state.state = 'HALF_OPEN';
        }

        const startTime = Date.now();

        this.metrics.totalRequests++;

        try {
            const result = await operation();
            const responseTime = Date.now() - startTime;

            this.recordSuccess(responseTime);

            if (this.state.state === 'HALF_OPEN') {
                this.state.state = 'CLOSED';
                this.state.failureCount = 0;
            }

            return result;
        } catch (error) {
            const responseTime = Date.now() - startTime;

            this.recordFailure(error as Error, responseTime);
            throw error;
        }
    }

    reset(): void {
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            nextAttempt: new Date(),
        };
        this.logger.log('🔄 Circuit breaker reset to CLOSED');
    }

    private recordFailure(error: Error, responseTime: number): void {
        this.requests.push({
            responseTime,
            success: false,
            timestamp: new Date(),
        });
        this.metrics.failedRequests++;
        this.updateAverageResponseTime();

        const isExpectedError = this.config.expectedErrors?.some((expectedError) =>
            error.message.includes(expectedError),
        );

        if (isExpectedError) {
            this.state.failureCount++;
            this.state.lastFailureTime = new Date();

            if (this.state.failureCount >= this.config.failureThreshold) {
                this.state.state = 'OPEN';
                this.state.nextAttempt = new Date(Date.now() + this.config.recoveryTimeout);
                this.metrics.circuitOpenCount++;
                this.logger.warn(`Circuit breaker OPENED after ${this.state.failureCount} failures`);
            }
        }
    }

    private recordSuccess(responseTime: number): void {
        this.requests.push({
            responseTime,
            success: true,
            timestamp: new Date(),
        });
        this.metrics.successfulRequests++;
        this.updateAverageResponseTime();
    }
}
