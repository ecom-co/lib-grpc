/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Logger } from '@nestjs/common';

import { forEach, get, includes, isObject, map, set } from 'lodash';

import { Observable, throwError } from 'rxjs';
import { catchError, retry as rxRetry, timeout } from 'rxjs/operators';

import type { ClientGrpc } from '@nestjs/microservices';

export interface GrpcOptions {
    enableLogging?: boolean;
    maxRetryDelay?: number; // maximum delay between retries in milliseconds
    retry?: number;
    retryableCodes?: number[]; // gRPC status codes that should be retried
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
    private readonly defaultOptions: Required<GrpcOptions> = {
        enableLogging: true,
        maxRetryDelay: 10000, // 10 seconds default
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
        timeout: 30000, // 30 seconds default
    };

    private readonly logger = new Logger(WrappedGrpc.name);

    constructor(
        private readonly clientGrpc: ClientGrpc,
        options: GrpcOptions = {},
    ) {
        this.defaultOptions = { ...this.defaultOptions, ...options };
    }

    getClientByServiceName<T = any>(name: string): T {
        return this.clientGrpc.getClientByServiceName<T>(name);
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

                        if (result instanceof Observable) {
                            return this.wrap(result, name, methodName);
                        }

                        return result;
                    };
                }

                return value;
            },
        });
    }

    private sanitizeArgs(args: any[]): any[] {
        // Remove sensitive data from logs if needed
        return map(args, (arg) => {
            if (isObject(arg) && arg !== null) {
                const sanitized = { ...arg };

                // Remove common sensitive fields
                forEach(['password', 'token', 'secret', 'key'], (field) => {
                    if (get(sanitized, field)) {
                        set(sanitized, field, '[REDACTED]');
                    }
                });

                return sanitized;
            }

            return arg;
        });
    }

    private wrap<T>(observable: Observable<T>, serviceName: string, methodName: string): Observable<T> {
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

                        if (errorCode && includes(this.defaultOptions.retryableCodes, errorCode)) {
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
                        }

                        // Don't retry for non-retryable errors
                        throw error;
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
                        details: err.details,
                        message: err.message,
                        metadata: err.metadata,
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

        return observable.pipe(...(pipeOps as unknown as Parameters<typeof observable.pipe>)) as Observable<T>;
    }
}

/**
 * Factory function để tạo WrappedGrpc
 * @param clientGrpc - ClientGrpc instance gốc
 * @param options - Options cho wrapper
 * @returns WrappedGrpc instance
 */
export const createWrappedGrpc = (clientGrpc: ClientGrpc, options: GrpcOptions = {}): WrappedGrpc =>
    new WrappedGrpc(clientGrpc, options);

// Export types for convenience
export type { ClientGrpc };
