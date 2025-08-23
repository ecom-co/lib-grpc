# gRPC Library

A comprehensive gRPC utilities library for NestJS applications with enterprise-grade features.

## Features

- 🎯 **Enhanced Decorators**: `@GrpcMethod()` with metadata support
- 🛡️ **Exception Handling**: `GrpcExceptionFilter` for proper error handling
- ✅ **Validation**: `GrpcValidationPipe` for request validation
- 📝 **Logging**: `GrpcLoggingInterceptor` for comprehensive request/response logging
- ⚡ **Circuit Breaker**: Built-in circuit breaker pattern for resilience
- 🔍 **Distributed Tracing**: Distributed tracing capabilities
- 🎨 **Clean API**: Simple and intuitive interface

## Quick Start

### 1. Install

```bash
npm install @ecom-co/grpc
```

### 2. Use Enhanced Decorators

```typescript
import { GrpcMethod } from '@ecom-co/grpc';

@Controller()
export class UserController {
    @GrpcMethod('user', 'getUser', {
        description: 'Get user by ID',
        requiresAuth: true,
        rateLimit: 100
    })
    async getUser(data: { id: string }) {
        return { id: data.id, name: 'John Doe' };
    }
}
```

### 3. Add Exception Filter

```typescript
import { GrpcExceptionFilter } from '@ecom-co/grpc';

// Basic usage
app.useGlobalFilters(new GrpcExceptionFilter());

// With options
app.useGlobalFilters(new GrpcExceptionFilter({
    enableLogging: true,
    exposeInternalErrors: process.env.NODE_ENV !== 'production',
    defaultErrorMessage: 'An unexpected error occurred',
    customErrorMappings: {
        'CustomError': CustomGrpcException
    }
}));
```

### 4. Use Validation Pipe

```typescript
import { GrpcValidationPipe } from '@ecom-co/grpc';

// Basic usage
app.useGlobalPipes(new GrpcValidationPipe());

// With options
app.useGlobalPipes(new GrpcValidationPipe({
    enableErrorLogging: true,
    stripUnknownProperties: true,
    errorMessagePrefix: 'Request validation failed',
    validationOptions: {
        whitelist: true,
        forbidNonWhitelisted: true
    }
}));
```

### 5. Add Logging Interceptor

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

### Pipes
- `GrpcValidationPipe` - Validate gRPC requests

### Interceptors
- `GrpcLoggingInterceptor` - Comprehensive request/response logging with correlation IDs

### Enhancements
- **Circuit Breaker**: `CircuitBreakerModule` and `CircuitBreakerService` for fault tolerance
- **Distributed Tracing**: `TracingModule` and `DistributedTracerService` for request tracking
- **Performance Monitoring**: Built-in performance monitoring capabilities

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

## Example Usage

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { 
    GrpcMethod, 
    GrpcExceptionFilter, 
    GrpcValidationPipe,
    GrpcLoggingInterceptor 
} from '@ecom-co/grpc';
import { AppModule } from './app.module';

// Your service
@Controller()
export class UserService {
    @GrpcMethod('user', 'getUser', {
        description: 'Get user by ID',
        requiresAuth: true,
        rateLimit: 100
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

    app.useGlobalFilters(new GrpcExceptionFilter({
        enableLogging: true,
        exposeInternalErrors: process.env.NODE_ENV !== 'production'
    }));
    app.useGlobalPipes(new GrpcValidationPipe({
        enableErrorLogging: true,
        stripUnknownProperties: true
    }));
    app.useGlobalInterceptors(new GrpcLoggingInterceptor({
        logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
        logRequest: process.env.NODE_ENV !== 'production',
        logResponse: process.env.NODE_ENV === 'development'
    }));
    
    await app.listen();
}

bootstrap();
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
- 🔧 **Flexible**: Use what you need, ignore the rest
- 📚 **Simple**: Easy to understand and use
- 🛡️ **Robust**: Built-in error handling, validation, and resilience patterns
- 📊 **Observable**: Built-in monitoring and tracing capabilities

## License

ISC
