/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import { Reflector } from '@nestjs/core';

import { ArgumentsHost, Catch, ExceptionFilter, ExecutionContext, Logger } from '@nestjs/common';

import { get, has, isArray, isFunction, isObject, toLower } from 'lodash';

import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { GRPC_METHOD_METADATA_KEY, GRPC_SERVICE_METADATA_KEY } from '../constants';
import { DEFAULT_ERROR_MESSAGES, ERROR_NAME_TO_GRPC_CODE, GRPC_STATUS_CODES } from '../constants/grpc.constants';
import { GrpcValidationException } from '../exceptions/grpc-validation.exception';

export interface GrpcErrorMetrics {
    increment: (code: number, method: string, service: string) => void;
}

export interface GrpcExceptionFilterOptions {
    customErrorMessages?: Record<number, string>;
    enableAsyncLogging?: boolean;
    enableLogging?: boolean;
    enableMetrics?: boolean;
    errorRateLimit?: number;
    isDevelopment?: boolean;
    maxDetailsSize?: number;
    rateLimitWindowMs?: number;
}

interface ErrorInfo {
    code: number;
    details?: unknown;
    message: string;
}

interface ErrorRateLimit {
    count: number;
    lastReset: number;
}

interface GrpcContext {
    get?: (key: string) => unknown;
    metadata?: GrpcContextMetadata;
    method?: string;
    service?: string;
}

interface GrpcContextMetadata {
    get: (key: string) => string | string[] | undefined;
}

interface MetadataLike {
    get: (key: string) => string | string[] | undefined;
}

interface RpcError {
    code?: number;
    details?: unknown;
    message?: string;
}

//
// Type guards
//
const isObjectLike = (obj: unknown): obj is Record<string, unknown> => isObject(obj);

export const isRpcError = (obj: unknown): obj is RpcError => isObjectLike(obj);

export const hasGetMethod = (obj: unknown): obj is { get: (key: string) => unknown } =>
    isObjectLike(obj) && has(obj, 'get') && isFunction((obj as Record<string, unknown>).get);

export const isMetadataLike = (obj: unknown): obj is MetadataLike => hasGetMethod(obj);

export const hasServiceAndMethod = (obj: unknown): obj is { method?: string; service?: string } => isObjectLike(obj);

export const isGrpcContext = (obj: unknown): obj is GrpcContext => isObjectLike(obj);

export const hasMetadata = (obj: unknown): obj is { metadata: GrpcContextMetadata } =>
    isObjectLike(obj) &&
    has(obj, 'metadata') &&
    isObjectLike((obj as Record<string, unknown>).metadata) &&
    has((obj as Record<string, unknown>).metadata, 'get') &&
    isFunction(((obj as Record<string, unknown>).metadata as GrpcContextMetadata).get);

