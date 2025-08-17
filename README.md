# @ecom-co/grpc

A comprehensive gRPC library for the e-commerce platform, providing standardized error handling, validation, service management, and utilities for gRPC services.

## Features

- **Comprehensive Error Handling**: Pre-built exceptions for all gRPC status codes
- **Advanced Exception Filter**: High-performance error filtering with logging, metrics, and rate limiting
- **Validation Pipeline**: Built-in validation pipe for request data validation
- **Service Management**: Dynamic service registry and configuration management
- **Configurable Module**: Support for both sync and async configuration
- **Type-Safe Constants**: Strongly-typed gRPC status codes and error mappings
- **Performance Optimized**: Caching, async logging, and memory management
- **Utilities**: Helper functions for service configuration and port management

## Installation

```bash
npm install @ecom-co/grpc
```

## Dependencies

This package requires the following peer dependencies:
- `@nestjs/common` >= 10.0.0
- `@nestjs/core` >= 10.0.0  
- `@nestjs/microservices` >= 10.0.0

## Quick Start

### 1. Basic Module Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { GrpcModule, GrpcServiceConfig } from '@ecom-co/grpc';

const services: GrpcServiceConfig[] = [
  {
    name: 'User Service',
    package: 'user',
    protoPath: 'src/proto/user.proto',
    port: 50052,
    enabled: true,
  },
];

@Module({
  imports: [
    GrpcModule.forRoot({
      services,
      basePath: process.cwd(),
    }),
  ],
})
export class AppModule {}
```

### 2. Using Service Manager

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { ServiceManager } from '@ecom-co/grpc';

@Injectable()
export class UserService {
  constructor(private readonly serviceManager: ServiceManager) {}

  async createMicroservices() {
    const options = this.serviceManager.getAllMicroserviceOptions();
    // Use options to create NestJS microservices
  }
}
```

### 3. Using GrpcBootstrapper (Recommended)

```typescript
// main.ts
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GrpcBootstrapper, ServiceManager } from '@ecom-co/grpc';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const serviceManager = app.get(ServiceManager);

  // Replace manual service startup with bootstrapper
  await GrpcBootstrapper.bootstrap(app, serviceManager, {
    appModule: AppModule,
    logger,
    logEnvironment: true,
    getEnvironment: () => process.env.NODE_ENV || 'development',
    maxConcurrency: 3,
  });
};

bootstrap();
```

## Service Management

### Dynamic Configuration

The library supports dynamic service management:

```typescript
// Add new service
serviceManager.addService({
  name: 'Payment Service',
  package: 'payment',
  protoPath: 'src/proto/payment.proto',
  port: 50054,
  enabled: true,
});

// Enable/disable services
serviceManager.enableService('Payment Service');
serviceManager.disableService('Payment Service');

// Get services
const enabledServices = serviceManager.getEnabledServices();
const allServices = serviceManager.getAllServices();
```

### Async Configuration

```typescript
// app.module.ts
@Module({
  imports: [
    GrpcModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        services: [
          {
            name: 'User Service',
            package: 'user',
            protoPath: configService.get('USER_PROTO_PATH'),
            port: configService.get('USER_SERVICE_PORT'),
            enabled: configService.get('USER_SERVICE_ENABLED'),
          },
        ],
        basePath: configService.get('PROTO_BASE_PATH'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Constants

```typescript
import { GRPC_STATUS_CODES, GRPC_STATUS_NAMES } from '@ecom-co/grpc';

// Use status codes
const notFoundCode = GRPC_STATUS_CODES.NOT_FOUND; // 5
const statusName = GRPC_STATUS_NAMES[notFoundCode]; // 'NOT_FOUND'
```

### Exceptions

```typescript
import { 
  GrpcNotFoundException,
  GrpcInvalidArgumentException,
  GrpcValidationException 
} from '@ecom-co/grpc';

// Throw specific gRPC exceptions
throw new GrpcNotFoundException('User not found');
throw new GrpcInvalidArgumentException('Invalid user ID format');

