/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Logger } from '@nestjs/common';

import { forEach, get, isObject, map, set } from 'lodash';

import { Observable, throwError } from 'rxjs';
import { catchError, retry as rxRetry, timeout } from 'rxjs/operators';

import type { ClientGrpc } from '@nestjs/microservices';

export interface GrpcOptions {
    enableLogging?: boolean;
    retry?: number;
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
        retry: 0,
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
            pipeOps.push(rxRetry(this.defaultOptions.retry));
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
