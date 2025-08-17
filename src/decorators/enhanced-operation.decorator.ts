import { Logger } from '@nestjs/common';

import { randomUUID } from 'crypto';

export interface EnhancedOperationOptions {
    operationName?: string;
    includeArgs?: boolean;
    includeResult?: boolean;
    performanceThreshold?: number;
    cacheEnabled?: boolean;
    cacheTtl?: number;
    logger?: Logger;
}

interface CacheEntry<T = unknown> {
    data: T;
    timestamp: number;
    ttl: number;
}

class EnhancedCache {
    private cache = new Map<string, CacheEntry>();

    set<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl * 1000,
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const isExpired = Date.now() - entry.timestamp > entry.ttl;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

const enhancedCache = new EnhancedCache();

/**
 * Enhanced decorator combining tracing, performance monitoring, and caching
 */
export const EnhancedOperation =
    (options: EnhancedOperationOptions = {}) =>
    (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
        const logger = options.logger || new Logger((target as { constructor: { name: string } }).constructor.name);
        const operationName =
            options.operationName || `${(target as { constructor: { name: string } }).constructor.name}.${propertyKey}`;
        const performanceThreshold = options.performanceThreshold || 1000;
        const cacheTtl = options.cacheTtl || 300;

        descriptor.value = async function (...args: unknown[]) {
            const traceId = randomUUID();
            const startTime = process.hrtime.bigint();
            const startMemory = process.memoryUsage();

            // Check cache if enabled
            if (options.cacheEnabled) {
                const cacheKey = `${operationName}:${JSON.stringify(args)}`;
                const cached = enhancedCache.get(cacheKey);
                if (cached !== null) {
                    logger.debug(`💾 [${traceId}] Cache hit for ${operationName}`, {
                        traceId,
                        operation: operationName,
                        cached: true,
                        timestamp: new Date().toISOString(),
                    });
                    return cached;
                }
            }

            logger.log(`🟢 [${traceId}] Starting ${operationName}`, {
                traceId,
                operation: operationName,
                args: options.includeArgs ? args : '[hidden]',
                timestamp: new Date().toISOString(),
            });

            try {
                const result = await originalMethod.apply(this, args);

                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1_000_000;
                const endMemory = process.memoryUsage();

                // Performance monitoring
                const performanceData = {
                    traceId,
                    operation: operationName,
                    duration: `${duration.toFixed(2)}ms`,
                    memory: {
                        heapDelta: endMemory.heapUsed - startMemory.heapUsed,
                        heapTotal: endMemory.heapTotal,
                        external: endMemory.external - startMemory.external,
                    },
                    result: options.includeResult ? result : '[hidden]',
                    timestamp: new Date().toISOString(),
                };

                if (duration > performanceThreshold) {
                    logger.warn(
                        `⚠️ [${traceId}] Slow operation: ${operationName} took ${duration.toFixed(2)}ms`,
                        performanceData,
                    );
                } else {
                    logger.log(
                        `✅ [${traceId}] Completed ${operationName} in ${duration.toFixed(2)}ms`,
                        performanceData,
                    );
                }

                // Cache result if enabled
                if (options.cacheEnabled) {
                    const cacheKey = `${operationName}:${JSON.stringify(args)}`;
                    enhancedCache.set(cacheKey, result, cacheTtl);
                    logger.debug(`💾 [${traceId}] Cached result for ${operationName} (TTL: ${cacheTtl}s)`);
                }

                return result;
            } catch (error) {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1_000_000;
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;

                logger.error(`❌ [${traceId}] Failed ${operationName} in ${duration.toFixed(2)}ms`, {
                    traceId,
                    operation: operationName,
                    duration: `${duration.toFixed(2)}ms`,
                    error: errorMessage,
                    stack: errorStack,
                    timestamp: new Date().toISOString(),
                });

                throw error;
            }
        };

        return descriptor;
    };

// Export cache for manual management
export { enhancedCache };
