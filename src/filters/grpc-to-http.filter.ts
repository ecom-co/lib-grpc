/* eslint-disable complexity */
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HttpStatus, Logger } from '@nestjs/common';

import { includes, isArray, keys, size, some, toLower, values } from 'lodash';

import type { RpcException } from '@nestjs/microservices';
import type { Request, Response } from 'express';

export enum GrpcStatus {
    ABORTED = 10,
    ALREADY_EXISTS = 6,
    CANCELLED = 1,
    DATA_LOSS = 15,
    DEADLINE_EXCEEDED = 4,
    FAILED_PRECONDITION = 9,
    INTERNAL = 13,
    INVALID_ARGUMENT = 3,
    NOT_FOUND = 5,
    OK = 0,
    OUT_OF_RANGE = 11,
    PERMISSION_DENIED = 7,
    RESOURCE_EXHAUSTED = 8,
    UNAUTHENTICATED = 16,
    UNAVAILABLE = 14,
    UNIMPLEMENTED = 12,
    UNKNOWN = 2,
}

// Configuration options for HttpGrpcExceptionFilter
export interface HttpGrpcExceptionFilterOptions {
    enableDetailedLogging?: boolean;
    enableStackTrace?: boolean;
    includeMetadata?: boolean;
    isDevelopment?: boolean;
    logLevel?: 'debug' | 'error' | 'warn';
}

interface ErrorResponse {
    debug?: {
        grpcCode?: GrpcStatus;
        originalError?: string;
    };
    error?: string;
    errors?: string[];
    fieldErrors?: Record<string, Record<string, string>>;
    message: string;
    path?: string;
    statusCode: number;
    timestamp: string;
}

// Interface cho gRPC Error
interface GrpcError {
    code?: GrpcStatus;
    details?: string;
    message?: string;
    metadata?: unknown;
}

// Interface cho Network Error
interface NetworkError extends Error {
    address?: string;
    code?: string;
    errno?: number;
    port?: number;
    syscall?: string;
}

// Parsed validation error interface
interface ParsedValidationError {
    errors?: string[];
    fieldErrors?: Record<string, Record<string, string>>;
}

// Interface cho RPC Exception
// Type guard functions
const isGrpcError = (error: unknown): error is GrpcError => {
    if (!error || typeof error !== 'object') return false;

    const grpcError = error as GrpcError;

    return grpcError.code !== undefined && includes(values(GrpcStatus), grpcError.code);
};

const isNetworkError = (error: unknown): error is NetworkError => {
    if (!error || typeof error !== 'object') return false;

    const networkError = error as NetworkError;
    const errorMessage = networkError.message || '';
    const errorStack = networkError.stack || '';

    // More specific gRPC network error patterns
    const grpcNetworkErrors = [
        'ECONNREFUSED',
        'connect ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'No service definition',
        'Channel closed',
        'grpc',
        'RPC',
        '@grpc/grpc-js', // gRPC library specific
        'grpc-status-details-bin', // gRPC metadata
    ];

    // Check both message and stack for gRPC-specific patterns
    const messageMatch = some(grpcNetworkErrors, (errorType) => includes(toLower(errorMessage), toLower(errorType)));

    const stackMatch = some(['@grpc/grpc-js', 'grpc'], (pattern) => includes(toLower(errorStack), toLower(pattern)));

    return messageMatch || stackMatch;
};

const isRpcException = (error: unknown): error is RpcException => {
    if (!error || typeof error !== 'object') return false;

    const rpcError = error as RpcException;

    // More robust check for RpcException
    return (
        rpcError.name === 'RpcException' ||
        (typeof rpcError.getError === 'function' && rpcError.constructor?.name === 'RpcException')
    );
};

