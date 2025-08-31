# Tài Liệu API

Tài liệu API hoàn chỉnh cho tất cả components, utilities và tùy chọn cấu hình trong thư viện `@ecom-co/grpc`.

:::info Tài Liệu API
Tài liệu tham chiếu toàn diện này bao gồm tất cả classes, interfaces, decorators và tùy chọn cấu hình có sẵn trong thư viện với mô tả parameters chi tiết và ví dụ sử dụng.
:::

## Core Components

### GrpcModule

Module chính để cấu hình gRPC services và global middleware.

#### Configuration Interface

```typescript
interface GrpcModuleOptions {
  configs: GrpcServiceConfig[];
  globalMiddleware?: GlobalMiddlewareConfig;
  basePath?: string;
}

interface GrpcServiceConfig {
  name: string;
  type: 'server' | 'client';
  package: string;
  port?: number;
  protoPath: string;
  enabled?: boolean;
}

interface GlobalMiddlewareConfig {
  guards?: CanActivate[];
  interceptors?: NestInterceptor[];
  pipes?: PipeTransform[];
  filters?: ExceptionFilter[];
}
```

#### Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `forRoot()` | `options: GrpcModuleOptions` | `DynamicModule` | Configure gRPC module with services and middleware |
| `forRootAsync()` | `options: GrpcAsyncOptions` | `DynamicModule` | Async configuration with factory pattern |

## Client Components

### WrappedGrpc

Enhanced gRPC client with retry, timeout, and logging capabilities.

#### Constructor

```typescript
constructor(clientGrpc: ClientGrpc, options?: GrpcOptions)
```

#### GrpcOptions Interface

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enableLogging` | `boolean` | `true` | Enable detailed request/response logging |
| `retry` | `number` | `0` | Number of retry attempts for failed requests |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetryDelay` | `number` | `10000` | Maximum delay between retries in milliseconds |
| `retryableCodes` | `number[]` | `[1,4,8,10,13,14,15]` | gRPC status codes that trigger retries |

#### Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getService<T>()` | `name: string` | `T` | Get wrapped service proxy with enhanced features |
| `getClientByServiceName<T>()` | `name: string` | `T` | Get raw client by service name |

#### Example Usage

```typescript
const options: GrpcOptions = {
  enableLogging: true,
  retry: 3,
  timeout: 15000,
  maxRetryDelay: 5000,
  retryableCodes: [1, 4, 8, 14], // CANCELLED, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, UNAVAILABLE
};

const wrappedClient = new WrappedGrpc(clientGrpc, options);
const userService = wrappedClient.getService('UserService');
```

### GrpcClientException

Exception class for gRPC client errors.

#### Constructor

```typescript
constructor(
  message: string,
  code?: number,
  details?: unknown,
  metadata?: unknown
)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error message |
| `code` | `number` | gRPC status code |
| `details` | `unknown` | Additional error details |
| `metadata` | `unknown` | gRPC metadata |

## Exception Handling

### BaseGrpcException

Abstract base class for all gRPC exceptions.

#### Constructor

```typescript
constructor(errorDetails: GrpcErrorDetails)

