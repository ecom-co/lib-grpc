# # @ecom-co/grpc

🚀 **Modern gRPC Library** for NestJS with modular architecture, full observability, and production-ready features.

## ✨ Key Features

### 🎯 **Core Modules**
- **GrpcModule**: Auto-bootstrap gRPC services on app startup
- **ServiceRegistry**: Dynamic service configuration management  
- **GrpcBootstrapper**: Lifecycle management with graceful shutdown

### 🎨 **Smart ## 🔄 Migration Guide

From old architecture:

```typescript
// OLD: Manual service setup
const userService = app.connectMicroservice({
  transport: Transport.GRPC,
  options: { /* config */ }
});
await app.startAllMicroservices();

// NEW: Auto bootstrap
@Module({
  imports: [GrpcModule.forRoot({ services: [...] })]
})
export class AppModule {} // Services auto-start!
```@TraceOperation**: UUID tracing with structured logging
- **@MonitorPerformance**: Real-time performance monitoring + memory tracking
- **@Cacheable**: TTL-based method result caching
- **@EnhancedOperation**: All-in-one decorator (tracing + performance + cache)

### 🔧 **Production Enhancements**
- **Circuit Breaker**: Fault tolerance with auto-recovery
- **Distributed Tracing**: Cross-service request tracing with span management
- **Exception Handling**: gRPC-specific error handling + filters
- **Validation**: Type-safe request validation pipesModern gRPC Library** cho NestJS với architecture modular, observability đầy đủ và production-ready features.

## ✨ Feature

### 🎯 **Core Modules**
- **GrpcModule**: Auto-bootstrap gRPC services khi app startup
- **ServiceRegistry**: Quản lý dynamic service configuration  
- **GrpcBootstrapper**: Lifecycle management với graceful shutdown

### 🎨 **Smart Decorators** 
- **@TraceOperation**: UUID tracing với structured logging
- **@MonitorPerformance**: Real-time performance monitoring + memory tracking
- **@Cacheable**: TTL-based method result caching
- **@EnhancedOperation**: All-in-one decorator (tracing + performance + cache)

### � **Production Enhancements**
- **Circuit Breaker**: Fault tolerance với auto-recovery
- **Distributed Tracing**: Cross-service request tracing với span management
- **Exception Handling**: gRPC-specific error handling + filters
- **Validation**: Type-safe request validation pipes

## 📦 Installation

