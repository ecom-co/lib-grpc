# @ecom-co/grpc

🚀 **Modern gRPC Library** for NestJS with modular architecture, full observability, and production-ready features.

## ✨ Key Features

### 🎯 **Core Modules**
- **GrpcModule**: Configure and manage gRPC services 
- **ServiceRegistry**: Dynamic service configuration management  
- **GrpcStarter**: Manual lifecycle management with graceful shutdown
- **GrpcServiceManager**: Real gRPC service orchestration

### 🎨 **Smart Decorators** 
- **@TraceOperation**: UUID tracing with structured logging
- **@MonitorPerformance**: Real-time performance monitoring + memory tracking
- **@Cacheable**: TTL-based method result caching
- **@EnhancedOperation**: All-in-one decorator (tracing + performance + cache)

### 🔧 **Production Enhancements**
- **Exception Handling**: gRPC-specific error handling + filters
- **Validation**: Type-safe request validation pipes
- **Clean Logging**: Professional, emoji-free logging system
- **Deferred Initialization**: Proper service startup sequence

## 📦 Installation

```bash
npm install @ecom-co/grpc
```

### Dependencies
- `@nestjs/common` >= 10.0.0
- `@nestjs/core` >= 10.0.0  
- `@nestjs/microservices` >= 10.0.0

## 🚀 Quick Start

### 1. **App Module Setup**

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { GrpcModule } from '@ecom-co/grpc';

@Module({
  imports: [
    GrpcModule.forRoot({
      services: [
        {
          name: 'User Service',
          package: 'user',
          protoPath: 'src/proto/services/user.proto',
          url: 'localhost:50052'
        },
        {
          name: 'App Service',
          package: 'app', 
          protoPath: 'src/proto/app.proto',
          url: 'localhost:50053'
        }
      ]
    })
  ]
})
export class AppModule {}
```

### 2. **Main.ts Bootstrap with Deferred Initialization**

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { GrpcStarter } from '@ecom-co/grpc';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Start the application first
  await app.init();
  
  const logger = new Logger('Bootstrap');
  logger.log('Application started successfully!');

  // Use setImmediate to defer gRPC startup until after all current operations
  setImmediate(() => {
    void (async () => {
      try {
        const grpcStarter = app.get(GrpcStarter);
        grpcStarter.setAppModule(AppModule);
        await grpcStarter.start();
        logger.log('gRPC services bootstrapped manually!');
      } catch (error) {
        logger.error('Failed to start gRPC services:', error);
      }
    })();
  });
}

bootstrap();
```

**Expected output:**
```
[Nest] 78921  - 08/18/2025, 3:10:43 AM     LOG [Bootstrap] Application started successfully!
[Nest] 78921  - 08/18/2025, 3:10:43 AM     LOG [GrpcServiceManager] gRPC server created for User Service at localhost:50052
[Nest] 78921  - 08/18/2025, 3:10:43 AM     LOG [GrpcServiceManager] Service 'User Service' started at localhost:50052
[Nest] 78921  - 08/18/2025, 3:10:43 AM     LOG [GrpcServiceManager] gRPC server created for App Service at localhost:50053
[Nest] 78921  - 08/18/2025, 3:10:43 AM     LOG [GrpcServiceManager] Service 'App Service' started at localhost:50053
[Nest] 78921  - 08/18/2025, 3:10:43 AM     LOG [GrpcServiceManager] Successfully started 2 gRPC services
[Nest] 78921  - 08/18/2025, 3:10:43 AM     LOG [Bootstrap] gRPC services bootstrapped manually!
```

### 3. **Service Implementation with Decorators**

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { 
  TraceOperation, 
  MonitorPerformance, 
  Cacheable,
  EnhancedOperation 
} from '@ecom-co/grpc';

@Injectable()
export class UserService {
  
  // Tracing only with UUID
  @TraceOperation({ 
    operationName: 'getUserById',
    includeArgs: true,
    includeResult: false 
  })
  async getUserById(id: string) {
    // Logic here
    return user;
  }

  // Performance monitoring
  @MonitorPerformance({ 
    threshold: 1000, // warn if > 1s
    includeMemory: true 
  })
  async updateUser(id: string, data: UpdateUserDto) {
    // Logic here
    return updatedUser;
  }