interface GrpcErrorDetails {
  code: GrpcStatusCodes;
  message: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

### Exception Classes

| Class | gRPC Code | HTTP Status | Constructor Parameters |
|-------|-----------|-------------|------------------------|
| `GrpcNotFoundException` | 5 | 404 | `message: string, resource?: string` |
| `GrpcUnauthorizedException` | 16 | 401 | `message?: string, reason?: string` |
| `GrpcForbiddenException` | 7 | 403 | `message?: string, requiredPermissions?: string[]` |
| `GrpcBadRequestException` | 3 | 400 | `message: string, details?: Record<string, unknown>` |
| `GrpcConflictException` | 6 | 409 | `message: string, conflictingResource?: string` |
| `GrpcInternalException` | 13 | 500 | `message?: string, cause?: Error` |
| `GrpcTimeoutException` | 4 | 504 | `message?: string, timeoutMs?: number` |
| `GrpcUnavailableException` | 14 | 503 | `message?: string, retryAfter?: number` |
| `GrpcResourceExhaustedException` | 8 | 429 | `message?: string, resourceType?: string, limit?: number, current?: number` |
| `GrpcValidationException` | 3 | 400 | `message: string, errors: unknown[], field?: string` |
| `GrpcFailedPreconditionException` | 9 | 412 | `message: string, requiredConditions?: string[]` |
| `GrpcOutOfRangeException` | 11 | 416 | `message: string, range?: {min: number, max: number, actual: number}` |
| `GrpcDataLossException` | 15 | 500 | `message?: string` |
| `GrpcCancelledException` | 1 | 499 | `message?: string, reason?: string` |
| `GrpcNotImplementedException` | 12 | 501 | `message?: string, feature?: string` |

### Utility Functions

#### createGrpcExceptionFromHttp

```typescript
function createGrpcExceptionFromHttp(
  httpStatus: number, 
  message: string
): BaseGrpcException
```

Creates appropriate gRPC exception from HTTP status code.

#### isGrpcException

```typescript
function isGrpcException(error: unknown): error is BaseGrpcException
```

Type guard to check if error is a gRPC exception.

## Filters

### GrpcExceptionFilter

Server-side exception filter for gRPC services.

#### Constructor Options

```typescript
interface GrpcExceptionFilterOptions {
  enableLogging?: boolean;
  exposeInternalErrors?: boolean;
  defaultErrorMessage?: string;
  customErrorMappings?: Record<string, new (message: string) => RpcException>;
  logger?: Logger;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableLogging` | `boolean` | `true` | Enable exception logging |
| `exposeInternalErrors` | `boolean` | `NODE_ENV !== 'production'` | Show internal error details |
| `defaultErrorMessage` | `string` | `'Unknown error occurred'` | Default error message |
| `customErrorMappings` | `Record<string, Constructor>` | `{}` | Map error types to gRPC exceptions |
| `logger` | `Logger` | `new Logger()` | Custom logger instance |

#### Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getOptions()` | - | `Required<GrpcExceptionFilterOptions>` | Get current filter options |
| `updateOptions()` | `newOptions: Partial<GrpcExceptionFilterOptions>` | `void` | Update filter options at runtime |

### GrpcClientExceptionFilter

HTTP exception filter for gRPC client errors.

#### Constructor Options

```typescript
interface GrpcClientExceptionFilterOptions {
  enableDetailedLogging?: boolean;
  enableStackTrace?: boolean;
  includeMetadata?: boolean;
  isDevelopment?: boolean;
  logLevel?: 'debug' | 'error' | 'warn';
  defaultErrorMessage?: string;
  exposeInternalErrors?: boolean;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableDetailedLogging` | `boolean` | `true` | Enable detailed error logging |
| `enableStackTrace` | `boolean` | `false` | Include stack traces in logs |
| `includeMetadata` | `boolean` | `false` | Include gRPC metadata in logs |
| `isDevelopment` | `boolean` | `false` | Development mode for debug info |
| `logLevel` | `'debug'\|'error'\|'warn'` | `'error'` | Logging level |
| `defaultErrorMessage` | `string` | `'An unexpected error occurred'` | Default error message |
| `exposeInternalErrors` | `boolean` | `false` | Expose internal error details |

## Pipes

### GrpcValidationPipe

Request validation pipe with class-validator integration.

#### Constructor Options

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataSerializer` | `Function` | `undefined` | Custom data serializer function |
| `enableErrorLogging` | `boolean` | `true` | Enable detailed error logging |
| `errorMessagePrefix` | `string` | `''` | Prefix for error messages |
| `errorSerializer` | `Function` | `undefined` | Custom error serializer function |
| `exceptionFactory` | `Function` | `undefined` | Custom exception factory function |
| `stripUnknownProperties` | `boolean` | `false` | Remove unknown properties from input |
| `transformOptions` | `ClassTransformOptions` | `{}` | class-transformer options |
| `validationGroups` | `string[]` | `[]` | Validation groups to apply |
| `validationOptions` | `ValidationOptions` | `{}` | class-validator options |

#### Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `setDataSerializer()` | `serializer: Function` | `this` | Set custom data serializer |
| `setErrorLogging()` | `enabled: boolean` | `this` | Enable/disable error logging |
| `setErrorSerializer()` | `serializer: Function` | `this` | Set custom error serializer |
| `setExceptionFactory()` | `factory: Function` | `this` | Set custom exception factory |
| `setValidationGroups()` | `groups: string[]` | `this` | Set validation groups |
| `updateOptions()` | `newOptions: Partial<GrpcValidationPipeOptions>` | `void` | Update pipe options at runtime |

## Interceptors

### GrpcLoggingInterceptor

Comprehensive logging interceptor for gRPC requests and responses.

#### Constructor Options

```typescript
interface LoggingOption {
  isDevelopment?: boolean;
  logLevel?: 'debug' | 'error' | 'info' | 'silent' | 'warn';
  logRequest?: boolean;
  logResponse?: boolean;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isDevelopment` | `boolean` | `NODE_ENV === 'development'` | Development mode flag |
| `logLevel` | `'debug'\|'error'\|'info'\|'silent'\|'warn'` | `'info'` | Logging level |
| `logRequest` | `boolean` | `NODE_ENV !== 'production'` | Log incoming requests |
| `logResponse` | `boolean` | `NODE_ENV === 'development'` | Log outgoing responses |

## Decorators

### @GrpcMethod

Enhanced gRPC method decorator with metadata support.

#### Signature

```typescript
@GrpcMethod(service: string, method: string, metadata?: Partial<GrpcMethodMetadata>)

interface GrpcMethodMetadata {
  description?: string;
  logLevel?: 'debug' | 'error' | 'info' | 'warn';
  method: string;
  rateLimit?: number;
  requiresAuth?: boolean;
  service: string;
  [key: string]: any;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service` | `string` | ✅ | Service name |
| `method` | `string` | ✅ | Method name |
| `metadata.description` | `string` | ❌ | Method description |
| `metadata.logLevel` | `string` | ❌ | Logging level for this method |
| `metadata.rateLimit` | `number` | ❌ | Rate limit for this method |
| `metadata.requiresAuth` | `boolean` | ❌ | Whether method requires authentication |

### @EnhancedOperation

Performance monitoring and caching decorator.

#### Signature

```typescript
@EnhancedOperation(options?: EnhancedOperationOptions)

interface EnhancedOperationOptions {
  operationName?: string;
  performanceThreshold?: number;
  includeArgs?: boolean;
  includeResult?: boolean;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  logger?: Logger;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `operationName` | `string` | `method name` | Operation name for monitoring |
| `performanceThreshold` | `number` | `1000` | Log warning if operation exceeds this time (ms) |
| `includeArgs` | `boolean` | `false` | Include arguments in performance logs |
| `includeResult` | `boolean` | `false` | Include result in performance logs |
| `cacheEnabled` | `boolean` | `false` | Enable result caching |
| `cacheTtl` | `number` | `300` | Cache TTL in seconds |
| `logger` | `Logger` | `new Logger()` | Custom logger instance |

### @TraceOperation

Distributed tracing decorator.

#### Signature

```typescript
@TraceOperation(options?: TraceOperationOptions)

interface TraceOperationOptions {
  operationName?: string;
  includeArgs?: boolean;
  includeResult?: boolean;
  logger?: Logger;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `operationName` | `string` | `ClassName.methodName` | Custom operation name for tracing |
| `includeArgs` | `boolean` | `false` | Include method arguments in trace logs |
| `includeResult` | `boolean` | `false` | Include method result in trace logs |
| `logger` | `Logger` | `new Logger()` | Custom logger instance |

### @MonitorPerformance

Performance monitoring decorator.

#### Signature

```typescript
@MonitorPerformance(options?: MonitorPerformanceOptions)

interface MonitorPerformanceOptions {
  threshold?: number;
  includeMemory?: boolean;
  logger?: Logger;
}

interface PerformanceMetrics {
  duration: number;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `threshold` | `number` | `1000` | Threshold in ms for slow operation warning |
| `includeMemory` | `boolean` | `false` | Include memory usage in metrics |
| `logger` | `Logger` | `new Logger()` | Custom logger instance |

### @Cacheable

Method result caching decorator.

#### Signature

```typescript
@Cacheable(options?: CacheableOptions)

interface CacheableOptions {
  ttl?: number;
  key?: string;
  logger?: Logger;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | `300` | Time to live in seconds |
| `key` | `string` | `ClassName.methodName` | Custom cache key |
| `logger` | `Logger` | `new Logger()` | Custom logger instance |

## Advanced Features

### CircuitBreakerService

Fault tolerance with circuit breaker pattern.

#### Constructor

```typescript
constructor(config: CircuitBreakerConfig)

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
}
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `failureThreshold` | `number` | ✅ | Number of failures before opening circuit |
| `recoveryTimeout` | `number` | ✅ | Time (ms) to wait before trying half-open state |
| `monitoringPeriod` | `number` | ✅ | Time window (ms) for failure counting |
| `expectedErrors` | `string[]` | ❌ | Error types that count towards failure threshold |

#### Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `execute<T>()` | `operation: () => Promise<T>` | `Promise<T>` | Execute operation with circuit breaker protection |
| `getState()` | - | `CircuitBreakerState` | Get current circuit breaker state |
| `getMetrics()` | - | `CircuitBreakerMetrics` | Get circuit breaker metrics |
| `reset()` | - | `void` | Reset circuit breaker to closed state |

#### State Interface

```typescript
interface CircuitBreakerState {
  state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  failureCount: number;
  nextAttempt: Date;
  lastFailureTime?: Date;
}

interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenCount: number;
  averageResponseTime: number;
}
```

### DistributedTracer

Distributed tracing service for observability.

#### Constructor

```typescript
constructor(options: TracingOptions)

interface TracingOptions {
  serviceName: string;
  enableSampling?: boolean;
  samplingRate?: number;
  maxSpans?: number;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serviceName` | `string` | - | Name of the service |
| `enableSampling` | `boolean` | `true` | Enable trace sampling |
| `samplingRate` | `number` | `1.0` | Sampling rate (0.0 to 1.0) |
| `maxSpans` | `number` | `10000` | Maximum number of spans to keep |

#### Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `startSpan()` | `operationName: string, parentSpanId?: string, tags?: Record<string, unknown>` | `TraceSpan` | Start a new trace span |
| `finishSpan()` | `spanId: string, status?: 'completed'\|'failed', tags?: Record<string, unknown>` | `void` | Finish a span |
| `addLog()` | `spanId: string, level: string, message: string, fields?: Record<string, unknown>` | `void` | Add log to span |
| `getActiveSpans()` | - | `TraceSpan[]` | Get all active spans |
| `getCompletedSpans()` | - | `TraceSpan[]` | Get completed spans |

#### Span Interface

```typescript
interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: bigint;
  endTime?: bigint;
  duration?: number;
  status: 'active' | 'completed' | 'failed';
  tags: Record<string, unknown>;
  logs: TraceLog[];
}

interface TraceLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}
```

## Status Codes Reference

### gRPC Status Codes

| Code | Name | HTTP Equivalent | Description |
|------|------|-----------------|-------------|
| 0 | OK | 200 | Success |
| 1 | CANCELLED | 499 | Request cancelled |
| 2 | UNKNOWN | 500 | Unknown error |
| 3 | INVALID_ARGUMENT | 400 | Invalid request |
| 4 | DEADLINE_EXCEEDED | 504 | Timeout |
| 5 | NOT_FOUND | 404 | Resource not found |
| 6 | ALREADY_EXISTS | 409 | Resource conflict |
| 7 | PERMISSION_DENIED | 403 | Access denied |
| 8 | RESOURCE_EXHAUSTED | 429 | Rate limited |
| 9 | FAILED_PRECONDITION | 412 | Precondition failed |
| 10 | ABORTED | 409 | Operation aborted |
| 11 | OUT_OF_RANGE | 416 | Range not satisfiable |
| 12 | UNIMPLEMENTED | 501 | Not implemented |
| 13 | INTERNAL | 500 | Internal error |
| 14 | UNAVAILABLE | 503 | Service unavailable |
| 15 | DATA_LOSS | 500 | Data corruption |
| 16 | UNAUTHENTICATED | 401 | Authentication required |

## Utility Functions

### createWrappedGrpc

Factory function to create enhanced gRPC client.

```typescript
function createWrappedGrpc(
  clientGrpc: ClientGrpc, 
  options?: GrpcOptions
): WrappedGrpc
```

### Error Transformation

```typescript
// Convert HTTP status to gRPC exception
function createGrpcExceptionFromHttp(
  httpStatus: number, 
  message: string
): BaseGrpcException

// Type guard for gRPC exceptions
function isGrpcException(error: unknown): error is BaseGrpcException

// Create custom gRPC exception
function createGrpcException(
  code: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 
        'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'RESOURCE_EXHAUSTED' |
        'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' |
        'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS' | 'UNAUTHENTICATED',
  message: string,
  details?: Record<string, unknown>
): BaseGrpcException
```

## Environment Variables

The library respects several environment variables for configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `'development'` | Environment mode |
| `GRPC_LOG_LEVEL` | `'info'` | Default logging level |
| `GRPC_ENABLE_TRACING` | `'true'` | Enable distributed tracing |
| `GRPC_SAMPLING_RATE` | `'1.0'` | Trace sampling rate |
| `GRPC_TIMEOUT` | `'30000'` | Default timeout in ms |
| `GRPC_RETRY_COUNT` | `'3'` | Default retry count |

## Migration Guide

### From v1.0 to v1.1

1. **Global Middleware**: Update configuration structure
2. **Exception Classes**: Use new structured exception classes
3. **Client Options**: Update to new GrpcOptions interface
4. **Decorators**: Migrate to enhanced decorators

### Breaking Changes

- `GrpcExceptionFilter` constructor options changed
- `WrappedGrpc` options interface updated
- Decorator metadata structure modified

:::tip Best Practices
- Use specific exception types rather than generic ones
- Configure appropriate timeouts for different operations
- Enable sampling in production to reduce overhead
- Use caching for expensive operations
- Monitor circuit breaker metrics in production
:::

:::note TypeScript Support
All components include full TypeScript definitions with strict typing. Use the provided interfaces for optimal IDE support and compile-time safety.
:::

This API reference provides complete coverage of all available functionality in the `@ecom-co/grpc` library with detailed parameter descriptions and usage examples.