\`\`\`bash
npm install @ecom-co/grpc
\`\`\`

### Dependencies
- `@nestjs/common` >= 10.0.0
- `@nestjs/core` >= 10.0.0  
- `@nestjs/microservices` >= 10.0.0

## 🚀 Quick Start

### 1. **App Module Setup**

\`\`\`typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { GrpcModule } from '@ecom-co/grpc';

@Module({
  imports: [
    GrpcModule.forRoot({
      services: [
        {
          name: 'user',
          package: 'user.v1',
          protoPath: './proto/user.proto'
        },
        {
          name: 'order', 
          package: 'order.v1',
          protoPath: './proto/order.proto'
        }
      ]
    })
  ]
})
export class AppModule {}
\`\`\`

### 2. **Main.ts Bootstrap**

\`\`\`typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  await app.listen(3000);
  console.log('🚀 HTTP Server: http://localhost:3000');
  console.log('🔌 gRPC services auto-started by GrpcBootstrapper');
}

bootstrap();
\`\`\`

**Expected output:**
\`\`\`
**Expected output:**
```
🚀 Starting gRPC services bootstrap...
🟢 Service 'user' started at localhost:50051
🟢 Service 'order' started at localhost:50052
✅ Successfully bootstrapped 2 gRPC services
🚀 HTTP Server: http://localhost:3000
```

### 3. **Service Implementation with Decorators**
\`\`\`

### 3. **Service Implementation với Decorators**

\`\`\`typescript
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
\`\`\`

## 🔧 Advanced Features

### **Circuit Breaker Protection**

\`\`\`typescript
// app.module.ts
import { CircuitBreakerModule } from '@ecom-co/grpc';

@Module({
  imports: [
    CircuitBreakerModule.forRoot({
      failureThreshold: 5,    // Open after 5 failures
      recoveryTimeout: 30000, // Try recovery after 30s
      monitoringPeriod: 10000 // Monitor every 10s
    })
  ]
})
export class AppModule {}

// service.ts - Auto protection
@Injectable()
export class ExternalApiService {
  constructor(private circuitBreaker: CircuitBreakerService) {}

  async callExternalApi(data: any) {
    return this.circuitBreaker.execute(
      'external-api',
      () => this.httpService.post('/api/endpoint', data).toPromise()
    );
  }
}
\`\`\`

### **Distributed Tracing**

\`\`\`typescript
// app.module.ts
import { TracingModule } from '@ecom-co/grpc';

@Module({
  imports: [
    TracingModule.forRoot({
      serviceName: 'user-service',
      enableSampling: true,
      samplingRate: 0.1, // 10% sampling
      maxSpans: 10000
    })
  ]
})
export class AppModule {}

// service.ts - Manual tracing
@Injectable() 
export class UserService {
  constructor(private tracer: DistributedTracer) {}

  async complexOperation(userId: string) {
    const span = this.tracer.startSpan('complex-operation', null, {
      'user.id': userId,
      'operation.type': 'business-logic'
    });

    try {
      // Step 1
      this.tracer.addLog(span.spanId, 'info', 'Starting database lookup');
      const user = await this.findUser(userId);
      
      // Step 2  
      this.tracer.addTags(span.spanId, { 'user.found': !!user });
      const result = await this.processUser(user);
      
      this.tracer.finishSpan(span.spanId, 'completed');
      return result;
      
    } catch (error) {
      this.tracer.addLog(span.spanId, 'error', error.message);
      this.tracer.finishSpan(span.spanId, 'failed');
      throw error;
    }
  }
}
\`\`\`

### **Exception Handling**

\`\`\`typescript
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
      throw new GrpcNotFoundException(\`User with ID \${id} not found\`);
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
\`\`\`

## 📊 Observability & Monitoring

### **Performance Metrics**

\`\`\`typescript
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
// 🟢 [abc-123-def] Starting getUserById
// 📝 [abc-123-def] Database query executed  
// ✅ [abc-123-def] Completed getUserById in 45ms

@TraceOperation({ 
  includeArgs: true,
  includeResult: true 
})
async getUserById(id: string) {
  // Auto logging with structured data
}
\`\`\`

### **Request Tracing**

\`\`\`typescript
// Mỗi request có unique trace ID:
// 🟢 [abc-123-def] Starting getUserById
// 📝 [abc-123-def] Database query executed  
// ✅ [abc-123-def] Completed getUserById in 45ms

@TraceOperation({ 
  includeArgs: true,
  includeResult: true 
})
async getUserById(id: string) {
  // Auto logging với structured data
}
\`\`\`

## 🏗️ Architecture

\`\`\`
@ecom-co/grpc/
├── modules/           # Core gRPC functionality
│   ├── grpc.module.ts        # Main module  
│   ├── grpc.service.ts       # Core service
│   ├── service-registry.ts   # Dynamic config
│   └── grpc-bootstrapper.ts  # Auto startup
├── decorators/        # Smart decorators
│   ├── trace-operation.decorator.ts
│   ├── monitor-performance.decorator.ts
│   ├── cacheable.decorator.ts
│   └── enhanced-operation.decorator.ts
├── enhancements/      # Production features
│   ├── circuit-breaker/
│   └── tracing/
├── exceptions/        # Error handling
├── filters/          # Exception filters
├── pipes/            # Validation pipes
└── constants/        # Shared constants
\`\`\`

## 🔄 Migration Guide

Từ old architecture:

\`\`\`typescript
// OLD: Manual service setup
const userService = app.connectMicroservice({
  transport: Transport.GRPC,
  options: { /* config */ }
});
await app.startAllMicroservices();

// NEW: Auto bootstrap
@Module({
  imports: [GrpcModule.forRoot({ services: [...] })]
})
export class AppModule {} // Services tự động start!
\`\`\`

## 📈 Production Tips

1. **Sampling**: Set `samplingRate: 0.1` for high-traffic services
2. **Cache TTL**: Adjust based on data freshness requirements  
3. **Circuit Breaker**: Tune thresholds according to service SLAs
4. **Performance**: Monitor memory usage in `@MonitorPerformance`
5. **Graceful Shutdown**: Always enable `app.enableShutdownHooks()`

## 📝 Development

\`\`\`bash
# Build
pnpm build

# Lint & fix
pnpm lint:fix

# Test
pnpm test
\`\`\`

## 📄 License

ISC - ecom-co
