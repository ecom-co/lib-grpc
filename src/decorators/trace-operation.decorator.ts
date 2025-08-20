import { randomUUID } from 'crypto';

import { Logger } from '@nestjs/common';

export interface TraceOperationOptions {
    includeArgs?: boolean;
    includeResult?: boolean;
    logger?: Logger;
    operationName?: string;
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
                args: options.includeArgs ? args : '[hidden]',
                operation: operationName,
                timestamp: new Date().toISOString(),
                traceId,
            });

            try {
                const result = await originalMethod.apply(this, args);

                const duration = Date.now() - startTime;

                logger.log(`✅ [${traceId}] Completed ${operationName} in ${duration}ms`, {
                    duration: `${duration}ms`,
                    operation: operationName,
                    result: options.includeResult ? result : '[hidden]',
                    timestamp: new Date().toISOString(),
                    traceId,
                });

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;

                logger.error(`❌ [${traceId}] Failed ${operationName} in ${duration}ms`, {
                    duration: `${duration}ms`,
                    error: errorMessage,
                    operation: operationName,
                    stack: errorStack,
                    timestamp: new Date().toISOString(),
                    traceId,
                });

                throw error;
            }
        };

        return descriptor;
    };
