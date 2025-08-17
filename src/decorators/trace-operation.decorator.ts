import { Logger } from '@nestjs/common';

import { randomUUID } from 'crypto';

export interface TraceOperationOptions {
    operationName?: string;
    includeArgs?: boolean;
    includeResult?: boolean;
    logger?: Logger;
}

/**
 * Decorator for tracing gRPC operations with unique trace IDs
 */
export const TraceOperation =
    (options: TraceOperationOptions = {}) =>
    (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
        const logger = options.logger || new Logger((target as { constructor: { name: string } }).constructor.name);
        const operationName =
            options.operationName || `${(target as { constructor: { name: string } }).constructor.name}.${propertyKey}`;

        descriptor.value = async function (...args: unknown[]) {
            const traceId = randomUUID();
            const startTime = Date.now();

            logger.log(`🟢 [${traceId}] Starting ${operationName}`, {
                traceId,
                operation: operationName,
                args: options.includeArgs ? args : '[hidden]',
                timestamp: new Date().toISOString(),
            });

            try {
                const result = await originalMethod.apply(this, args);

                const duration = Date.now() - startTime;
                logger.log(`✅ [${traceId}] Completed ${operationName} in ${duration}ms`, {
                    traceId,
                    operation: operationName,
                    duration: `${duration}ms`,
                    result: options.includeResult ? result : '[hidden]',
                    timestamp: new Date().toISOString(),
                });

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;

                logger.error(`❌ [${traceId}] Failed ${operationName} in ${duration}ms`, {
                    traceId,
                    operation: operationName,
                    duration: `${duration}ms`,
                    error: errorMessage,
                    stack: errorStack,
                    timestamp: new Date().toISOString(),
                });

                throw error;
            }
        };

        return descriptor;
    };
