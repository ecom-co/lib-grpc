/* eslint-disable complexity */
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';

import { isArray, isObject, isString, keys } from 'lodash';

import { Response } from 'express';

import { GrpcClientException } from '../client/wrapped-client-grpc';

// gRPC Status codes enum
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

// Interface cho gRPC Error
@Catch(GrpcClientException)
export class GrpcClientFilter implements ExceptionFilter {
    private readonly logger = new Logger(GrpcClientFilter.name);

    private convertGrpcError(error: GrpcClientException): {
        details?: unknown;
        error: string;
        errors?: string[];
        fieldErrors?: Record<string, Record<string, string>>;
        message: string;
        status: number;
    } {
        // Handle case where details is an Error object with nested details
        let detailsString: string | undefined;
        let grpcCode = error.code;

        if (error.details && isObject(error.details) && 'details' in error.details) {
            // Extract details from nested Error object
            const detailsObj = error.details as { code?: number; details?: string };

            detailsString = detailsObj.details;
            grpcCode = detailsObj.code || error.code;
        } else if (isString(error.details)) {
            detailsString = error.details;
        }

        return this.handleGrpcStatusError({
            code: grpcCode as GrpcStatus,
            details: detailsString,
            message: error.message,
        });
    }

    private parseValidationError(details: string): {
        errors: string[];
        fieldErrors: Record<string, Record<string, string>>;
    } {
        if (!details || !isString(details)) {
            return {
                errors: ['Invalid validation error format'],
                fieldErrors: {},
            };
        }

        try {
            const parsed = JSON.parse(details) as {
                errors?: string[];
                fieldErrors?: Record<string, Record<string, string>>;
            };

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
            this.logger.debug(
                `Failed to parse validation error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
            );

            // If parsing fails, treat as simple error message
            return {
                errors: [details],
                fieldErrors: {},
            };
        }
    }

    catch(exception: GrpcClientException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        if (response.headersSent) {
            this.logger.warn('Response already sent, cannot handle exception');

            return;
        }

        const request = ctx.getRequest<{ method?: string; url?: string }>();

        this.logException(exception, request);

        const { status, details, error, errors, fieldErrors, message } = this.convertGrpcError(exception);

        const responseBody: Record<string, unknown> = {
            error,
            message,
            path: request?.url || 'unknown',
            statusCode: status,
            timestamp: new Date().toISOString(),
        };

        if (details) {
            responseBody.details = details;
        }

        if (errors) {
            responseBody.errors = errors;
        }

        if (fieldErrors) {
            responseBody.fieldErrors = fieldErrors;
        }

        response.status(status).json(responseBody);
    }

    private handleGrpcStatusError(error: { code?: GrpcStatus; details?: string; message?: string }): {
        details?: unknown;
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
                if (error.details && isString(error.details)) {
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

    private logException(exception: GrpcClientException, request: { method?: string; url?: string }): void {
        try {
            const logError = {
                code: exception.code,
                details: exception.details,
                detailsConstructor: exception.details?.constructor?.name,
                detailsKeys: exception.details && isObject(exception.details) ? keys(exception.details) : undefined,
                detailsType: typeof exception.details,
                exceptionType: exception.constructor.name,
                message: exception.message,
                method: request?.method,
                path: request?.url,
                timestamp: new Date().toISOString(),
            };

            this.logger.error('gRPC Exception caught:', logError);

            // Log raw details for debugging
            this.logger.error('Raw details:', {
                details: exception.details,
                detailsStringified: JSON.stringify(exception.details, null, 2),
            });
        } catch {
            this.logger.error('Logging failed, basic error:', {
                message: exception.message,
                timestamp: new Date().toISOString(),
            });
        }
    }
}
