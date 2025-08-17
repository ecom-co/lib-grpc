import { Logger } from '@nestjs/common';

export interface CacheableOptions {
    ttl?: number; // seconds
    key?: string;
    logger?: Logger;
}

interface CacheEntry<T = unknown> {
    data: T;
    timestamp: number;
    ttl: number;
}

/**
 * Simple in-memory cache for method results
 */
class MethodCache {
    private cache = new Map<string, CacheEntry>();

    set<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl * 1000, // Convert to ms
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

const globalCache = new MethodCache();

/**
 * Decorator for caching method results
 */
export const Cacheable =
    (options: CacheableOptions = {}) =>
    (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
        const logger = options.logger || new Logger((target as { constructor: { name: string } }).constructor.name);
        const ttl = options.ttl || 300; // 5 minutes default

        descriptor.value = async function (...args: unknown[]) {
            const baseKey =
                options.key || `${(target as { constructor: { name: string } }).constructor.name}.${propertyKey}`;
            const argsKey = JSON.stringify(args);
            const cacheKey = `${baseKey}:${argsKey}`;

            // Try to get from cache
            const cached = globalCache.get(cacheKey);
            if (cached !== null) {
                logger.debug(`💾 Cache hit for ${propertyKey}`, {
                    method: propertyKey,
                    cacheKey,
                    timestamp: new Date().toISOString(),
                });
                return cached;
            }

            // Execute original method
            logger.debug(`🔍 Cache miss for ${propertyKey}`, {
                method: propertyKey,
                cacheKey,
                timestamp: new Date().toISOString(),
            });

            try {
                const result = await originalMethod.apply(this, args);

                // Store in cache
                globalCache.set(cacheKey, result, ttl);

                logger.debug(`💾 Cached result for ${propertyKey} (TTL: ${ttl}s)`, {
                    method: propertyKey,
                    cacheKey,
                    ttl: `${ttl}s`,
                    cacheSize: globalCache.size(),
                    timestamp: new Date().toISOString(),
                });

                return result;
            } catch (error) {
                logger.error(`❌ Error in ${propertyKey}, not caching`, {
                    method: propertyKey,
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString(),
                });

                throw error;
            }
        };

        return descriptor;
    };

// Export cache instance for manual management
export { globalCache };
