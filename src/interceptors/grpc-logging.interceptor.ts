/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto';

import { Reflector } from '@nestjs/core';

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';

import { get, has, isArray, keys, set, size } from 'lodash';

import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { GRPC_METHOD_METADATA, GrpcMethodMetadata } from '../decorators';

enum LogLevel {
    DEBUG = 'debug',
    ERROR = 'error',
    INFO = 'info',
    SILENT = 'silent',
    WARN = 'warn',
}

interface LogContext {
    correlationId: string;
    methodName: string;
    requestId: string;
    serviceName: string;
    timestamp: string;
    traceId: string;
}

interface LoggingOption {
    isDevelopment?: boolean;
    logLevel?: LogLevel;
    logRequest?: boolean;
    logResponse?: boolean;
}

@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(GrpcLoggingInterceptor.name);
    private readonly options: LoggingOption;

    private get logLevel(): LogLevel {
        return this.options.logLevel || LogLevel.INFO;
    }

    constructor(
        private reflector: Reflector,
        options?: LoggingOption,
    ) {
        this.options = {
            isDevelopment: get(options, 'isDevelopment', process.env.NODE_ENV === 'development'),
            logLevel: get(options, 'logLevel', process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.INFO),
            logRequest: get(options, 'logRequest', process.env.NODE_ENV !== 'production'),
            logResponse: get(options, 'logResponse', process.env.NODE_ENV === 'development'),
        };
    }

    private formatMetadataValue(value: any): null | string {
        if (isArray(value) && size(value) > 0) {
            return value[0] as string;
        }

        if (typeof value === 'string') {
            return value;
        }

        return null;
    }

    protected sanitizeData(data: any): any {
        if (!data) return data;

        const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
        const sanitized = { ...data };

        for (const field of sensitiveFields) {
            if (has(sanitized, field)) {
                set(sanitized, field, '[REDACTED]');
            }
        }

        return sanitized;
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const grpcContext = context.switchToRpc();
        const methodName = context.getHandler().name;
        const className = context.getClass().name;
        const data = grpcContext.getData();
        const metadata = grpcContext.getContext();

        const logContext: LogContext = {
            methodName,
            serviceName: className,
            timestamp: new Date().toISOString(),
            correlationId:
                this.extractFromMetadata(metadata, 'correlation-id') ||
                this.extractFromMetadata(metadata, 'x-correlation-id') ||
                randomUUID(),
            requestId:
                this.extractFromMetadata(metadata, 'request-id') ||
                this.extractFromMetadata(metadata, 'x-request-id') ||
                randomUUID(),
            traceId:
                this.extractFromMetadata(metadata, 'trace-id') ||
                this.extractFromMetadata(metadata, 'x-trace-id') ||
                randomUUID(),
        };

        const methodMetadata = this.reflector.get<GrpcMethodMetadata>(GRPC_METHOD_METADATA, context.getHandler());
        const serviceName = methodMetadata?.service || logContext.serviceName;
        const methodDisplayName = methodMetadata?.method || logContext.methodName;

        logContext.serviceName = serviceName;
        logContext.methodName = methodDisplayName;

        const startTime = Date.now();

        if (this.shouldLog(LogLevel.INFO)) {
            this.logger.log(`[${serviceName} - ${methodDisplayName}] Started | ID: ${logContext.correlationId}`);
        }

        if (this.options.logRequest && this.shouldLog(LogLevel.DEBUG)) {
            this.logRequestDetails(logContext, methodMetadata, data);
        }

        return next.handle().pipe(
            tap((response) => {
                const duration = Date.now() - startTime;

                this.logSuccess(logContext, duration, response);
            }),
            catchError((error: any) => {
                const duration = Date.now() - startTime;

                this.logError(logContext, duration, error);

                return throwError(() => error as object);
            }),
        );
    }

    protected extractFromMetadata(metadata: any, key: string): null | string {
        if (!metadata) return null;

        try {
            return this.extractFromGrpcMetadata(metadata, key) || this.extractFromPlainObject(metadata, key);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

            this.logger.debug(`Failed to extract ${key} from metadata:`, errorMessage);

            return null;
        }
    }

    protected logError(logContext: LogContext, duration: number, error: any): void {
        const { methodName, serviceName, timestamp, correlationId, requestId, traceId } = logContext;

        this.logger.error(`[${serviceName}.${methodName}] Error (${duration}ms) | ID: ${correlationId}`, {
            code: get(error, 'code'),
            duration,
            message: get(error, 'message') || 'Unknown error',
            timestamp,
            correlationId,
            requestId,
            traceId,
            ...(this.options.isDevelopment && { stack: get(error, 'stack') }),
        });
    }

    protected logRequestDetails(
        logContext: LogContext,
        methodMetadata: GrpcMethodMetadata | undefined,
        data: any,
    ): void {
        const { methodName, serviceName, timestamp, correlationId, requestId, traceId } = logContext;

        this.logger.debug(`[${serviceName}.${methodName}] Request Details`, {
            metadata: methodMetadata
                ? {
                      description: methodMetadata.description,
                      rateLimit: methodMetadata.rateLimit,
                      requiresAuth: methodMetadata.requiresAuth,
                  }
                : undefined,
            timestamp,
            correlationId,
            requestId,
            traceId,
        });

        if (this.options.logRequest && data && keys(data).length > 0) {
            this.logger.debug(`[${serviceName}.${methodName}] Input`, this.sanitizeData(data));
        }
    }

    protected logSuccess(logContext: LogContext, duration: number, response: any): void {
        const { methodName, serviceName, correlationId } = logContext;

        if (this.shouldLog(LogLevel.INFO)) {
            this.logger.log(`[${serviceName} - ${methodName}] Success (${duration}ms) | ID: ${correlationId}`);
        }

        if (this.options.logResponse && this.shouldLog(LogLevel.DEBUG) && response) {
            this.logger.debug(`[${serviceName} - ${methodName}] Response`, this.sanitizeData(response));
        }
    }

    protected shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.SILENT, LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const requestedLevelIndex = levels.indexOf(level);

        return requestedLevelIndex <= currentLevelIndex;
    }

    private extractFromGrpcMetadata(metadata: any, key: string): null | string {
        if (this.hasGetMethod(metadata)) {
            try {
                const value = metadata.get(key);

                return this.formatMetadataValue(value);
            } catch {
                return null;
            }
        }

        return null;
    }

    private extractFromPlainObject(metadata: any, key: string): null | string {
        if (metadata && typeof metadata === 'object' && has(metadata, key)) {
            const value = get(metadata, key);

            return this.formatMetadataValue(value);
        }

        return null;
    }

    private hasGetMethod(obj: unknown): obj is { get: (key: string) => unknown } {
        return (
            obj !== null &&
            obj !== undefined &&
            typeof obj === 'object' &&
            'get' in obj &&
            typeof (obj as Record<string, unknown>).get === 'function'
        );
    }
}

export const createGrpcLoggingInterceptor = (options?: LoggingOption) => (reflector: Reflector) =>
    new GrpcLoggingInterceptor(reflector, options);
