/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Logger } from '@nestjs/common';

import {
    cloneDeep,
    forEach,
    get,
    includes,
    isArray,
    isNil,
    isNumber,
    isObject,
    isString,
    map,
    merge,
    set,
} from 'lodash';

import CircuitBreaker from 'opossum';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { catchError, retry as rxRetry, timeout } from 'rxjs/operators';

import type { ClientGrpc } from '@nestjs/microservices';

export interface GrpcOptions {
    enableLogging?: boolean;
    maxRetryDelay?: number; // maximum delay between retries in milliseconds
    opossum?: Partial<CircuitBreaker.Options> & {
        enabled?: boolean;
    };
    retry?: number;
    retryableCodes?: number[]; // gRPC status codes that should be retried
    sensitiveFields?: string[]; // fields to sanitize in logs
    timeout?: number; // milliseconds
}

export class GrpcClientException extends Error {
    constructor(
        message: string,
        public readonly code?: number,
        public readonly details?: unknown,
        public readonly metadata?: unknown,
    ) {
        super(message);
        this.name = 'GrpcClientException';

        // Preserve stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GrpcClientException);
        }
    }
}

export class WrappedGrpc implements ClientGrpc {
    private readonly circuitBreakers = new Map<string, CircuitBreaker>();
    private readonly defaultOptions: Required<GrpcOptions> = {
        enableLogging: true,
        maxRetryDelay: 10000, // 10 seconds default
        opossum: {
            name: 'grpc-circuit-breaker',
            allowWarmUp: true, // allow warm-up period
            enabled: false,
            errorThresholdPercentage: 50, // 50% errors before opening circuit
            resetTimeout: 30000, // 30 seconds to wait before attempting to close circuit
            rollingCountBuckets: 10, // 10 buckets in rolling window
            rollingCountTimeout: 10000, // 10 seconds rolling window
            timeout: 30000, // 30 seconds default
            volumeThreshold: 10, // minimum 10 requests before circuit can open
        },
        retry: 0,
        retryableCodes: [
            1, // CANCELLED
            4, // DEADLINE_EXCEEDED
            8, // RESOURCE_EXHAUSTED
            10, // ABORTED
            13, // INTERNAL
            14, // UNAVAILABLE
            15, // DATA_LOSS
        ],
        sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'auth'],
        timeout: 30000, // 30 seconds default
    };

    private readonly logger = new Logger(WrappedGrpc.name);

    private readonly sensitiveFields: string[];

    constructor(
        private readonly clientGrpc: ClientGrpc,
        options: GrpcOptions = {},
    ) {
        this.validateOptions(options);
        // Use lodash merge for deep merging and safety
        this.defaultOptions = merge({}, this.defaultOptions, options);
        this.sensitiveFields = this.defaultOptions.sensitiveFields;
    }

    /**
     * Cleanup resources and close all circuit breakers
     */
    private createPipeOperators(serviceName: string, methodName: string): any[] {
        const pipeOps: any[] = [];

        // Add timeout if configured
        if (this.defaultOptions.timeout > 0) {
            pipeOps.push(timeout(this.defaultOptions.timeout));
        }

        // Add retry if configured
        if (this.defaultOptions.retry > 0) {
            pipeOps.push(
                rxRetry({
                    count: this.defaultOptions.retry,
                    delay: (error, retryCount) => {
                        // Only retry if error code is in retryable codes
                        const errorCode = get(error, 'code');

                        if (isNil(errorCode) || !includes(this.defaultOptions.retryableCodes, errorCode)) {
                            // Don't retry for non-retryable codes
                            return throwError(() => error);
                        }

                        if (this.defaultOptions.enableLogging) {
                            this.logger.warn(
                                `Retrying ${serviceName}.${methodName} (attempt ${retryCount + 1}/${this.defaultOptions.retry + 1}) due to error code: ${error.code}`,
                            );
                        }

                        return new Observable((subscriber) => {
                            setTimeout(
                                () => subscriber.next(undefined),
                                Math.min(1000 * Math.pow(2, retryCount), this.defaultOptions.maxRetryDelay),
                            );
                            subscriber.complete();
                        });
                    },
                }),
            );
        }

        // Add error handling
        pipeOps.push(
            catchError((err) => {
                const errorContext = {
                    error: {
                        name: err.name,
                        code: err.code,
                        status: err.status,
                        details: this.sanitizeErrorDetails(err.details),
                        message: err.message,
                        metadata: this.sanitizeErrorDetails(err.metadata),
                    },
                    method: methodName,
                    service: serviceName,
                };

                if (this.defaultOptions.enableLogging) {
                    this.logger.error(`gRPC Error in ${serviceName}.${methodName}:`, errorContext);
                }

                return throwError(
                    () =>
                        new GrpcClientException(err.message ?? 'gRPC call failed', err.code, err.details, err.metadata),
                );
            }),
        );

        return pipeOps;
    }

    getClientByServiceName<T = any>(name: string): T {
        return this.clientGrpc.getClientByServiceName<T>(name);
    }

    private getOrCreateCircuitBreaker(
        serviceName: string,
        methodName: string,
    ): CircuitBreaker<unknown[], unknown> | null {
        if (!this.defaultOptions.opossum.enabled) {
            return null;
        }

        const key = `${serviceName}.${methodName}`;

        if (!this.circuitBreakers.has(key)) {
            const options: CircuitBreaker.Options = {
                name: `${this.defaultOptions.opossum.name}-${key}`,
                allowWarmUp: this.defaultOptions.opossum.allowWarmUp,
                errorThresholdPercentage: this.defaultOptions.opossum.errorThresholdPercentage,
                resetTimeout: this.defaultOptions.opossum.resetTimeout,
                rollingCountBuckets: this.defaultOptions.opossum.rollingCountBuckets,
                rollingCountTimeout: this.defaultOptions.opossum.rollingCountTimeout,
                timeout: this.defaultOptions.opossum.timeout,
                volumeThreshold: this.defaultOptions.opossum.volumeThreshold,
            };

            // Create a circuit breaker that will be used to wrap the actual function calls
            const circuitBreaker = new CircuitBreaker(async (fn: () => Promise<unknown>) => await fn(), options);

            // Add event listeners for logging
            circuitBreaker.on('open', () => {
                this.logger.warn(`Circuit breaker opened for ${key}`);
            });

            circuitBreaker.on('close', () => {
                this.logger.log(`Circuit breaker closed for ${key}`);
            });

            circuitBreaker.on('halfOpen', () => {
                this.logger.log(`Circuit breaker half-open for ${key}`);
            });

            // Double-check locking pattern to avoid race condition
            if (!this.circuitBreakers.has(key)) {
                this.circuitBreakers.set(key, circuitBreaker);
            } else {
                // Another async operation created the circuit breaker, close this one
                circuitBreaker.close();

                return this.circuitBreakers.get(key) || null;
            }
        }

        return this.circuitBreakers.get(key) || null;
    }

    getService<T extends object>(name: string): T {
        const rawService = this.clientGrpc.getService<T>(name);

        return new Proxy(rawService, {
            get: (target, prop) => {
                const value = target[prop as keyof T];

                if (typeof value === 'function') {
                    return (...args: any[]) => {
                        const methodName = String(prop);

                        if (this.defaultOptions.enableLogging) {
                            this.logger.debug(`Calling gRPC method: ${name}.${methodName}`, {
                                args: this.sanitizeArgs(args),
                            });
                        }

                        const result = (value as any).apply(target, args);

                        if (result && typeof result === 'object' && typeof result.toPromise === 'function') {
                            return this.wrapWithCircuitBreaker(result, name, methodName);
                        }

                        return result;
                    };
                }

                return value;
            },
        });
    }

    // eslint-disable-next-line complexity
    private validateOptions(options: GrpcOptions): void {
        // Safe type checking with lodash
        if (!isNil(options.timeout) && (!isNumber(options.timeout) || options.timeout <= 0)) {
            throw new Error('Timeout must be a positive number');
        }

        if (!isNil(options.retry) && (!isNumber(options.retry) || options.retry < 0)) {
            throw new Error('Retry count must be a non-negative number');
        }

        if (!isNil(options.maxRetryDelay) && (!isNumber(options.maxRetryDelay) || options.maxRetryDelay <= 0)) {
            throw new Error('Max retry delay must be a positive number');
        }

        if (!isNil(options.opossum?.timeout) && (!isNumber(options.opossum.timeout) || options.opossum.timeout <= 0)) {
            throw new Error('Circuit breaker timeout must be a positive number');
        }

        if (
            !isNil(options.opossum?.errorThresholdPercentage) &&
            (!isNumber(options.opossum.errorThresholdPercentage) ||
                options.opossum.errorThresholdPercentage < 0 ||
                options.opossum.errorThresholdPercentage > 100)
        ) {
            throw new Error('Error threshold percentage must be a number between 0 and 100');
        }

        if (!isNil(options.sensitiveFields) && !isArray(options.sensitiveFields)) {
            throw new Error('Sensitive fields must be an array');
        }
    }

    private sanitizeArgs(args: any[]): any[] {
        // Remove sensitive data from logs if needed
        return map(args, (arg) => {
            if (isObject(arg) && !isNil(arg)) {
                // Use cloneDeep for safe object cloning
                const sanitized = cloneDeep(arg);

                // Remove configurable sensitive fields
                forEach(this.sensitiveFields, (field) => {
                    if (isString(field) && get(sanitized, field)) {
                        set(sanitized, field, '[REDACTED]');
                    }
                });

                return sanitized;
            }

            return arg;
        });
    }

    private sanitizeErrorDetails(details: unknown): unknown {
        if (isNil(details) || !isObject(details)) {
            return details;
        }

        try {
            // Use cloneDeep for safe object cloning
            const sanitized = cloneDeep(details as Record<string, unknown>);

            // Remove sensitive fields from error details
            forEach(this.sensitiveFields, (field) => {
                if (isString(field) && get(sanitized, field)) {
                    set(sanitized, field, '[REDACTED]');
                }
            });

            return sanitized;
        } catch (error) {
            this.logger.warn('Failed to sanitize error details:', error);

            return '[SANITIZATION_FAILED]';
        }
    }

    public dispose(): void {
        this.circuitBreakers.forEach((cb) => cb.close());
        this.circuitBreakers.clear();
    }

    private wrapWithCircuitBreaker<T>(
        observable: Observable<T>,
        serviceName: string,
        methodName: string,
    ): Observable<T> {
        const circuitBreaker = this.getOrCreateCircuitBreaker(serviceName, methodName);

        if (circuitBreaker) {
            // Use circuit breaker to execute the observable
            return new Observable<T>((subscriber) => {
                let subscription: undefined | { unsubscribe: () => void };

                circuitBreaker
                    .fire(() => {
                        subscription = observable.subscribe();

                        return firstValueFrom(observable);
                    })
                    .then((result: unknown) => {
                        subscriber.next(result as T);
                        subscriber.complete();
                    })
                    .catch((error) => {
                        subscriber.error(error);
                    });

                return () => {
                    if (subscription && typeof subscription.unsubscribe === 'function') {
                        subscription.unsubscribe();
                    }
                };
            }).pipe(
                ...(this.createPipeOperators(serviceName, methodName) as unknown as Parameters<typeof observable.pipe>),
            ) as Observable<T>;
        }

        // If circuit breaker is disabled, use original logic
        return observable.pipe(
            ...(this.createPipeOperators(serviceName, methodName) as unknown as Parameters<typeof observable.pipe>),
        ) as Observable<T>;
    }
}

/**
 * Factory function để tạo WrappedGrpc
 * @param clientGrpc - ClientGrpc instance gốc
 * @param options - Options cho wrapper
 * @returns WrappedGrpc instance
 *
 * @example
 * ```typescript
 * const wrappedClient = createWrappedGrpc(clientGrpc, {
 *   opossum: {
 *     enabled: true,
 *     timeout: 5000,
 *     errorThresholdPercentage: 30,
 *     resetTimeout: 10000,
 *     volumeThreshold: 5
 *   }
 * });
 * ```
 */
export const createWrappedGrpc = (clientGrpc: ClientGrpc, options: GrpcOptions = {}): WrappedGrpc =>
    new WrappedGrpc(clientGrpc, options);

// Export types for convenience
export type { ClientGrpc };
