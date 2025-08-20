import { Logger } from '@nestjs/common';

export interface MonitorPerformanceOptions {
    includeMemory?: boolean;
    logger?: Logger;
    threshold?: number; // ms
}

export interface PerformanceMetrics {
    duration: number;
    memory?: {
        external: number;
        heapTotal: number;
        heapUsed: number;
    };
}

/**
 * Decorator for monitoring method performance
 */
export const MonitorPerformance =
    (options: MonitorPerformanceOptions = {}) =>
    (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
        const logger = options.logger || new Logger((target as { constructor: { name: string } }).constructor.name);
        const threshold = options.threshold || 1000; // 1s default

        descriptor.value = async function (...args: unknown[]) {
            const startTime = process.hrtime.bigint();
            const startMemory = options.includeMemory ? process.memoryUsage() : null;

            try {
                const result = await originalMethod.apply(this, args);

                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms

                const metrics: PerformanceMetrics = {
                    duration,
                    memory: startMemory
                        ? {
                              external: process.memoryUsage().external - startMemory.external,
                              heapTotal: process.memoryUsage().heapTotal,
                              heapUsed: process.memoryUsage().heapUsed - startMemory.heapUsed,
                          }
                        : undefined,
                };

                if (duration > threshold) {
                    logger.warn(`⚠️ Slow operation: ${propertyKey} took ${duration.toFixed(2)}ms`, {
                        method: propertyKey,
                        metrics,
                        timestamp: new Date().toISOString(),
                    });
                } else {
                    logger.debug(`⚡ ${propertyKey} completed in ${duration.toFixed(2)}ms`, {
                        method: propertyKey,
                        metrics,
                        timestamp: new Date().toISOString(),
                    });
                }

                return result;
            } catch (error) {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1_000_000;

                logger.error(`❌ ${propertyKey} failed after ${duration.toFixed(2)}ms`, {
                    duration: `${duration.toFixed(2)}ms`,
                    error: error instanceof Error ? error.message : String(error),
                    method: propertyKey,
                    timestamp: new Date().toISOString(),
                });

                throw error;
            }
        };

        return descriptor;
    };
