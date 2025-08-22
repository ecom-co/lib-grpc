# gRPC Library

A lightweight gRPC utilities library for NestJS applications.

## Features

- 🎯 **Decorators**: `@GrpcMethod()` for enhanced gRPC method registration
- 🛡️ **Exception Handling**: `GrpcExceptionFilter` for proper error handling
- ✅ **Validation**: `GrpcValidationPipe` for request validation
- ⚡ **Enhancements**: Circuit breaker, caching, tracing, and monitoring
- 🎨 **Clean API**: Simple and intuitive interface

## Quick Start

### 1. Install

```bash
npm install @ecom-co/grpc
```

### 2. Use Decorators

```typescript
import { GrpcMethod } from '@ecom-co/grpc';

@Controller()
export class UserController {
    @GrpcMethod('user', 'getUser')
    async getUser(data: { id: string }) {
        return { id: data.id, name: 'John Doe' };
    }
}
```

### 3. Add Exception Filter

```typescript
import { GrpcExceptionFilter } from '@ecom-co/grpc';

app.useGlobalFilters(new GrpcExceptionFilter());
```

### 4. Use Validation Pipe

```typescript
import { GrpcValidationPipe } from '@ecom-co/grpc';

app.useGlobalPipes(new GrpcValidationPipe());
```

## Available Utilities

### Decorators
- `@GrpcMethod(service, method)` - Enhanced gRPC method decorator
- `@Cacheable(options)` - Cache method results
- `@TraceOperation()` - Add distributed tracing
- `@MonitorPerformance()` - Monitor method performance

### Filters
- `GrpcExceptionFilter` - Handle gRPC exceptions properly

### Pipes
- `GrpcValidationPipe` - Validate gRPC requests

### Enhancements
- Circuit Breaker - Prevent cascading failures
- Distributed Tracing - Track requests across services
- Performance Monitoring - Monitor service performance

## Example Usage

```typescript
import { NestFactory } from '@nestjs/core';
import { GrpcMethod, GrpcExceptionFilter } from '@ecom-co/grpc';
import { AppModule } from './app.module';

// Your service
@Controller()
export class UserService {
    @GrpcMethod('user', 'getUser')
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

    app.useGlobalFilters(new GrpcExceptionFilter());
    await app.listen();
}

bootstrap();
```

## Benefits

- 🚀 **Lightweight**: Only essential utilities
- 🎯 **Focused**: Each utility has a clear purpose
- 🔧 **Flexible**: Use what you need, ignore the rest
- 📚 **Simple**: Easy to understand and use
- 🛡️ **Robust**: Built-in error handling and validation

## License

MIT
