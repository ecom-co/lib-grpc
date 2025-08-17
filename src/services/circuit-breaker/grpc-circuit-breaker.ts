import { Injectable, Logger } from '@nestjs/common';

import { CircuitBreaker, CircuitBreakerConfig, CircuitBreakerState, CircuitBreakerMetrics } from '../interfaces';

@Injectable()
export class GrpcCircuitBreaker implements CircuitBreaker {
    private readonly logger = new Logger(GrpcCircuitBreaker.name);
    private state: CircuitBreakerState;
    private readonly config: CircuitBreakerConfig;
    private metrics: CircuitBreakerMetrics;
    private readonly requests: Array<{ timestamp: Date; success: boolean; responseTime: number }> = [];

    constructor(config: CircuitBreakerConfig) {
        const defaultConfig: CircuitBreakerConfig = {
            failureThreshold: 5,
            recoveryTimeout: 30000,
            monitoringPeriod: 60000,
            expectedErrors: ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'INTERNAL'],
        };

        this.config = { ...defaultConfig, ...config };

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

        this.startMetricsCleanup();
    }

    execute = async <T>(operation: () => Promise<T>): Promise<T> => {
        if (this.state.state === 'OPEN') {
            if (Date.now() < this.state.nextAttempt.getTime()) {
                throw new Error('Circuit breaker is OPEN - requests are not allowed');
            }
            this.state.state = 'HALF_OPEN';
            this.logger.log('Circuit breaker moved to HALF_OPEN state');
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
                this.logger.log('Circuit breaker moved to CLOSED state');
            }

            return result;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.recordFailure(error as Error, responseTime);
            throw error;
        }
    };

    getState = (): CircuitBreakerState => ({ ...this.state });

    reset = (): void => {
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            nextAttempt: new Date(),
        };
        this.logger.log('Circuit breaker reset to CLOSED state');
    };

    getMetrics(): CircuitBreakerMetrics {
        return { ...this.metrics };
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
                this.logger.warn(`Circuit breaker opened after ${this.state.failureCount} failures`);
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

    private startMetricsCleanup(): void {
        setInterval(() => {
            const cutoffTime = new Date(Date.now() - this.config.monitoringPeriod);
            const originalLength = this.requests.length;

            // Remove old requests
            for (let i = this.requests.length - 1; i >= 0; i--) {
                if (this.requests[i].timestamp < cutoffTime) {
                    this.requests.splice(i, 1);
                }
            }

            if (this.requests.length !== originalLength) {
                this.logger.debug(`Cleaned up ${originalLength - this.requests.length} old request records`);
            }
        }, this.config.monitoringPeriod);
    }
}
