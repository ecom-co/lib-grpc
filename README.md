# gRPC Library

A comprehensive gRPC utilities library for NestJS applications with enterprise-grade features.

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
    - [Install](#install)
    - [Use Enhanced Decorators](#use-enhanced-decorators)
    - [Add Exception Filters](#add-exception-filters)
    - [Use Validation Pipe](#use-validation-pipe)
    - [Add Logging Interceptor](#add-logging-interceptor)
- [Available Utilities](#available-utilities)
    - [Decorators](#decorators)
    - [Filters](#filters)
    - [Pipes](#pipes)
    - [Interceptors](#interceptors)
    - [Exceptions](#exceptions)
    - [Enhancements](#enhancements)
- [Configuration Options](#configuration-options)
    - [GrpcExceptionFilter Options](#grpcexceptionfilter-options)
    - [GrpcClientExceptionFilter Options](#grpcclientexceptionfilter-options)
    - [GrpcValidationPipe Options](#grpcvalidationpipe-options)
    - [GrpcLoggingInterceptor Options](#grpclogginginterceptor-options)
- [gRPC Client Module](#grpc-client-module)
    - [Features](#features-2)
    - [Basic Usage](#basic-usage-1)
    - [Advanced Configuration](#advanced-configuration-1)
    - [Error Handling](#error-handling)
    - [Integration with Exception Filter](#integration-with-exception-filter)
    - [Logging Features](#logging-features)
    - [Best Practices](#best-practices-2)
- [gRPC Exception Filter](#grpc-exception-filter)
    - [Features](#features-1)
    - [Exception Transformation Rules](#exception-transformation-rules)
    - [Basic Usage](#basic-usage)
    - [Advanced Configuration](#advanced-configuration)
    - [Runtime Configuration](#runtime-configuration)
    - [Exception Handling Examples](#exception-handling-examples)
    - [Error Response Structure](#error-response-structure)
    - [Best Practices](#best-practices)
    - [Integration with Other Filters](#integration-with-other-filters)
- [gRPC to HTTP Error Mapping](#grpc-to-http-error-mapping)
    - [Network Error Handling](#network-error-handling)
- [gRPC Exceptions](#grpc-exceptions)
    - [Available Exception Classes](#available-exception-classes)
    - [Basic Exceptions](#basic-exceptions)
    - [Advanced Exceptions](#advanced-exceptions)
    - [Validation Exception](#validation-exception)
    - [Utility Functions](#utility-functions)
    - [Exception Details Structure](#exception-details-structure)
    - [Best Practices](#best-practices-1)
- [Example Usage](#example-usage)
    - [Basic gRPC Service](#basic-grpc-service)
    - [HTTP Service with gRPC Client](#http-service-with-grpc-client)
    - [Error Response Format](#error-response-format)
- [Advanced Features](#advanced-features)
    - [Circuit Breaker](#circuit-breaker)
    - [Distributed Tracing](#distributed-tracing)
- [Benefits](#benefits)
- [License](#license)

## Features

- 🎯 **Enhanced Decorators**: `@GrpcMethod()` with metadata support
- 🛡️ **Exception Handling**: `GrpcExceptionFilter` and `GrpcClientExceptionFilter` for proper error handling
- ✅ **Validation**: `GrpcValidationPipe` for request validation
- 📝 **Logging**: `GrpcLoggingInterceptor` for comprehensive request/response logging
- 🔧 **Client Wrapper**: `WrappedGrpc` with built-in logging, retry, and timeout capabilities
- ⚡ **Circuit Breaker**: Built-in circuit breaker pattern for resilience
- 🔍 **Distributed Tracing**: Distributed tracing capabilities
- 🌐 **HTTP Integration**: Convert gRPC errors to HTTP responses seamlessly
- 🎨 **Clean API**: Simple and intuitive interface

## Quick Start

### Install

```bash
npm install @ecom-co/grpc
```

### Use Enhanced Decorators

```typescript
import { GrpcMethod } from '@ecom-co/grpc';

@Controller()
export class UserController {
    @GrpcMethod('user', 'getUser', {
        description: 'Get user by ID',
        requiresAuth: true,
        rateLimit: 100,
    })
    async getUser(data: { id: string }) {
        return { id: data.id, name: 'John Doe' };
    }
}
```

### Add Exception Filters

#### For gRPC Services

```typescript
import { GrpcExceptionFilter } from '@ecom-co/grpc';

// Basic usage
app.useGlobalFilters(new GrpcExceptionFilter());

// With options
app.useGlobalFilters(
    new GrpcExceptionFilter({
        enableLogging: true,
        exposeInternalErrors: process.env.NODE_ENV !== 'production',
        defaultErrorMessage: 'An unexpected error occurred',
        customErrorMappings: {
            CustomError: CustomGrpcException,
        },
    }),
);
```

#### For HTTP Services (gRPC to HTTP)

```typescript
import { GrpcClientExceptionFilter } from '@ecom-co/grpc';

// Basic usage
app.useGlobalFilters(new GrpcClientExceptionFilter());

// With advanced options
app.useGlobalFilters(
    new GrpcClientExceptionFilter({
        enableDetailedLogging: true,
        enableStackTrace: process.env.NODE_ENV !== 'production',
        includeMetadata: false,
        isDevelopment: process.env.NODE_ENV !== 'production',
        logLevel: 'error',
        defaultErrorMessage: 'Service temporarily unavailable',
        exposeInternalErrors: process.env.NODE_ENV !== 'production',
    }),
);
```

### Use Validation Pipe

```typescript
import { GrpcValidationPipe } from '@ecom-co/grpc';

// Basic usage
app.useGlobalPipes(new GrpcValidationPipe());

// With options
app.useGlobalPipes(
    new GrpcValidationPipe({
        enableErrorLogging: true,
        stripUnknownProperties: true,
        errorMessagePrefix: 'Request validation failed',
        validationOptions: {
            whitelist: true,
            forbidNonWhitelisted: true,
        },
    }),
);
```

### Add Logging Interceptor

```typescript
import { GrpcLoggingInterceptor } from '@ecom-co/grpc';

app.useGlobalInterceptors(new GrpcLoggingInterceptor());
```

## Available Utilities

### Decorators

- `@GrpcMethod(service, method, metadata?)` - Enhanced gRPC method decorator with metadata support
- `@Cacheable(options)` - Cache method results
- `@TraceOperation()` - Add distributed tracing
- `@MonitorPerformance()` - Monitor method performance

### Filters

- `GrpcExceptionFilter` - Handle gRPC exceptions properly
- `GrpcClientExceptionFilter` - Convert gRPC client errors to HTTP responses with detailed error mapping

### Pipes

- `GrpcValidationPipe` - Validate gRPC requests

### Interceptors

- `GrpcLoggingInterceptor` - Comprehensive request/response logging with correlation IDs

### Exceptions

- **BaseGrpcException** - Abstract base class for all gRPC exceptions
- **GrpcBadRequestException** - Invalid argument errors (400 equivalent)
- **GrpcUnauthorizedException** - Authentication errors (401 equivalent)
- **GrpcForbiddenException** - Authorization errors (403 equivalent)
- **GrpcNotFoundException** - Resource not found errors (404 equivalent)
- **GrpcConflictException** - Resource conflict errors (409 equivalent)
- **GrpcValidationException** - Data validation errors
- **GrpcTimeoutException** - Request timeout errors (408 equivalent)
- **GrpcInternalException** - Internal server errors (500 equivalent)
- **GrpcUnavailableException** - Service unavailable errors (503 equivalent)
- **GrpcResourceExhaustedException** - Rate limiting errors (429 equivalent)
- **GrpcCancelledException** - Request cancellation errors
- **GrpcAbortedException** - Operation abortion errors
- **GrpcDataLossException** - Data corruption errors
- **GrpcFailedPreconditionException** - Precondition failure errors (412 equivalent)
- **GrpcNotImplementedException** - Unimplemented feature errors (501 equivalent)
- **GrpcOutOfRangeException** - Value out of range errors

### Enhancements

- **Circuit Breaker**: `CircuitBreakerModule` and `CircuitBreakerService` for fault tolerance
- **Distributed Tracing**: `TracingModule` and `DistributedTracerService` for request tracking
- **Performance Monitoring**: Built-in performance monitoring capabilities

### Client

- **WrappedGrpc**: Enhanced gRPC client wrapper with logging, retry, and timeout capabilities
- **GrpcClientException**: Custom exception class for gRPC client errors
- **createWrappedGrpc**: Factory function to create wrapped gRPC clients

## Configuration Options

### GrpcExceptionFilter Options

```typescript
interface GrpcExceptionFilterOptions {
    customErrorMappings?: Record<string, new (message: string) => RpcException>;
    defaultErrorMessage?: string;
    enableLogging?: boolean;
    exposeInternalErrors?: boolean;
    logger?: Logger;
}
```

### GrpcClientExceptionFilter Options

```typescript
interface GrpcClientExceptionFilterOptions {
    enableDetailedLogging?: boolean; // Enable detailed error logging
    enableStackTrace?: boolean; // Include stack traces in logs
    includeMetadata?: boolean; // Include gRPC metadata in logs
    isDevelopment?: boolean; // Development mode for debug info
    logLevel?: 'debug' | 'error' | 'warn'; // Logging level
    defaultErrorMessage?: string; // Default error message for unknown errors
    exposeInternalErrors?: boolean; // Expose internal error details in production
}
```

### GrpcValidationPipe Options

```typescript
interface GrpcValidationPipeOptions {
    dataSerializer?: <T>(data: T) => T;
    enableErrorLogging?: boolean;
    errorMessagePrefix?: string;
    errorSerializer?: (errors: ValidationError[]) => ValidationErrorInfo[];
    exceptionFactory?: (message: string, errors: ValidationErrorInfo[]) => BaseGrpcException;
    stripUnknownProperties?: boolean;
    transformOptions?: ClassTransformOptions;
    validationGroups?: string[];
    validationOptions?: ValidationOptions;
}
```

### GrpcLoggingInterceptor Options

```typescript
interface LoggingOption {
    isDevelopment?: boolean;
    logLevel?: 'debug' | 'error' | 'info' | 'silent' | 'warn';
    logRequest?: boolean;
    logResponse?: boolean;
}
```

## gRPC Client Module

The gRPC Client module provides enhanced client capabilities with built-in logging, retry mechanisms, timeout handling, and error management.

### Features

- **Enhanced Logging**: Automatic request/response logging with sensitive data sanitization
- **Retry Mechanism**: Configurable retry logic for failed requests with selective retryable error codes
- **Timeout Handling**: Automatic timeout management for long-running requests
- **Error Wrapping**: Consistent error handling with `GrpcClientException`
- **Proxy-based Wrapping**: Transparent service method wrapping without code changes
- **Sensitive Data Protection**: Automatic redaction of sensitive fields in logs

### Basic Usage

```typescript
import { createWrappedGrpc, WrappedGrpc } from '@ecom-co/grpc';
import { ClientGrpc } from '@nestjs/microservices';

// Create a wrapped gRPC client
const wrappedClient = createWrappedGrpc(originalClientGrpc, {
    enableLogging: true,
    retry: 3,
    timeout: 30000, // 30 seconds
    maxRetryDelay: 8000, // 8 seconds max delay between retries
    retryableCodes: [4, 8, 14], // Only retry timeout, rate limit, and unavailable errors
});

// Use the wrapped client
const userService = wrappedClient.getService('UserService');
const result = await userService.getUser({ id: '123' }).toPromise();
```

### Advanced Configuration

```typescript
import { createWrappedGrpc, GrpcOptions } from '@ecom-co/grpc';

const options: GrpcOptions = {
    enableLogging: process.env.NODE_ENV !== 'production',
    retry: 5,
    timeout: 60000, // 1 minute
    maxRetryDelay: 10000, // 10 seconds max delay between retries
    retryableCodes: [
        1, // CANCELLED
        4, // DEADLINE_EXCEEDED
        8, // RESOURCE_EXHAUSTED
        10, // ABORTED
        13, // INTERNAL
        14, // UNAVAILABLE
        15, // DATA_LOSS
    ],
};

const wrappedClient = createWrappedGrpc(originalClientGrpc, options);
```

### Error Handling

The `GrpcClientException` provides structured error information:

```typescript
import { GrpcClientException } from '@ecom-co/grpc';

try {
    const result = await userService.getUser({ id: '123' }).toPromise();
} catch (error) {
    if (error instanceof GrpcClientException) {
        console.log('gRPC Error Code:', error.code);
        console.log('Error Details:', error.details);
        console.log('Error Metadata:', error.metadata);
        console.log('Error Message:', error.message);
    }
}
```

### Integration with Exception Filter

The `GrpcClientExceptionFilter` works seamlessly with the wrapped client:

```typescript
import { GrpcClientExceptionFilter } from '@ecom-co/grpc';

// Configure the filter to handle GrpcClientException
app.useGlobalFilters(
    new GrpcClientExceptionFilter({
        enableDetailedLogging: true,
        enableStackTrace: process.env.NODE_ENV !== 'production',
        includeMetadata: false,
        isDevelopment: process.env.NODE_ENV !== 'production',
        logLevel: 'error',
        defaultErrorMessage: 'Service temporarily unavailable',
        exposeInternalErrors: process.env.NODE_ENV !== 'production',
    }),
);
```

### Runtime Configuration

You can update filter options at runtime:

```typescript
import { GrpcClientExceptionFilter } from '@ecom-co/grpc';

const filter = new GrpcClientExceptionFilter({
    enableDetailedLogging: true,
    exposeInternalErrors: false,
});

// Update options at runtime
filter.updateOptions({
    enableDetailedLogging: false,
    exposeInternalErrors: true,
});

// Get current options
const currentOptions = filter.getOptions();
console.log('Current options:', currentOptions);
```

### Logging Features

The wrapped client automatically logs requests and responses:

```typescript
// Request logging (with sanitized sensitive data)
// DEBUG: Calling gRPC method: UserService.getUser
// {
//   "args": [
//     {
//       "id": "123",
//       "password": "[REDACTED]"
//     }
//   ]
// }

// Error logging
// ERROR: gRPC Error in UserService.getUser:
// {
//   "error": {
//     "name": "GrpcClientException",
//     "code": 5,
//     "message": "User not found"
//   },
//   "method": "getUser",
//   "service": "UserService"
// }
```

### Best Practices

#### 1. Configure Timeouts Appropriately

```typescript
const options: GrpcOptions = {
    timeout: 30000, // 30 seconds for most operations
    retry: 2,
};

// For long-running operations
const longRunningOptions: GrpcOptions = {
    timeout: 300000, // 5 minutes
    retry: 1,
};
```

#### 2. Handle Retries Carefully

```typescript
const options: GrpcOptions = {
    retry: 3, // Retry up to 3 times
    timeout: 10000, // 10 second timeout per attempt
    maxRetryDelay: 5000, // 5 seconds max delay between retries
    retryableCodes: [
        4, // DEADLINE_EXCEEDED - timeout errors
        8, // RESOURCE_EXHAUSTED - rate limiting
        14, // UNAVAILABLE - service temporarily down
    ],
};
```

#### 3. Use in NestJS Services

```typescript
import { Injectable } from '@nestjs/common';
import { createWrappedGrpc, WrappedGrpc } from '@ecom-co/grpc';

@Injectable()
export class UserService {
    private readonly wrappedClient: WrappedGrpc;

    constructor(private readonly clientGrpc: ClientGrpc) {
        this.wrappedClient = createWrappedGrpc(clientGrpc, {
            enableLogging: true,
            retry: 2,
            timeout: 30000,
            maxRetryDelay: 5000, // 5 seconds max delay
        });
    }

    async getUser(id: string) {
        const userService = this.wrappedClient.getService('UserService');
        return await userService.getUser({ id }).toPromise();
    }
}
```

#### 4. Error Handling Patterns

```typescript
async getUser(id: string) {
    try {
        const userService = this.wrappedClient.getService('UserService');
        return await userService.getUser({ id }).toPromise();
    } catch (error) {
        if (error instanceof GrpcClientException) {
            switch (error.code) {
                case 5: // NOT_FOUND
                    throw new NotFoundException('User not found');
                case 7: // PERMISSION_DENIED
                    throw new ForbiddenException('Access denied');
                case 14: // UNAVAILABLE
                    throw new ServiceUnavailableException('Service unavailable');
                default:
                    throw new InternalServerErrorException('Internal server error');
            }
        }
        throw error;
    }
}
```

## gRPC Exception Filter

The `GrpcExceptionFilter` is a comprehensive exception filter that transforms various types of exceptions into appropriate gRPC exceptions, ensuring consistent error handling across your gRPC services.

### Features

- **Automatic Exception Transformation**: Converts HTTP exceptions, validation errors, and generic errors to gRPC exceptions
- **Custom Error Mappings**: Define custom mappings for specific error types
- **Flexible Logging**: Configurable logging with custom logger support
- **Runtime Configuration**: Update filter options at runtime
- **Production Safety**: Hide internal error details in production

### Exception Transformation Rules

The filter automatically transforms different exception types:

| Input Exception       | Transformed To              | gRPC Status Code      |
| --------------------- | --------------------------- | --------------------- |
| `HttpException` (400) | `GrpcBadRequestException`   | INVALID_ARGUMENT (3)  |
| `HttpException` (401) | `GrpcUnauthorizedException` | UNAUTHENTICATED (16)  |
| `HttpException` (403) | `GrpcForbiddenException`    | PERMISSION_DENIED (7) |
| `HttpException` (404) | `GrpcNotFoundException`     | NOT_FOUND (5)         |
| `HttpException` (408) | `GrpcTimeoutException`      | DEADLINE_EXCEEDED (4) |
| `HttpException` (409) | `GrpcConflictException`     | ALREADY_EXISTS (6)    |
| `HttpException` (503) | `GrpcUnavailableException`  | UNAVAILABLE (14)      |
| `ValidationError[]`   | `GrpcValidationException`   | INVALID_ARGUMENT (3)  |
| `ConnectionError`     | `GrpcUnavailableException`  | UNAVAILABLE (14)      |
| `TimeoutError`        | `GrpcTimeoutException`      | DEADLINE_EXCEEDED (4) |
| `ValidationError`     | `GrpcValidationException`   | INVALID_ARGUMENT (3)  |
| Generic `Error`       | `GrpcInternalException`     | INTERNAL (13)         |

### Basic Usage

```typescript
import { GrpcExceptionFilter } from '@ecom-co/grpc';

// Basic usage
app.useGlobalFilters(new GrpcExceptionFilter());

// With options
app.useGlobalFilters(
    new GrpcExceptionFilter({
        enableLogging: true,
        exposeInternalErrors: process.env.NODE_ENV !== 'production',
        defaultErrorMessage: 'An unexpected error occurred',
    }),
);
```

### Advanced Configuration

```typescript
import { GrpcExceptionFilter, GrpcCustomException } from '@ecom-co/grpc';

// Custom error mappings
app.useGlobalFilters(
    new GrpcExceptionFilter({
        customErrorMappings: {
            DatabaseConnectionError: GrpcUnavailableException,
            BusinessLogicError: GrpcBadRequestException,
            CustomError: GrpcCustomException,
        },
        enableLogging: true,
        exposeInternalErrors: process.env.NODE_ENV !== 'production',
        defaultErrorMessage: 'Service temporarily unavailable',
        logger: new Logger('CustomGrpcFilter'),
    }),
);
```

### Runtime Configuration

```typescript
import { GrpcExceptionFilter } from '@ecom-co/grpc';

const filter = new GrpcExceptionFilter({
    enableLogging: true,
    exposeInternalErrors: false,
});

// Update options at runtime
filter.updateOptions({
    enableLogging: false,
    exposeInternalErrors: true,
});

// Get current options
const currentOptions = filter.getOptions();
console.log('Current options:', currentOptions);
```

### Exception Handling Examples

#### HTTP Exception Transformation

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';
import { GrpcExceptionFilter } from '@ecom-co/grpc';

@Controller()
export class UserController {
    constructor(private readonly grpcFilter: GrpcExceptionFilter) {}

    @GrpcMethod('user', 'getUser')
    async getUser(data: { id: string }) {
        if (!data.id) {
            // This will be transformed to GrpcBadRequestException
            throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
        }

        const user = await this.userService.findById(data.id);
        if (!user) {
            // This will be transformed to GrpcNotFoundException
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }
}
```

#### Validation Error Handling

```typescript
import { ValidationError } from 'class-validator';
import { GrpcExceptionFilter } from '@ecom-co/grpc';

@Controller()
export class UserController {
    @GrpcMethod('user', 'createUser')
    async createUser(data: CreateUserDto) {
        // Validation errors will be automatically transformed
        const errors: ValidationError[] = await validate(data);
        if (errors.length > 0) {
            // This will be transformed to GrpcValidationException
            throw errors;
        }

        return await this.userService.create(data);
    }
}
```

#### Custom Error Handling

```typescript
import { GrpcExceptionFilter } from '@ecom-co/grpc';

// Custom error class
class DatabaseConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseConnectionError';
    }
}

@Controller()
export class UserController {
    @GrpcMethod('user', 'getUser')
    async getUser(data: { id: string }) {
        try {
            return await this.userService.findById(data.id);
        } catch (error) {
            if (error instanceof DatabaseConnectionError) {
                // This will be transformed using custom mapping
                throw error;
            }
            throw error;
        }
    }
}

// Configure filter with custom mapping
app.useGlobalFilters(
    new GrpcExceptionFilter({
        customErrorMappings: {
            DatabaseConnectionError: GrpcUnavailableException,
        },
    }),
);
```

### Error Response Structure

The filter transforms exceptions into standardized gRPC error responses:

```typescript
// Example: Validation Error Response
{
    code: 3, // INVALID_ARGUMENT
    details: {
        type: 'VALIDATION_ERROR',
        count: 2,
        errors: '["Email is required", "Password too short"]'
    },
    message: 'Validation failed'
}

// Example: HTTP Exception Response
{
    code: 5, // NOT_FOUND
    details: {
        type: 'NOT_FOUND_ERROR',
        resource: 'user'
    },
    message: 'User not found'
}

// Example: Internal Error Response (Production)
{
    code: 13, // INTERNAL
    details: {
        type: 'INTERNAL_ERROR'
    },
    message: 'Internal server error' // Generic message in production
}
```

### Best Practices

#### 1. Configure for Environment

```typescript
const filter = new GrpcExceptionFilter({
    enableLogging: true,
    exposeInternalErrors: process.env.NODE_ENV !== 'production',
    defaultErrorMessage:
        process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : 'An unexpected error occurred',
});
```

#### 2. Use Custom Error Mappings

```typescript
// Define custom error mappings for domain-specific errors
const filter = new GrpcExceptionFilter({
    customErrorMappings: {
        UserNotFoundError: GrpcNotFoundException,
        InvalidCredentialsError: GrpcUnauthorizedException,
        RateLimitExceededError: GrpcResourceExhaustedException,
        ServiceUnavailableError: GrpcUnavailableException,
    },
});
```

#### 3. Handle Specific Exception Types

```typescript
@GrpcMethod('user', 'getUser')
async getUser(data: { id: string }) {
    try {
        const user = await this.userService.findById(data.id);
        if (!user) {
            // Use specific gRPC exception
            throw new GrpcNotFoundException('User not found', 'user');
        }
        return user;
    } catch (error) {
        // Let the filter handle transformation
        throw error;
    }
}
```

#### 4. Monitor and Log Errors

```typescript
const filter = new GrpcExceptionFilter({
    enableLogging: true,
    logger: new Logger('GrpcErrorMonitor'),
    exposeInternalErrors: process.env.NODE_ENV !== 'production',
});

// The filter will automatically log all exceptions with details
```

### Integration with Other Filters

```typescript
import { GrpcExceptionFilter, GrpcClientExceptionFilter } from '@ecom-co/grpc';

// For gRPC services
app.useGlobalFilters(
    new GrpcExceptionFilter({
        enableLogging: true,
        exposeInternalErrors: process.env.NODE_ENV !== 'production',
    }),
);

// For HTTP services that call gRPC
app.useGlobalFilters(
    new GrpcClientExceptionFilter({
        enableDetailedLogging: true,
        enableStackTrace: process.env.NODE_ENV !== 'production',
        includeMetadata: false,
        isDevelopment: process.env.NODE_ENV !== 'production',
        logLevel: 'error',
        defaultErrorMessage: 'Service temporarily unavailable',
        exposeInternalErrors: process.env.NODE_ENV !== 'production',
    }),
);
```

````

## gRPC to HTTP Error Mapping

The `GrpcClientExceptionFilter` provides comprehensive mapping from gRPC status codes to HTTP status codes:

| gRPC Status               | HTTP Status | Description           |
| ------------------------- | ----------- | --------------------- |
| `OK` (0)                  | 200         | Success               |
| `CANCELLED` (1)           | 408         | Request Timeout       |
| `UNKNOWN` (2)             | 500         | Internal Server Error |
| `INVALID_ARGUMENT` (3)    | 400         | Bad Request           |
| `DEADLINE_EXCEEDED` (4)   | 408         | Request Timeout       |
| `NOT_FOUND` (5)           | 404         | Not Found             |
| `ALREADY_EXISTS` (6)      | 409         | Conflict              |
| `PERMISSION_DENIED` (7)   | 403         | Forbidden             |
| `RESOURCE_EXHAUSTED` (8)  | 429         | Too Many Requests     |
| `FAILED_PRECONDITION` (9) | 412         | Precondition Failed   |
| `ABORTED` (10)            | 409         | Conflict              |
| `OUT_OF_RANGE` (11)       | 400         | Bad Request           |
| `UNIMPLEMENTED` (12)      | 501         | Not Implemented       |
| `INTERNAL` (13)           | 500         | Internal Server Error |
| `UNAVAILABLE` (14)        | 503         | Service Unavailable   |
| `DATA_LOSS` (15)          | 500         | Internal Server Error |
| `UNAUTHENTICATED` (16)    | 401         | Unauthorized          |

### Network Error Handling

The filter also handles various network and connection errors:

- **Connection Refused**: `ECONNREFUSED` → 503 Service Unavailable
- **Host Not Found**: `ENOTFOUND` → 503 Service Unavailable
- **Connection Timeout**: `ETIMEDOUT` → 408 Request Timeout
- **Channel Closed**: → 503 Service Unavailable
- **Service Definition Not Found**: → 500 Internal Server Error

## gRPC Exceptions

The library provides a comprehensive set of gRPC exception classes that map to standard HTTP status codes and gRPC status codes.

### Available Exception Classes

#### Basic Exceptions

```typescript
import {
    GrpcBadRequestException,
    GrpcUnauthorizedException,
    GrpcForbiddenException,
    GrpcNotFoundException,
    GrpcConflictException,
    GrpcValidationException,
    GrpcTimeoutException,
    GrpcInternalException,
    GrpcUnavailableException,
    GrpcResourceExhaustedException,
} from '@ecom-co/grpc';

// 400 Bad Request
throw new GrpcBadRequestException('Invalid user data', { field: 'email' });

// 401 Unauthorized
throw new GrpcUnauthorizedException('Invalid credentials', 'Token expired');

// 403 Forbidden
throw new GrpcForbiddenException('Insufficient permissions', ['admin', 'moderator']);

// 404 Not Found
throw new GrpcNotFoundException('User not found', 'user');

// 409 Conflict
throw new GrpcConflictException('Email already exists', 'email');

// 408 Timeout
throw new GrpcTimeoutException('Request timed out', 5000);

// 500 Internal Server Error
throw new GrpcInternalException('Database connection failed', new Error('Connection refused'));

// 503 Service Unavailable
throw new GrpcUnavailableException('Service temporarily unavailable', 30);

// 429 Too Many Requests
throw new GrpcResourceExhaustedException('Rate limit exceeded', 'requests', 100, 150);
````

#### Advanced Exceptions

```typescript
import {
    GrpcCancelledException,
    GrpcAbortedException,
    GrpcDataLossException,
    GrpcFailedPreconditionException,
    GrpcNotImplementedException,
    GrpcOutOfRangeException,
} from '@ecom-co/grpc';

// Request Cancellation
throw new GrpcCancelledException('Request was cancelled by client', 'User cancelled');

// Operation Aborted
throw new GrpcAbortedException('Operation was aborted', 'Concurrent modification');

// Data Loss
throw new GrpcDataLossException('Data corruption detected during transfer');

// Precondition Failed
throw new GrpcFailedPreconditionException('User must be verified before posting', ['email_verified', 'phone_verified']);

// Not Implemented
throw new GrpcNotImplementedException('Feature not available', 'real_time_chat');

// Out of Range
throw new GrpcOutOfRangeException('Page number out of range', { actual: 100, min: 1, max: 50 });
```

### Validation Exception

```typescript
import { GrpcValidationException } from '@ecom-co/grpc';

// Simple validation error
throw new GrpcValidationException('Validation failed', ['Email is required', 'Password too short']);

// Field-specific validation error
throw new GrpcValidationException('Email validation failed', ['Invalid email format'], 'email');
```

### Utility Functions

#### Convert HTTP Status to gRPC Exception

```typescript
import { createGrpcExceptionFromHttp } from '@ecom-co/grpc';

// Convert HTTP status codes to appropriate gRPC exceptions
const exception = createGrpcExceptionFromHttp(404, 'User not found');
// Returns: GrpcNotFoundException

const exception2 = createGrpcExceptionFromHttp(429, 'Rate limit exceeded');
// Returns: GrpcResourceExhaustedException
```

#### Type Guard

```typescript
import { isGrpcException } from '@ecom-co/grpc';

// Check if an error is a gRPC exception
if (isGrpcException(error)) {
    // Handle gRPC exception
    console.log('gRPC Error Code:', error.getError().code);
}
```

### Exception Details Structure

All gRPC exceptions include structured error details:

```typescript
// Example: GrpcValidationException
{
    code: 3, // INVALID_ARGUMENT
    details: {
        type: 'VALIDATION_ERROR',
        count: 2,
        errors: '["Email is required", "Password too short"]',
        field: 'email'
    },
    message: 'Validation failed'
}

// Example: GrpcResourceExhaustedException
{
    code: 8, // RESOURCE_EXHAUSTED
    details: {
        type: 'RESOURCE_EXHAUSTED_ERROR',
        resourceType: 'requests',
        limit: 100,
        current: 150,
        usage: '150/100'
    },
    message: 'requests resource exhausted: Rate limit exceeded'
}
```

### Best Practices

#### 1. Use Specific Exceptions

```typescript
// ✅ Good: Use specific exception
if (!user) {
    throw new GrpcNotFoundException('User not found', 'user');
}

// ❌ Avoid: Generic error
if (!user) {
    throw new Error('User not found');
}
```

#### 2. Include Relevant Details

```typescript
// ✅ Good: Include helpful details
throw new GrpcBadRequestException('Invalid input', {
    field: 'email',
    value: 'invalid-email',
    expected: 'valid email format',
});

// ❌ Avoid: Generic message
throw new GrpcBadRequestException('Invalid input');
```

#### 3. Handle Exceptions Properly

```typescript
try {
    const result = await userService.createUser(userData);
    return result;
} catch (error) {
    if (error instanceof GrpcConflictException) {
        // Handle conflict specifically
        throw new GrpcConflictException('User already exists', 'email');
    }

    // Re-throw other gRPC exceptions
    if (isGrpcException(error)) {
        throw error;
    }

    // Wrap unknown errors
    throw new GrpcInternalException('Unexpected error occurred', error);
}
```

#### 4. Use Utility Functions for HTTP Integration

```typescript
// When integrating with HTTP services
try {
    const response = await httpClient.get('/api/users/123');
    return response.data;
} catch (error) {
    if (error.response) {
        // Convert HTTP error to gRPC exception
        throw createGrpcExceptionFromHttp(error.response.status, error.response.data.message || 'HTTP request failed');
    }

    // Handle network errors
    throw new GrpcUnavailableException('Service unavailable');
}
```

## Example Usage

### Basic gRPC Service

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { GrpcMethod, GrpcExceptionFilter, GrpcValidationPipe, GrpcLoggingInterceptor } from '@ecom-co/grpc';
import { AppModule } from './app.module';

// Your service
@Controller()
export class UserService {
    @GrpcMethod('user', 'getUser', {
        description: 'Get user by ID',
        requiresAuth: true,
        rateLimit: 100,
    })
    async getUser(data: { id: string }) {
        if (!data.id) {
            throw new Error('User ID is required');
        }
        return { id: data.id, name: 'John Doe' };
    }
}

// Bootstrap
async function bootstrap() {
    const app = await NestFactory.createMicroservice(AppModule, {
        transport: Transport.GRPC,
        options: {
            package: 'user',
            protoPath: 'user.proto',
            url: '0.0.0.0:50052',
        },
    });

    app.useGlobalFilters(
        new GrpcExceptionFilter({
            enableLogging: true,
            exposeInternalErrors: process.env.NODE_ENV !== 'production',
        }),
    );
    app.useGlobalPipes(
        new GrpcValidationPipe({
            enableErrorLogging: true,
            stripUnknownProperties: true,
        }),
    );
    app.useGlobalInterceptors(
        new GrpcLoggingInterceptor({
            logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
            logRequest: process.env.NODE_ENV !== 'production',
            logResponse: process.env.NODE_ENV === 'development',
        }),
    );

    await app.listen();
}

bootstrap();
```

### HTTP Service with gRPC Client

```typescript
import { NestFactory } from '@nestjs/core';
import { GrpcClientExceptionFilter, GrpcValidationPipe, GrpcLoggingInterceptor } from '@ecom-co/grpc';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Configure gRPC to HTTP exception filter
    app.useGlobalFilters(
        new GrpcClientExceptionFilter({
            enableDetailedLogging: true,
            enableStackTrace: process.env.NODE_ENV !== 'production',
            includeMetadata: false,
            isDevelopment: process.env.NODE_ENV !== 'production',
            logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
            defaultErrorMessage: 'Service temporarily unavailable',
            exposeInternalErrors: process.env.NODE_ENV !== 'production',
        }),
    );

    app.useGlobalPipes(
        new GrpcValidationPipe({
            enableErrorLogging: true,
            stripUnknownProperties: true,
        }),
    );

    app.useGlobalInterceptors(
        new GrpcLoggingInterceptor({
            logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
        }),
    );

    await app.listen(3000);
}

bootstrap();
```

### Error Response Format

The `GrpcClientExceptionFilter` returns structured error responses:

```json
{
    "statusCode": 400,
    "message": "Validation failed",
    "error": "VALIDATION_ERROR",
    "path": "/api/users",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "errors": ["User ID is required", "Email format is invalid"],
    "fieldErrors": {
        "email": {
            "format": "Invalid email format"
        }
    },
    "debug": {
        "grpcCode": 3,
        "originalError": "INVALID_ARGUMENT: Validation failed"
    }
}
```

## Advanced Features

### Circuit Breaker

```typescript
import { CircuitBreakerModule } from '@ecom-co/grpc';

@Module({
    imports: [CircuitBreakerModule],
    // ...
})
export class AppModule {}
```

### Distributed Tracing

```typescript
import { TracingModule } from '@ecom-co/grpc';

@Module({
    imports: [TracingModule],
    // ...
})
export class AppModule {}
```

## Benefits

- 🚀 **Enterprise Ready**: Built for production with circuit breakers and tracing
- 🎯 **Enhanced Logging**: Comprehensive logging with correlation IDs and request tracking
- 🌐 **HTTP Integration**: Seamless gRPC to HTTP error conversion
- 🔧 **Flexible**: Use what you need, ignore the rest
- 📚 **Simple**: Easy to understand and use
- 🛡️ **Robust**: Built-in error handling, validation, and resilience patterns
- 📊 **Observable**: Built-in monitoring and tracing capabilities
- 🔍 **Detailed Error Mapping**: Comprehensive gRPC to HTTP status code mapping

## License

ISC
