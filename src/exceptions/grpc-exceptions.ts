import { RpcException } from '@nestjs/microservices';

export enum GrpcStatusCodes {
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
interface GrpcErrorDetails {
    code: GrpcStatusCodes;
    details?: Record<string, unknown>;
    message: string;
    metadata?: Record<string, unknown>;
}

export abstract class BaseGrpcException extends RpcException {
    constructor(errorDetails: GrpcErrorDetails) {
        super({
            code: errorDetails.code,
            details: errorDetails.details,
            message: errorDetails.message,
        });
    }
}

export class GrpcAbortedException extends BaseGrpcException {
    constructor(message: string = 'Operation aborted', reason?: string) {
        super({
            code: GrpcStatusCodes.ABORTED,
            details: {
                type: 'ABORTED_ERROR',
                reason,
            },
            message: reason ? `${message}: ${reason}` : message,
        });
    }
}

export class GrpcBadRequestException extends BaseGrpcException {
    constructor(message: string, details?: Record<string, unknown>) {
        super({
            code: GrpcStatusCodes.INVALID_ARGUMENT,
            details: details ? { ...details, type: 'BAD_REQUEST_ERROR' } : { type: 'BAD_REQUEST_ERROR' },
            message,
        });
    }
}

export class GrpcCancelledException extends BaseGrpcException {
    constructor(message: string = 'Request cancelled', reason?: string) {
        super({
            code: GrpcStatusCodes.CANCELLED,
            details: {
                type: 'CANCELLED_ERROR',
                reason,
            },
            message: reason ? `${message}: ${reason}` : message,
        });
    }
}

export class GrpcConflictException extends BaseGrpcException {
    constructor(message: string, conflictingResource?: string) {
        super({
            code: GrpcStatusCodes.ALREADY_EXISTS,
            details: conflictingResource
                ? {
                      type: 'CONFLICT_ERROR',
                      conflictingResource,
                  }
                : { type: 'CONFLICT_ERROR' },
            message: conflictingResource ? `Resource conflict with ${conflictingResource}: ${message}` : message,
        });
    }
}

// Additional missing status codes for completeness
export class GrpcDataLossException extends BaseGrpcException {
    constructor(message: string = 'Data loss detected') {
        super({
            code: GrpcStatusCodes.DATA_LOSS,
            details: {
                type: 'DATA_LOSS_ERROR',
            },
            message,
        });
    }
}

export class GrpcFailedPreconditionException extends BaseGrpcException {
    constructor(message: string, requiredConditions?: string[]) {
        super({
            code: GrpcStatusCodes.FAILED_PRECONDITION,
            details: {
                type: 'FAILED_PRECONDITION_ERROR',
                requiredConditions,
            },
            message,
        });
    }
}

export class GrpcForbiddenException extends BaseGrpcException {
    constructor(message: string = 'Forbidden', requiredPermissions?: string[]) {
        super({
            code: GrpcStatusCodes.PERMISSION_DENIED,
            details: {
                type: 'AUTHORIZATION_ERROR',
                requiredPermissions,
            },
            message,
        });
    }
}

export class GrpcInternalException extends BaseGrpcException {
    constructor(message: string = 'Internal server error', cause?: Error) {
        super({
            code: GrpcStatusCodes.INTERNAL,
            details: cause
                ? {
                      type: 'INTERNAL_ERROR',
                      originalError: cause.message,
                      stack: process.env.NODE_ENV === 'development' ? cause.stack : undefined,
                  }
                : { type: 'INTERNAL_ERROR' },
            message,
        });
    }
}

export class GrpcNotFoundException extends BaseGrpcException {
    constructor(message: string, resource?: string) {
        super({
            code: GrpcStatusCodes.NOT_FOUND,
            details: resource ? { type: 'NOT_FOUND_ERROR', resource } : undefined,
            message: resource ? `${resource} not found: ${message}` : message,
        });
    }
}

export class GrpcNotImplementedException extends BaseGrpcException {
    constructor(message: string = 'Not implemented', feature?: string) {
        super({
            code: GrpcStatusCodes.UNIMPLEMENTED,
            details: {
                type: 'NOT_IMPLEMENTED_ERROR',
                feature,
            },
            message: feature ? `Feature '${feature}' is not implemented: ${message}` : message,
        });
    }
}

export class GrpcOutOfRangeException extends BaseGrpcException {
    constructor(message: string, range?: { actual: number; max: number; min: number }) {
        super({
            code: GrpcStatusCodes.OUT_OF_RANGE,
            details: {
                type: 'OUT_OF_RANGE_ERROR',
                range,
            },
            message: range ? `${message}. Expected: ${range.min}-${range.max}, got: ${range.actual}` : message,
        });
    }
}

export class GrpcResourceExhaustedException extends BaseGrpcException {
    constructor(message: string = 'Resource exhausted', resourceType?: string, limit?: number, current?: number) {
        super({
            code: GrpcStatusCodes.RESOURCE_EXHAUSTED,
            details: {
                type: 'RESOURCE_EXHAUSTED_ERROR',
                current,
                limit,
                resourceType,
                usage: limit && current ? `${current}/${limit}` : undefined,
            },
            message: resourceType ? `${resourceType} resource exhausted: ${message}` : message,
        });
    }
}

export class GrpcTimeoutException extends BaseGrpcException {
    constructor(message: string = 'Request timeout', timeoutMs?: number) {
        super({
            code: GrpcStatusCodes.DEADLINE_EXCEEDED,
            details: {
                type: 'TIMEOUT_ERROR',
                timeoutMs,
            },
            message: timeoutMs ? `${message} (${timeoutMs}ms)` : message,
        });
    }
}

export class GrpcUnauthorizedException extends BaseGrpcException {
    constructor(message: string = 'Unauthorized', reason?: string) {
        super({
            code: GrpcStatusCodes.UNAUTHENTICATED,
            details: {
                type: 'AUTHENTICATION_ERROR',
                reason,
            },
            message: reason ? `${message}: ${reason}` : message,
        });
    }
}

export class GrpcUnavailableException extends BaseGrpcException {
    constructor(message: string = 'Service unavailable', retryAfter?: number) {
        super({
            code: GrpcStatusCodes.UNAVAILABLE,
            details: {
                type: 'UNAVAILABLE_ERROR',
                retryAfter,
            },
            message,
        });
    }
}

export class GrpcValidationException extends BaseGrpcException {
    constructor(message: string, errors: unknown[], field?: string) {
        super({
            code: GrpcStatusCodes.INVALID_ARGUMENT,
            details: {
                type: 'VALIDATION_ERROR',
                count: errors.length,
                errors: JSON.stringify(errors),
                ...(field && { field }),
            },
            message: message ? message : 'Data validation failed',
        });
    }
}

// Utility function to create exceptions from HTTP status codes
export const createGrpcExceptionFromHttp = (httpStatus: number, message: string): BaseGrpcException => {
    switch (httpStatus) {
        case 400:
            return new GrpcBadRequestException(message);

        case 401:
            return new GrpcUnauthorizedException(message);

        case 403:
            return new GrpcForbiddenException(message);

        case 404:
            return new GrpcNotFoundException(message);

        case 409:
            return new GrpcConflictException(message);

        case 412:
            return new GrpcFailedPreconditionException(message);

        case 429:
            return new GrpcResourceExhaustedException(message);

        case 499:
            return new GrpcCancelledException(message);

        case 500:
            return new GrpcInternalException(message);

        case 501:
            return new GrpcNotImplementedException(message);

        case 503:
            return new GrpcUnavailableException(message);

        case 504:
            return new GrpcTimeoutException(message);

        default:
            return new GrpcInternalException(`HTTP ${httpStatus}: ${message}`);
    }
};

// Type guard utility
export const isGrpcException = (error: unknown): error is BaseGrpcException =>
    error instanceof BaseGrpcException || error instanceof RpcException;

// Unified payload contract for transporting gRPC error data between layers
export interface GrpcErrorPayload {
    code: GrpcStatusCodes;
    details?: unknown;
    message: string;
    metadata?: unknown;
}

export const isGrpcErrorPayload = (e: unknown): e is GrpcErrorPayload =>
    !!e &&
    typeof (e as { code?: unknown }).code === 'number' &&
    typeof (e as { message?: unknown }).message === 'string';

/**
 * Convert an unknown error/payload into a BaseGrpcException matching the provided gRPC status code.
 * - Preserves message/details/metadata when available.
 * - Falls back to INTERNAL on unknown inputs.
 */
export const toBaseGrpcException = (e: unknown): BaseGrpcException => {
    // If it's already a BaseGrpcException, return as-is
    if (e instanceof BaseGrpcException) {
        return e;
    }

    // RpcException that may wrap a payload
    if (e instanceof RpcException) {
        const inner = e.getError();

        if (isGrpcErrorPayload(inner)) {
            return mapPayloadToBaseException(inner);
        }

        // Best-effort mapping from generic RpcException
        return new GrpcInternalException(typeof inner === 'string' ? inner : 'Internal server error');
    }

    // Raw payload from transport
    if (isGrpcErrorPayload(e)) {
        return mapPayloadToBaseException(e);
    }

    // Generic Error
    if (e instanceof Error) {
        return new GrpcInternalException(e.message, e);
    }

    return new GrpcInternalException('Internal server error');
};

/**
 * Helper: map GrpcErrorPayload to a specific BaseGrpcException subclass.
 */
type GrpcExceptionFactory = (p: GrpcErrorPayload) => BaseGrpcException;

const FACTORY_BY_CODE: Partial<Record<GrpcStatusCodes, GrpcExceptionFactory>> = {
    [GrpcStatusCodes.ABORTED]: (p) => new GrpcAbortedException(p.message),
    [GrpcStatusCodes.ALREADY_EXISTS]: (p) => new GrpcConflictException(p.message),
    [GrpcStatusCodes.CANCELLED]: (p) => new GrpcCancelledException(p.message),
    [GrpcStatusCodes.DATA_LOSS]: (p) => new GrpcDataLossException(p.message),
    [GrpcStatusCodes.DEADLINE_EXCEEDED]: (p) => new GrpcTimeoutException(p.message),
    [GrpcStatusCodes.FAILED_PRECONDITION]: (p) => new GrpcFailedPreconditionException(p.message),
    [GrpcStatusCodes.INTERNAL]: (p) => new GrpcInternalException(p.message),
    [GrpcStatusCodes.INVALID_ARGUMENT]: (p) =>
        new GrpcBadRequestException(p.message, (p.details as Record<string, unknown>) || undefined),
    [GrpcStatusCodes.NOT_FOUND]: (p) => new GrpcNotFoundException(p.message),
    [GrpcStatusCodes.OUT_OF_RANGE]: (p) => new GrpcOutOfRangeException(p.message),
    [GrpcStatusCodes.PERMISSION_DENIED]: (p) => new GrpcForbiddenException(p.message),
    [GrpcStatusCodes.RESOURCE_EXHAUSTED]: (p) => new GrpcResourceExhaustedException(p.message),
    [GrpcStatusCodes.UNAUTHENTICATED]: (p) => new GrpcUnauthorizedException(p.message),
    [GrpcStatusCodes.UNAVAILABLE]: (p) => new GrpcUnavailableException(p.message),
    [GrpcStatusCodes.UNIMPLEMENTED]: (p) => new GrpcNotImplementedException(p.message),
    [GrpcStatusCodes.UNKNOWN]: (p) => new GrpcInternalException(p.message),
};

const mapPayloadToBaseException = (p: GrpcErrorPayload): BaseGrpcException =>
    (FACTORY_BY_CODE[p.code] ?? ((x) => new GrpcInternalException(x.message)))(p);