  // Method result caching  
  @Cacheable({ 
    ttl: 300, // 5 minutes
    key: 'user-list' 
  })
  async getAllUsers() {
    // Expensive operation
    return users;
  }

  // All-in-one decorator
  @EnhancedOperation({
    operationName: 'createUser',
    cacheEnabled: true,
    cacheTtl: 600,
    performanceThreshold: 2000,
    includeArgs: true
  })
  async createUser(userData: CreateUserDto) {
    // Auto: tracing + performance + caching
    return newUser;
  }
}
```

## 🔧 Advanced Features

### **Exception Handling**

```typescript
import { 
  GrpcNotFoundException,
  GrpcInvalidArgumentException,
  GrpcValidationException,
  GrpcExceptionFilter
} from '@ecom-co/grpc';

// Custom exceptions
@Injectable()
export class UserService {
  async getUserById(id: string) {
    if (!id) {
      throw new GrpcInvalidArgumentException('User ID is required');
    }
    
    const user = await this.userRepo.findOne(id);
    if (!user) {
      throw new GrpcNotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async createUser(dto: CreateUserDto) {
    // Validation errors
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new GrpcValidationException(
        errors.map(e => Object.values(e.constraints).join(', ')),
        { fieldErrors: errors }
      );
    }
  }
}

// Global exception filter
@UseFilters(new GrpcExceptionFilter())
@Controller()
export class UserController {
  // All methods protected
}
```

## 📊 Observability & Monitoring

### **Performance Metrics**

```typescript
// Decorator automatically tracks:
// - Execution time (ms)
// - Memory usage delta  
// - Success/failure rates
// - Cache hit/miss rates

@MonitorPerformance({ threshold: 500 })
async heavyOperation() {
  // Output when > threshold:
  // ⚠️ Slow operation: heavyOperation took 1200.45ms
  // {
  //   method: 'heavyOperation',
  //   duration: '1200.45ms', 
  //   memory: { heapDelta: 1024000, ... }
  // }
}
```

### **Request Tracing**

```typescript
// Each request has unique trace ID:
// [abc-123-def] Starting getUserById
// [abc-123-def] Database query executed  
// [abc-123-def] Completed getUserById in 45ms

@TraceOperation({ 
  includeArgs: true,
  includeResult: true 
})
async getUserById(id: string) {
  // Auto logging with structured data
}
```

## 🏗️ Architecture

```
@ecom-co/grpc/
├── modules/           # Core gRPC functionality
│   ├── grpc.module.ts        # Main module  
│   ├── grpc.service.ts       # Core service
│   ├── service-registry.ts   # Dynamic config
│   ├── grpc-starter.ts       # Manual startup control
│   └── grpc-service-manager.ts # Real service orchestration
├── decorators/        # Smart decorators
│   ├── trace-operation.decorator.ts
│   ├── monitor-performance.decorator.ts
│   ├── cacheable.decorator.ts
│   └── enhanced-operation.decorator.ts
├── exceptions/        # Error handling
├── filters/          # Exception filters
├── pipes/            # Validation pipes
└── constants/        # Shared constants
```

## 🔄 Migration Guide

From old architecture:

```typescript
// OLD: Manual service setup
const userService = app.connectMicroservice({
  transport: Transport.GRPC,
  options: { /* config */ }
});
await app.startAllMicroservices();

// NEW: Deferred startup with GrpcStarter
const grpcStarter = app.get(GrpcStarter);
await grpcStarter.start(); // Manual control
```

## 📈 Production Tips

1. **Deferred Initialization**: Use `setImmediate` for proper service startup sequence
2. **Clean Logging**: Professional, emoji-free logs for production environments
3. **Performance**: Monitor memory usage in `@MonitorPerformance`
4. **Exception Handling**: Use proper gRPC exception types
5. **Service Management**: Use `GrpcStarter` for manual lifecycle control

## 📝 Development

```bash
# Build
pnpm build

# Lint & fix
pnpm lint:fix

# Test
pnpm test
```

## 📄 License

ISC - ecom-co