export class HttpGrpcExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpGrpcExceptionFilter.name);
    private readonly options: Required<HttpGrpcExceptionFilterOptions>;

    constructor(options: HttpGrpcExceptionFilterOptions = {}) {
        this.options = {
            enableDetailedLogging: options.enableDetailedLogging ?? true,
            enableStackTrace: options.enableStackTrace ?? process.env.NODE_ENV !== 'production',
            includeMetadata: options.includeMetadata ?? false,
            isDevelopment: options.isDevelopment ?? process.env.NODE_ENV !== 'production',
            logLevel: options.logLevel ?? 'error',
        };
    }

    private buildErrorResponse(
        exception: unknown,
        request: Request,
        errorData: {
            error: string;
            errors?: string[];
            fieldErrors?: Record<string, Record<string, string>>;
            message: string;
            status: number;
        },
    ): ErrorResponse {
        const baseResponse: ErrorResponse = {
            error: errorData.error,
            message: errorData.message,
            path: request?.url || 'unknown',
            statusCode: errorData.status,
            timestamp: new Date().toISOString(),
        };

        // Add optional fields only if they exist
        if (errorData.errors?.length) {
            baseResponse.errors = errorData.errors;
        }

        if (errorData.fieldErrors && size(keys(errorData.fieldErrors)) > 0) {
            baseResponse.fieldErrors = errorData.fieldErrors;
        }

        // Add debug info only in development
        if (this.options.isDevelopment) {
            baseResponse.debug = {
                grpcCode: isGrpcError(exception) ? exception.code : undefined,
                originalError: exception instanceof Error ? exception.message : undefined,
            };
        }

        return baseResponse;
    }

    private convertGrpcError(error: unknown): {
        error: string;
        errors?: string[];
        fieldErrors?: Record<string, Record<string, string>>;
        message: string;
        status: number;
    } {
        // Handle gRPC status codes
        if (isGrpcError(error)) {
            return this.handleGrpcStatusError(error);
        }

        // Handle RPC Exception
        if (isRpcException(error)) {
            return this.handleRpcException(error);
        }

        // Handle network/connection errors
        if (isNetworkError(error)) {
            return this.handleNetworkError(error);
        }

        // Default fallback for any other error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'INTERNAL_SERVER_ERROR',
            message: errorMessage || 'An unexpected error occurred',
        };
    }

    private parseValidationError(details: string): {
        errors: string[];
        fieldErrors: Record<string, Record<string, string>>;
    } {
        if (!details || typeof details !== 'string') {
            return {
                errors: ['Invalid validation error format'],
                fieldErrors: {},
            };
        }

        try {
            const parsed = JSON.parse(details) as ParsedValidationError;

            if (parsed.errors && isArray(parsed.errors)) {
                return {
                    errors: parsed.errors,
                    fieldErrors: parsed.fieldErrors || {},
                };
            }

            // Fallback: treat as simple error message
            return {
                errors: [details],
                fieldErrors: {},
            };
        } catch (parseError: unknown) {
            if (this.options.enableDetailedLogging) {
                const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';

                this.logger.debug(`[HttpGrpcExceptionFilter] Failed to parse validation error: ${errorMessage}`);
            }

            // If parsing fails, treat as simple error message
            return {
                errors: [details],
                fieldErrors: {},
            };
        }
    }

    catch(exception: unknown, host: ArgumentsHost) {
        try {
            // Only handle gRPC exceptions
            if (!this.isGrpcException(exception)) {
                throw exception;
            }

            const ctx = host.switchToHttp();
            const response = ctx.getResponse<Response>();

            if (response.headersSent) {
                this.logger.warn('[HttpGrpcExceptionFilter] Response already sent, cannot handle exception');

                return;
            }

            const request = ctx.getRequest<Request>();

            this.logException(exception, request);

            const { status, error, errors, fieldErrors, message } = this.convertGrpcError(exception);
            const errorResponse = this.buildErrorResponse(exception, request, {
                status,
                error,
                errors,
                fieldErrors,
                message,
            });

            return response.status(status).json(errorResponse);
        } catch (filterError) {
            // Fallback: if filter itself fails, log and re-throw
            this.logger.error('[HttpGrpcExceptionFilter] Filter failed:', {
                filterError: filterError instanceof Error ? filterError.message : 'Unknown filter error',
                originalException: exception instanceof Error ? exception.message : 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw exception; // Re-throw original exception
        }
    }

    private handleGrpcStatusError(error: GrpcError): {
        error: string;
        errors?: string[];
        fieldErrors?: Record<string, Record<string, string>>;
        message: string;
        status: number;
    } {
        switch (error.code) {
            case GrpcStatus.ABORTED:
                return {
                    status: HttpStatus.CONFLICT,
                    error: 'ABORTED',
                    message: error.details || 'Operation was aborted',
                };

            case GrpcStatus.ALREADY_EXISTS:
                return {
                    status: HttpStatus.CONFLICT,
                    error: 'ALREADY_EXISTS',
                    message: error.details || 'Resource already exists',
                };

            case GrpcStatus.CANCELLED:
                return {
                    status: HttpStatus.REQUEST_TIMEOUT,
                    error: 'CANCELLED',
                    message: error.details || 'Request was cancelled',
                };

            case GrpcStatus.DATA_LOSS:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'DATA_LOSS',
                    message: error.details || 'Data loss detected',
                };

            case GrpcStatus.DEADLINE_EXCEEDED:
                return {
                    status: HttpStatus.REQUEST_TIMEOUT,
                    error: 'DEADLINE_EXCEEDED',
                    message: error.details || 'Request deadline exceeded',
                };

            case GrpcStatus.FAILED_PRECONDITION:
                return {
                    status: HttpStatus.PRECONDITION_FAILED,
                    error: 'FAILED_PRECONDITION',
                    message: error.details || 'Failed precondition',
                };

            case GrpcStatus.INTERNAL:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'INTERNAL',
                    message: error.details || 'Internal server error',
                };

            case GrpcStatus.INVALID_ARGUMENT:
                // Special handling for validation errors
                if (error.details && typeof error.details === 'string') {
                    const { errors, fieldErrors } = this.parseValidationError(error.details);

                    return {
                        status: HttpStatus.BAD_REQUEST,
                        error: 'VALIDATION_ERROR',
                        errors,
                        fieldErrors,
                        message: 'Validation failed',
                    };
                }

                return {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'INVALID_ARGUMENT',
                    message: error.details || 'Invalid argument provided',
                };

            case GrpcStatus.NOT_FOUND:
                return {
                    status: HttpStatus.NOT_FOUND,
                    error: 'NOT_FOUND',
                    message: error.details || 'Resource not found',
                };

            case GrpcStatus.OK:
                return {
                    status: HttpStatus.OK,
                    error: 'OK',
                    message: 'Success',
                };

            case GrpcStatus.OUT_OF_RANGE:
                return {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'OUT_OF_RANGE',
                    message: error.details || 'Value out of range',
                };

            case GrpcStatus.PERMISSION_DENIED:
                return {
                    status: HttpStatus.FORBIDDEN,
                    error: 'PERMISSION_DENIED',
                    message: error.details || 'Permission denied',
                };

            case GrpcStatus.RESOURCE_EXHAUSTED:
                return {
                    status: HttpStatus.TOO_MANY_REQUESTS,
                    error: 'RESOURCE_EXHAUSTED',
                    message: error.details || 'Resource exhausted',
                };

            case GrpcStatus.UNAUTHENTICATED:
                return {
                    status: HttpStatus.UNAUTHORIZED,
                    error: 'UNAUTHENTICATED',
                    message: error.details || 'Authentication required',
                };

            case GrpcStatus.UNAVAILABLE:
                return {
                    status: HttpStatus.SERVICE_UNAVAILABLE,
                    error: 'UNAVAILABLE',
                    message: error.details || 'Service unavailable',
                };

            case GrpcStatus.UNIMPLEMENTED:
                return {
                    status: HttpStatus.NOT_IMPLEMENTED,
                    error: 'UNIMPLEMENTED',
                    message: error.details || 'Method not implemented',
                };

            case GrpcStatus.UNKNOWN:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'UNKNOWN',
                    message: error.details || 'Unknown error occurred',
                };

            default:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'UNKNOWN_GRPC_CODE',
                    message: error.details || `Unknown gRPC error code: ${String(error.code)}`,
                };
        }
    }

    private handleNetworkError(error: NetworkError): {
        error: string;
        message: string;
        status: number;
    } {
        const errorMessage = error.message || '';

        // Handle network/connection errors
        if (includes(errorMessage, 'ECONNREFUSED') || includes(errorMessage, 'connect ECONNREFUSED')) {
            return {
                status: HttpStatus.SERVICE_UNAVAILABLE,
                error: 'CONNECTION_REFUSED',
                message: 'Unable to connect to gRPC service',
            };
        }

        if (includes(errorMessage, 'ENOTFOUND')) {
            return {
                status: HttpStatus.SERVICE_UNAVAILABLE,
                error: 'HOST_NOT_FOUND',
                message: 'gRPC service host not found',
            };
        }

        if (includes(errorMessage, 'ETIMEDOUT')) {
            return {
                status: HttpStatus.REQUEST_TIMEOUT,
                error: 'CONNECTION_TIMEOUT',
                message: 'Connection to gRPC service timed out',
            };
        }

        // Handle gRPC client errors
        if (includes(errorMessage, 'No service definition')) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: 'SERVICE_DEFINITION_NOT_FOUND',
                message: 'gRPC service definition not found',
            };
        }

        if (includes(errorMessage, 'Channel closed')) {
            return {
                status: HttpStatus.SERVICE_UNAVAILABLE,
                error: 'CHANNEL_CLOSED',
                message: 'gRPC channel is closed',
            };
        }

        // Default network error
        return {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            error: 'NETWORK_ERROR',
            message: errorMessage || 'Network error occurred',
        };
    }

    private handleRpcException(error: RpcException): {
        error: string;
        errors?: string[];
        fieldErrors?: Record<string, Record<string, string>>;
        message: string;
        status: number;
    } {
        const rpcError = error.getError ? error.getError() : { message: error.message };

        // Check if it's a gRPC error wrapped in RpcException
        if (typeof rpcError === 'object' && rpcError !== null && 'code' in rpcError) {
            const grpcCode = (rpcError as { code: number }).code;

            if (includes(values(GrpcStatus), grpcCode)) {
                return this.handleGrpcStatusError({
                    code: grpcCode as GrpcStatus,
                    details: (rpcError as { details?: string }).details,
                    message: (rpcError as { message?: string }).message,
                });
            }
        }

        return {
            status: (rpcError as { statusCode?: number }).statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'RPC_EXCEPTION',
            message: (rpcError as { message?: string }).message || 'RPC error occurred',
        };
    }

    private isGrpcException(exception: unknown): boolean {
        return isGrpcError(exception) || isRpcException(exception) || isNetworkError(exception);
    }

    private logException(exception: unknown, request: Request): void {
        try {
            if (!this.options.enableDetailedLogging) return;

            const logError = {
                code: isGrpcError(exception) ? exception.code : undefined,
                details: isGrpcError(exception) ? exception.details : undefined,
                message: exception instanceof Error ? exception.message : 'Unknown error',
                method: request?.method,
                path: request?.url,
                timestamp: new Date().toISOString(),
                ...(this.options.enableStackTrace && {
                    stack: exception instanceof Error ? exception.stack : undefined,
                }),
                ...(this.options.includeMetadata &&
                    isGrpcError(exception) && {
                        metadata: exception.metadata,
                    }),
            };

            switch (this.options.logLevel) {
                case 'debug':
                    this.logger.debug('[HttpGrpcExceptionFilter] gRPC Exception caught:', logError);
                    break;

                case 'warn':
                    this.logger.warn('[HttpGrpcExceptionFilter] gRPC Exception caught:', logError);
                    break;

                default:
                    this.logger.error('[HttpGrpcExceptionFilter] gRPC Exception caught:', logError);
            }
        } catch {
            this.logger.error('[HttpGrpcExceptionFilter] Logging failed, basic error:', {
                message: exception instanceof Error ? exception.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    }
}