//
// Exception Filter
//
@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
    private static readonly ERROR_CODE_CACHE = new Map<string, number>();
    private readonly customErrorMessages: Record<number, string>;
    private readonly enableAsyncLogging: boolean;
    private readonly enableLogging: boolean;
    private readonly enableMetrics: boolean;
    private readonly errorMetrics?: GrpcErrorMetrics;
    private readonly errorRateLimit: number;
    private readonly errorRateLimiter = new Map<string, ErrorRateLimit>();
    private readonly isDevelopment: boolean;
    private isProcessingLogs = false;
    private readonly logger = new Logger(GrpcExceptionFilter.name);

    private readonly logQueue: Array<() => Promise<void>> = [];
    private readonly maxDetailsSize: number;
    private readonly rateLimitWindowMs: number;

    constructor(
        private readonly reflector: Reflector,
        options?: GrpcExceptionFilterOptions,
        errorMetrics?: GrpcErrorMetrics,
    ) {
        this.isDevelopment = options?.isDevelopment ?? false;
        this.enableLogging = options?.enableLogging ?? true;
        this.enableMetrics = options?.enableMetrics ?? false;
        this.enableAsyncLogging = options?.enableAsyncLogging ?? true;
        this.customErrorMessages = options?.customErrorMessages ?? {};
        this.maxDetailsSize = options?.maxDetailsSize ?? 1000; // 1KB default
        this.errorRateLimit = options?.errorRateLimit ?? 10;
        this.rateLimitWindowMs = options?.rateLimitWindowMs ?? 60000; // 1 minute
        this.errorMetrics = errorMetrics;
    }

    private createErrorResponse(
        errorInfo: ErrorInfo,
        correlationId: string,
        serviceMethod: string,
    ): Record<string, unknown> {
        const response: Record<string, unknown> = {
            code: errorInfo.code,
            message: errorInfo.message,
            service: serviceMethod,
            timestamp: new Date().toISOString(),
            requestId: correlationId,
        };

        const customMessage = this.customErrorMessages[errorInfo.code];

        if (customMessage) {
            response.message = customMessage;
        }

        if (errorInfo.details !== undefined) {
            response.details = errorInfo.details;
        }

        return response;
    }

    private getErrorInfo(exception: unknown): ErrorInfo {
        if (exception instanceof RpcException) {
            const error = exception.getError();

            if (isRpcError(error)) {
                return {
                    code: error.code || GRPC_STATUS_CODES.INTERNAL,
                    details: this.sanitizeDetails(error.details),
                    message: error.message || DEFAULT_ERROR_MESSAGES[GRPC_STATUS_CODES.INTERNAL],
                };
            }
        }

        if (exception instanceof GrpcValidationException) {
            const validationDetails = {
                errors: exception.getValidationMessages(),
                fieldErrors: exception.getFieldErrors(),
            };

            return {
                code: GRPC_STATUS_CODES.INVALID_ARGUMENT,
                details: this.sanitizeDetails(JSON.stringify(validationDetails)),
                message: 'Validation failed',
            };
        }

        if (exception instanceof Error) {
            const code = this.mapErrorToGrpcCode(exception);
            const details = this.isDevelopment ? { stack: exception.stack } : undefined;

            return {
                code,
                details: this.sanitizeDetails(details),
                message: exception.message || 'An error occurred',
            };
        }

        const details = this.isDevelopment ? { originalError: JSON.stringify(exception) } : undefined;

        return {
            code: GRPC_STATUS_CODES.INTERNAL,
            details: this.sanitizeDetails(details),
            message: DEFAULT_ERROR_MESSAGES[GRPC_STATUS_CODES.INTERNAL],
        };
    }

    private getOrCreateCorrelationId(context: GrpcContext): string {
        try {
            if (hasMetadata(context)) {
                const { metadata } = context;
                const correlationId =
                    metadata.get('correlation-id') || metadata.get('request-id') || metadata.get('trace-id');

                if (correlationId) {
                    return isArray(correlationId) ? get(correlationId, 0) : correlationId;
                }
            }

            if (isGrpcContext(context) && context.get) {
                const contextMetadata = context.get('metadata') as GrpcContextMetadata | undefined;

                if (contextMetadata && isFunction(contextMetadata.get)) {
                    const correlationId =
                        contextMetadata.get('correlation-id') ||
                        contextMetadata.get('request-id') ||
                        contextMetadata.get('trace-id');

                    if (correlationId) {
                        return isArray(correlationId) ? get(correlationId, 0) : correlationId;
                    }
                }
            }
        } catch (metadataError) {
            this.logger.debug('Failed to extract correlation ID from metadata', metadataError as Error);
        }

        return uuidv4();
    }

    private getServiceMethod(context: GrpcContext, host: ExecutionContext): string {
        try {
            // First try to get from handler metadata (custom decorator)
            const handler = host.getHandler();
            const service = this.reflector.get<string>(GRPC_SERVICE_METADATA_KEY, handler);
            const method = this.reflector.get<string>(GRPC_METHOD_METADATA_KEY, handler);

            if (service && method) {
                return `[${service}] - [${method}]`;
            }

            // Fallback to context (original approach)
            const contextService = isGrpcContext(context) && context.service ? context.service : 'unknown';
            const contextMethod = isGrpcContext(context) && context.method ? context.method : 'unknown';

            return `[${contextService}] - [${contextMethod}]`;
        } catch (contextError) {
            this.logger.debug('Failed to extract service method from context or metadata', contextError as Error);

            return 'unknown.unknown';
        }
    }

    private async processLogQueue(): Promise<void> {
        if (this.isProcessingLogs) return;

        this.isProcessingLogs = true;

        try {
            while (this.logQueue.length > 0) {
                const logTask = this.logQueue.shift();

                if (logTask) {
                    try {
                        await logTask();
                    } catch (logError) {
                        this.logger.warn('Failed to process log task', logError as Error);
                    }
                }
            }
        } finally {
            this.isProcessingLogs = false;
        }
    }

    private mapErrorToGrpcCode(error: Error): number {
        const errorName = toLower(error.name);

        if (GrpcExceptionFilter.ERROR_CODE_CACHE.has(errorName)) {
            return GrpcExceptionFilter.ERROR_CODE_CACHE.get(errorName)!;
        }

        const code = get(ERROR_NAME_TO_GRPC_CODE, errorName, GRPC_STATUS_CODES.INTERNAL);

        GrpcExceptionFilter.ERROR_CODE_CACHE.set(errorName, code);

        return code;
    }

    private sanitizeDetails(details: unknown): unknown {
        if (!details) return details;

        try {
            const serialized = JSON.stringify(details);

            if (!this.isDevelopment && serialized.length > this.maxDetailsSize) {
                return {
                    maxSize: this.maxDetailsSize,
                    originalSize: serialized.length,
                    preview: `${serialized.substring(0, this.maxDetailsSize / 2)}...`,
                    truncated: true,
                };
            }

            return details;
        } catch {
            return {
                type: typeof details,
                error: 'Failed to serialize details',
            };
        }
    }

    catch(exception: unknown, host: ArgumentsHost): Observable<unknown> {
        const ctx = host.switchToRpc();
        const data = this.safeGetData(ctx);
        const context = this.safeGetContext(ctx);

        try {
            const errorInfo = this.getErrorInfo(exception);
            const correlationId = this.getOrCreateCorrelationId(context);
            // Cast to ExecutionContext to access getHandler()
            const serviceMethod = this.getServiceMethod(context, host as ExecutionContext);

            // Record metrics if enabled
            if (this.enableMetrics && this.errorMetrics) {
                setImmediate(() => {
                    try {
                        // Extract service name from serviceMethod
                        const serviceName = serviceMethod.split('.')[0] || 'unknown';

                        this.errorMetrics!.increment(errorInfo.code, serviceMethod, serviceName);
                    } catch (metricsError) {
                        this.logger.warn('Failed to record metrics', metricsError as Error);
                    }
                });
            }

            // Logging
            if (this.enableLogging) {
                const errorKey = `${serviceMethod}-${errorInfo.code}`;

                if (this.shouldLogError(errorKey)) {
                    if (this.enableAsyncLogging) {
                        this.queueLogError(exception, errorInfo, serviceMethod, correlationId, data);
                    } else {
                        this.logErrorSync(exception, errorInfo, serviceMethod, correlationId, data);
                    }
                }
            }

            const errorResponse = this.createErrorResponse(errorInfo, correlationId, serviceMethod);

            return throwError(() => new RpcException(errorResponse));
        } catch (filterError) {
            this.logger.error('gRPC Exception filter failed', filterError as Error);

            const fallbackError = {
                code: GRPC_STATUS_CODES.INTERNAL,
                message: DEFAULT_ERROR_MESSAGES[GRPC_STATUS_CODES.INTERNAL],
                timestamp: new Date().toISOString(),
                requestId: uuidv4(),
            };

            return throwError(() => new RpcException(fallbackError));
        }
    }

    public async cleanup(): Promise<void> {
        if (this.logQueue.length > 0) {
            await this.processLogQueue();
        }

        GrpcExceptionFilter.ERROR_CODE_CACHE.clear();
        this.errorRateLimiter.clear();
    }

    private async logErrorAsync(
        exception: unknown,
        errorInfo: ErrorInfo,
        serviceMethod: string,
        correlationId: string,
        data: Record<string, unknown>,
    ): Promise<void> {
        return new Promise((resolve) => {
            setImmediate(() => {
                try {
                    this.logErrorSync(exception, errorInfo, serviceMethod, correlationId, data);
                } catch (logError) {
                    this.logger.warn('Async logging failed', logError as Error);
                } finally {
                    resolve();
                }
            });
        });
    }

    private logErrorSync(
        exception: unknown,
        errorInfo: ErrorInfo,
        serviceMethod: string,
        correlationId: string,
        data: Record<string, unknown>,
    ): void {
        const logContext = {
            errorCode: errorInfo.code,
            serviceMethod,
            timestamp: new Date().toISOString(),
            correlationId,
        };

        if (
            errorInfo.code >= GRPC_STATUS_CODES.INVALID_ARGUMENT &&
            errorInfo.code <= GRPC_STATUS_CODES.UNAUTHENTICATED &&
            errorInfo.code !== GRPC_STATUS_CODES.INTERNAL
        ) {
            this.logger.warn(
                `[${correlationId}] gRPC Client Error: ${errorInfo.code} ${serviceMethod} - ${errorInfo.message}`,
                logContext,
            );
        } else {
            const errorStack = exception instanceof Error ? exception.stack : undefined;

            this.logger.error(
                `[${correlationId}] gRPC Server Error: ${errorInfo.code} ${serviceMethod} - ${errorInfo.message}`,
                errorStack,
                logContext,
            );
        }

        if (this.isDevelopment && data) {
            try {
                const dataString = JSON.stringify(data, null, 2);

                if (dataString.length > this.maxDetailsSize) {
                    this.logger.debug(`Request data (truncated): ${dataString.substring(0, this.maxDetailsSize)}...`);
                } else {
                    this.logger.debug(`Request data: ${dataString}`);
                }
            } catch {
                this.logger.debug('Failed to serialize request data for logging');
            }
        }
    }

    private queueLogError(
        exception: unknown,
        errorInfo: ErrorInfo,
        serviceMethod: string,
        correlationId: string,
        data: Record<string, unknown>,
    ): void {
        const logTask = () => this.logErrorAsync(exception, errorInfo, serviceMethod, correlationId, data);

        this.logQueue.push(logTask);

        if (!this.isProcessingLogs) {
            void this.processLogQueue();
        }
    }

    private safeGetContext(ctx: { getContext: () => unknown }): GrpcContext {
        try {
            const context: unknown = ctx.getContext();

            if (isGrpcContext(context)) {
                return context;
            }

            return {};
        } catch {
            return {};
        }
    }

    private safeGetData(ctx: { getData: () => unknown }): Record<string, unknown> {
        try {
            const data: unknown = ctx.getData();

            if (isObjectLike(data)) {
                return data;
            }

            return {};
        } catch {
            return {};
        }
    }

    private shouldLogError(errorKey: string): boolean {
        const now = Date.now();
        const limit = this.errorRateLimiter.get(errorKey);

        if (!limit || now - limit.lastReset > this.rateLimitWindowMs) {
            this.errorRateLimiter.set(errorKey, { count: 1, lastReset: now });

            return true;
        }

        if (limit.count < this.errorRateLimit) {
            limit.count++;

            return true;
        }

        return false;
    }
}
