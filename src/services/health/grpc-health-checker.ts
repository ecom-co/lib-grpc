import { Injectable, Logger } from '@nestjs/common';

import { HealthChecker, HealthCheckConfig, HealthStatus, HealthCheck } from '../interfaces';

@Injectable()
export class GrpcHealthChecker implements HealthChecker {
    private readonly logger = new Logger(GrpcHealthChecker.name);
    private readonly monitoringJobs = new Map<string, NodeJS.Timeout>();
    private readonly healthStatus = new Map<string, HealthStatus>();

    check = (serviceId: string): Promise<HealthStatus> => {
        try {
            // Simulate health check - in real implementation, this would make actual gRPC calls
            const checks: HealthCheck[] = [
                {
                    name: 'connectivity',
                    status: 'passing',
                    output: 'Service is reachable',
                },
                {
                    name: 'response_time',
                    status: 'passing',
                    output: 'Response time within acceptable limits',
                },
            ];

            const healthStatus: HealthStatus = {
                status: 'healthy',
                checks,
                lastChecked: new Date(),
            };

            this.healthStatus.set(serviceId, healthStatus);
            return Promise.resolve(healthStatus);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const checks: HealthCheck[] = [
                {
                    name: 'connectivity',
                    status: 'critical',
                    output: `Health check failed: ${errorMessage}`,
                },
            ];

            const healthStatus: HealthStatus = {
                status: 'unhealthy',
                checks,
                lastChecked: new Date(),
            };

            this.healthStatus.set(serviceId, healthStatus);
            this.logger.error(`Health check failed for service ${serviceId}: ${errorMessage}`);
            return Promise.resolve(healthStatus);
        }
    };

    startMonitoring = (serviceId: string, config: HealthCheckConfig): void => {
        // Clear existing monitoring if any
        this.stopMonitoring(serviceId);

        this.logger.log(`Starting health monitoring for service: ${serviceId}`);

        const job = setInterval(() => {
            this.performHealthCheck(serviceId, config).catch((error) => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Health monitoring error for ${serviceId}: ${errorMessage}`);
            });
        }, config.interval);

        this.monitoringJobs.set(serviceId, job);

        // Perform initial health check
        this.performHealthCheck(serviceId, config).catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Initial health check error for ${serviceId}: ${errorMessage}`);
        });
    };

    stopMonitoring = (serviceId: string): void => {
        const job = this.monitoringJobs.get(serviceId);
        if (job) {
            clearInterval(job);
            this.monitoringJobs.delete(serviceId);
            this.logger.log(`Stopped health monitoring for service: ${serviceId}`);
        }
    };

    getHealthStatus(serviceId: string): HealthStatus | undefined {
        return this.healthStatus.get(serviceId);
    }

    getAllHealthStatus(): Map<string, HealthStatus> {
        return new Map(this.healthStatus);
    }

    private async performHealthCheck(serviceId: string, config: HealthCheckConfig): Promise<void> {
        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt <= config.retries) {
            try {
                await this.executeHealthCheck(serviceId, config);
                return; // Success, exit retry loop
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                attempt++;

                if (attempt <= config.retries) {
                    this.logger.warn(`Health check attempt ${attempt} failed for ${serviceId}, retrying...`);
                    await this.delay(1000); // Wait 1 second before retry
                }
            }
        }

        // All retries failed
        if (lastError) {
            const checks: HealthCheck[] = [
                {
                    name: 'connectivity',
                    status: 'critical',
                    output: `Health check failed after ${config.retries} retries: ${lastError.message}`,
                },
            ];

            this.healthStatus.set(serviceId, {
                status: 'unhealthy',
                checks,
                lastChecked: new Date(),
            });
        }
    }

    private async executeHealthCheck(serviceId: string, config: HealthCheckConfig): Promise<void> {
        const startTime = Date.now();

        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Health check timeout after ${config.timeout}ms`));
            }, config.timeout);

            // Simulate actual health check
            Promise.resolve()
                .then(() => {
                    // In real implementation, this would make gRPC health check call
                    const responseTime = Date.now() - startTime;
                    const isHealthy = Math.random() > 0.1; // 90% success rate for demo

                    if (!isHealthy) {
                        throw new Error('Service reported unhealthy status');
                    }

                    const checks: HealthCheck[] = [
                        {
                            name: 'connectivity',
                            status: 'passing',
                            output: 'Service is reachable',
                        },
                        {
                            name: 'response_time',
                            status: responseTime > 5000 ? 'warning' : 'passing',
                            output: `Response time: ${responseTime}ms`,
                        },
                    ];

                    this.healthStatus.set(serviceId, {
                        status: 'healthy',
                        checks,
                        lastChecked: new Date(),
                    });

                    clearTimeout(timer);
                    resolve();
                })
                .catch((error) => {
                    clearTimeout(timer);
                    reject(error instanceof Error ? error : new Error(String(error)));
                });
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Cleanup method
    destroy(): void {
        for (const [serviceId] of this.monitoringJobs) {
            this.stopMonitoring(serviceId);
        }
        this.healthStatus.clear();
        this.logger.log('Health checker destroyed');
    }
}
