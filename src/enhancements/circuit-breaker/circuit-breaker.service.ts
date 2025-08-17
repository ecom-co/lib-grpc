import { Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerConfig, CircuitBreakerMetrics, CircuitBreakerState } from './interfaces';

@Injectable()
export class CircuitBreakerService {
    private readonly logger = new Logger(CircuitBreakerService.name);
    private state: CircuitBreakerState;
    private readonly config: CircuitBreakerConfig;
    private metrics: CircuitBreakerMetrics;
    private readonly requests: Array<{ timestamp: Date; success: boolean; responseTime: number }> = [];

    constructor(config: CircuitBreakerConfig) {
        this.config = config;
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            nextAttempt: new Date(),
        };
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            circuitOpenCount: 0,
            averageResponseTime: 0,
        };
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

    getState(): CircuitBreakerState {
        return { ...this.state };
    }

    getMetrics(): CircuitBreakerMetrics {
        return { ...this.metrics };
    }

    reset(): void {
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            nextAttempt: new Date(),
        };
        this.logger.log('🔄 Circuit breaker reset to CLOSED');
    }

    private recordSuccess(responseTime: number): void {
        this.requests.push({
            timestamp: new Date(),
            success: true,
            responseTime,
        });
        this.metrics.successfulRequests++;
        this.updateAverageResponseTime();
    }

    private recordFailure(error: Error, responseTime: number): void {
        this.requests.push({
            timestamp: new Date(),
            success: false,
            responseTime,
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
                this.logger.warn(`🔴 Circuit breaker OPENED after ${this.state.failureCount} failures`);
            }
        }
    }

    private updateAverageResponseTime(): void {
        const recentRequests = this.getRecentRequests();
        if (recentRequests.length > 0) {
            const totalResponseTime = recentRequests.reduce((sum, req) => sum + req.responseTime, 0);
            this.metrics.averageResponseTime = totalResponseTime / recentRequests.length;
        }
    }

    private getRecentRequests(): Array<{ timestamp: Date; success: boolean; responseTime: number }> {
        const cutoffTime = new Date(Date.now() - this.config.monitoringPeriod);
        return this.requests.filter((req) => req.timestamp > cutoffTime);
    }
}