// Validation exception with detailed field errors
throw new GrpcValidationException(
  ['Name is required', 'Email must be valid'],
  { name: { required: 'Name is required' }, email: { email: 'Email must be valid' } }
);
```

### Exception Filter

```typescript
import { GrpcExceptionFilter, GrpcExceptionFilterOptions } from '@ecom-co/grpc';

// Basic usage
@UseFilters(new GrpcExceptionFilter())
@Controller()
export class UserService {
  // Your gRPC service methods
}

// Advanced configuration
const filterOptions: GrpcExceptionFilterOptions = {
  isDevelopment: false,
  enableLogging: true,
  enableMetrics: true,
  customErrorMessages: {
    [GRPC_STATUS_CODES.NOT_FOUND]: 'Resource could not be located'
  },
  maxDetailsSize: 2000,
  errorRateLimit: 5,
  rateLimitWindowMs: 30000
};

@UseFilters(new GrpcExceptionFilter(filterOptions, errorMetrics))
export class UserService {}
```

### Validation Pipe

```typescript
import { GrpcValidationPipe } from '@ecom-co/grpc';

@GrpcMethod('UserService', 'CreateUser')
async createUser(
  @Body(new GrpcValidationPipe()) createUserDto: CreateUserDto
): Promise<User> {
  // Your implementation
}
```

## Available Exceptions

- `GrpcNotFoundException` (NOT_FOUND - 5)
- `GrpcInvalidArgumentException` (INVALID_ARGUMENT - 3) 
- `GrpcUnauthenticatedException` (UNAUTHENTICATED - 16)
- `GrpcPermissionDeniedException` (PERMISSION_DENIED - 7)
- `GrpcAlreadyExistsException` (ALREADY_EXISTS - 6)
- `GrpcResourceExhaustedException` (RESOURCE_EXHAUSTED - 8)
- `GrpcFailedPreconditionException` (FAILED_PRECONDITION - 9)
- `GrpcAbortedException` (ABORTED - 10)
- `GrpcOutOfRangeException` (OUT_OF_RANGE - 11)
- `GrpcUnimplementedException` (UNIMPLEMENTED - 12)
- `GrpcInternalException` (INTERNAL - 13)
- `GrpcUnavailableException` (UNAVAILABLE - 14)
- `GrpcDataLossException` (DATA_LOSS - 15)
- `GrpcValidationException` (INVALID_ARGUMENT - 3 with validation details)

## Performance Features

### Exception Filter Performance
- **Error Code Caching**: Frequently used error codes are cached for faster lookups
- **Async Logging**: Non-blocking log processing with queue management
- **Rate Limiting**: Prevents log spam with configurable rate limits
- **Memory Management**: Automatic cleanup and size limits for error details
- **Metrics Integration**: Optional metrics recording for monitoring

### Configuration Options
- `isDevelopment`: Include stack traces and verbose debugging
- `enableLogging`: Toggle error logging 
- `enableMetrics`: Enable metrics collection
- `customErrorMessages`: Override default error messages
- `maxDetailsSize`: Limit error detail size to prevent memory issues
- `errorRateLimit`: Maximum errors to log per time window
- `rateLimitWindowMs`: Time window for rate limiting

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run linter
npm run lint

# Run linter with auto-fix
npm run lint:fix

# Clean build artifacts  
npm run clean
```

## Publishing

```bash
# Patch version
npm run release:patch

# Minor version
npm run release:minor

# Major version  
npm run release:major
```

## Migration from @ecom-co/utils

If you're migrating from the utils library, update your imports:

```typescript
// Old imports from @ecom-co/utils
import { GRPC_STATUS_CODES, GrpcExceptionFilter } from '@ecom-co/utils';

// New imports from @ecom-co/grpc
import { GRPC_STATUS_CODES, GrpcExceptionFilter } from '@ecom-co/grpc';
```

All functionality remains the same - only the package name has changed.

## License

ISC

## Author

Nam077
