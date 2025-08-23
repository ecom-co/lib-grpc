import { Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';

import { ValidationError } from 'class-validator';

import { every, isArray } from 'lodash';

import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

import {
    GrpcBadRequestException,
    GrpcConflictException,
    GrpcForbiddenException,
    GrpcInternalException,
    GrpcNotFoundException,
    GrpcTimeoutException,
    GrpcUnauthorizedException,
    GrpcUnavailableException,
    GrpcValidationException,
} from '../exceptions';

interface GrpcExceptionFilterOptions {
    /** Custom error mapping for specific error names */
    customErrorMappings?: Record<string, new (message: string) => RpcException>;
    /** Custom error message for unknown exceptions */
    defaultErrorMessage?: string;
    /** Whether to log exceptions */
    enableLogging?: boolean;
    /** Whether to expose internal error details in production */
    exposeInternalErrors?: boolean;
    /** Custom logger instance */
    logger?: Logger;
}

interface HttpExceptionResponse {
    [key: string]: unknown;
    error?: string;
    message?: string | string[];
    statusCode?: number;
}

interface ValidationErrorResponse {
    [key: string]: unknown;
    errors?: unknown[] | ValidationError[];
    message?: string | string[];
}

@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
    private readonly logger: Logger;
    private options: Required<GrpcExceptionFilterOptions>;

    constructor(options: GrpcExceptionFilterOptions = {}) {
        this.options = {
            customErrorMappings: options.customErrorMappings ?? {},
            defaultErrorMessage: options.defaultErrorMessage ?? 'Unknown error occurred',
            enableLogging: options.enableLogging ?? true,
            exposeInternalErrors: options.exposeInternalErrors ?? process.env.NODE_ENV !== 'production',
            logger: options.logger ?? new Logger(GrpcExceptionFilter.name),
        };
        this.logger = this.options.logger;
    }

    /**
     * Get current filter options
     */
    getOptions(): Required<GrpcExceptionFilterOptions> {
        return this.options;
    }

    /**
     * Update filter options at runtime
     */
    updateOptions(newOptions: Partial<GrpcExceptionFilterOptions>): void {
        this.options = {
            ...this.options,
            ...newOptions,
        };
    }

    private transformToGrpcException(exception: unknown): RpcException {
        if (exception instanceof HttpException) {
            return this.handleHttpException(exception);
        }

        if (isArray(exception) && every(exception, (e) => e instanceof ValidationError)) {
            return new GrpcValidationException('Validation failed', exception);
        }

        if (exception instanceof ValidationError) {
            return new GrpcValidationException('Validation failed', [exception]);
        }

        if (exception instanceof Error) {
            return this.handleGenericError(exception);
        }

        return this.handleUnknownException(exception);
    }

    catch(exception: unknown): Observable<never> {
        if (this.options.enableLogging) {
            this.logger.error('Exception caught by GrpcExceptionFilter:', {
                name: exception?.constructor?.name,
                message: this.extractMessage(exception),
                stack: exception instanceof Error ? exception.stack : undefined,
            });
        }

        if (exception instanceof RpcException) {
            if (this.options.enableLogging) {
                this.logger.debug('RpcException passed through:', exception.getError());
            }

            return throwError(() => exception.getError());
        }

        const grpcException = this.transformToGrpcException(exception);

        if (this.options.enableLogging) {
            this.logger.debug('Transformed to gRPC exception:', grpcException.getError());
        }

        return throwError(() => grpcException.getError());
    }

    private extractHttpExceptionMessage(response: HttpExceptionResponse): string {
        if (typeof response === 'string') {
            return response;
        }

        if (response?.message) {
            return isArray(response.message) ? response.message.join(', ') : response.message;
        }

        return response?.error || 'HTTP Exception';
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
    private extractMessage(exception: unknown): string {
        if (typeof exception === 'string') {
            return exception;
        }

        if (exception && typeof exception === 'object') {
            const obj = exception as Record<string, unknown>;

            if (typeof obj.message === 'string') {
                return obj.message;
            }

            if (isArray(obj.message) && every(obj.message, (m) => typeof m === 'string')) {
                return obj.message.join(', ');
            }

            if (obj.response && typeof obj.response === 'object') {
                const response = obj.response as Record<string, unknown>;

                if (typeof response.message === 'string') {
                    return response.message;
                }

                if (isArray(response.message) && every(response.message, (m) => typeof m === 'string')) {
                    return response.message.join(', ');
                }
            }
        }

        return 'Unknown error';
    }

    private handleGenericError(error: Error): RpcException {
        const message = error.message || this.options.defaultErrorMessage;

        // Check custom error mappings first
        if (this.options.customErrorMappings[error.name]) {
            return new this.options.customErrorMappings[error.name](message);
        }

        switch (error.name) {
            case 'ConnectionError':
                return new GrpcUnavailableException(message);

            case 'TimeoutError':
                return new GrpcTimeoutException(message);

            case 'ValidationError':
                return new GrpcValidationException(message, [error]);

            default:
                return new GrpcInternalException(this.options.exposeInternalErrors ? message : 'Internal server error');
        }
    }

    private handleHttpException(exception: HttpException): RpcException {
        const status = exception.getStatus();
        const response = exception.getResponse() as HttpExceptionResponse;
        const message = this.extractHttpExceptionMessage(response);

        switch (status) {
            case 400:
                if (this.isValidationError(response)) {
                    return new GrpcValidationException(message, (response as ValidationErrorResponse).errors || []);
                }

                return new GrpcBadRequestException(message, response);

            case 401:
                return new GrpcUnauthorizedException(message);

            case 403:
                return new GrpcForbiddenException(message);

            case 404:
                return new GrpcNotFoundException(message);

            case 408:
                return new GrpcTimeoutException(message);

            case 409:
                return new GrpcConflictException(message);

            case 503:
                return new GrpcUnavailableException(message);

            default:
                return new GrpcInternalException(this.options.exposeInternalErrors ? message : 'Internal server error');
        }
    }

    private handleUnknownException(exception: unknown): RpcException {
        if (this.options.enableLogging) {
            this.logger.error('Unhandled exception type:', {
                type: typeof exception,
                constructor: exception?.constructor?.name,
                value: exception,
            });
        }

        const message = this.extractMessage(exception) || this.options.defaultErrorMessage;

        return new GrpcInternalException(this.options.exposeInternalErrors ? message : 'Internal server error');
    }

    private isValidationError(response: HttpExceptionResponse): boolean {
        const validationResponse = response as ValidationErrorResponse;

        return !!(validationResponse?.errors && isArray(validationResponse.errors));
    }
}
