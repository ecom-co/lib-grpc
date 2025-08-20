# @ecom-co/grpc

🚀 **Modern gRPC Library** for NestJS with hybrid architecture, discriminated union types, and production-ready features.

## ✨ Key Features

### 🎯 **Core Modules**
- **GrpcModule**: Configure and manage gRPC services & clients
- **ServiceRegistry**: Dynamic service configuration management with auto uppercase
- **GrpcStarter**: Manual lifecycle management with graceful shutdown
- **GrpcServiceManager**: Hybrid gRPC service orchestration
- **GrpcClientFactory**: Client connection management
- **GrpcClientModule**: Feature-based client providers

### 🎨 **Smart Decorators** 
- **@GrpcClient()**: Inject gRPC clients by name with auto uppercase
- **@TraceOperation**: UUID tracing with structured logging
- **@MonitorPerformance**: Real-time performance monitoring + memory tracking
- **@Cacheable**: TTL-based method result caching
- **@EnhancedOperation**: All-in-one decorator (tracing + performance + cache)

### 🔧 **Production Enhancements**
- **Hybrid Architecture**: Single app instance for HTTP + gRPC
- **Discriminated Union Types**: Type-safe server/client configurations
- **Auto Uppercase**: Consistent naming with automatic normalization
- **Exception Handling**: gRPC-specific error handling + filters
- **Validation**: Type-safe request validation pipes
- **Clean Logging**: Professional, emoji-free logging system

## 📦 Installation

```bash
npm install @ecom-co/grpc
```

### Dependencies
- `@nestjs/common` >= 10.0.0
- `@nestjs/core` >= 10.0.0  
- `@nestjs/microservices` >= 10.0.0
- `lodash` >= 4.17.0

## 🚀 Quick Start

### 1. **App Module Setup with Discriminated Union Types**

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { GrpcModule, GrpcClientModule, GrpcConfig } from '@ecom-co/grpc';

const configs: GrpcConfig[] = [
  // Server configuration
  {
    name: 'user-service',
    type: 'server',
    package: 'user',
    protoPath: 'proto/user.proto',
    host: '0.0.0.0',
    port: 50051
  },
  // Client configuration
  {
    name: 'order-client',
    type: 'client',
    package: 'order',
    protoPath: 'proto/order.proto',
    url: 'localhost:50052'
  }
];

@Module({
  imports: [
    GrpcModule.forRoot({ configs }),
    GrpcClientModule.forFeature(['order-client']) // Auto creates providers
  ]
})
export class AppModule {}
```

### 2. **Main.ts Bootstrap with Hybrid Approach**

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { GrpcStarter, GrpcClientFactory } from '@ecom-co/grpc';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set app instance for hybrid microservices
  const starter = app.get(GrpcStarter);
  starter.setApp(app);
  
  // Start all gRPC services (connects to main app)
  starter.start();
  
  // Initialize all gRPC clients
  const configs = app.get('GRPC_CORE_OPTIONS').configs;
  await GrpcClientFactory.initializeClients(configs);
  
  // Start HTTP server (gRPC services already connected)
  await app.listen(3000);
  
  console.log('🚀 Application running on port 3000');
  console.log('🔗 gRPC services connected to main app');
}

bootstrap();
```

### 3. **Service Implementation with @GrpcClient Decorator**

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GrpcClient } from '@ecom-co/grpc';

interface UserService {
  GetUser(data: { id: string }): any;
}

@Injectable()
export class UserService {
  // Auto injects 'ORDER-CLIENT' (normalized to uppercase)
  @GrpcClient('order-client')
  private orderClient!: ClientProxy;

  async getUser(id: string) {
    const orderSvc = this.orderClient.getService<UserService>('OrderService');
    return firstValueFrom(orderSvc.GetUser({ id }));
  }
}
```

### 4. **Advanced Service with All Decorators**

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

### **Type-Safe Configuration with Discriminated Union**

```typescript
// TypeScript knows exactly which fields are available
const serverConfig: GrpcServerConfig = {
  name: 'user-service',
  type: 'server', // TypeScript knows this has host, port
  package: 'user',
  protoPath: 'proto/user.proto',
  host: '0.0.0.0',
  port: 50051
};

const clientConfig: GrpcClientConfig = {
  name: 'order-client', 
  type: 'client', // TypeScript knows this has url
  package: 'order',
  protoPath: 'proto/order.proto',
  url: 'localhost:50052'
};
```

### **Auto Uppercase Naming**

```typescript
// All names are automatically normalized to uppercase
const configs: GrpcConfig[] = [
  { name: 'user-service', type: 'server', ... }, // → 'USER-SERVICE'
  { name: 'Order-Client', type: 'client', ... }, // → 'ORDER-CLIENT'
  { name: 'NOTIFICATION_CLIENT', type: 'client', ... } // → 'NOTIFICATION_CLIENT'
];

// Decorator automatically uses uppercase
@GrpcClient('user-client') // Injects 'USER-CLIENT'
private userClient!: ClientProxy;
```

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
│   ├── grpc.module.ts              # Main module with configs
│   ├── grpc.service.ts             # Core service
│   ├── service-registry.ts         # Dynamic config with auto uppercase
│   ├── grpc-starter.ts             # Manual startup control
│   ├── grpc-service-manager.ts     # Hybrid service orchestration
│   ├── grpc-client.factory.ts      # Client connection management
│   ├── grpc-client.decorator.ts    # @GrpcClient decorator
│   └── interfaces.ts               # Discriminated union types
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
// OLD: Separate microservices
const userService = app.connectMicroservice({
  transport: Transport.GRPC,
  options: { /* config */ }
});
await app.startAllMicroservices();

// NEW: Hybrid approach with discriminated union
const configs: GrpcConfig[] = [
  { name: 'user-service', type: 'server', ... },
  { name: 'order-client', type: 'client', ... }
];

const starter = app.get(GrpcStarter);
starter.setApp(app);
starter.start(); // Connects to main app
```

## 📈 Production Tips

1. **Hybrid Architecture**: Single app instance for HTTP + gRPC (no conflicts)
2. **Auto Uppercase**: Consistent naming prevents errors
3. **Type Safety**: Use discriminated union types for configs
4. **Client Management**: Use `@GrpcClient()` decorator for clean injection
5. **Performance**: Monitor memory usage in `@MonitorPerformance`
6. **Exception Handling**: Use proper gRPC exception types
7. **Service Management**: Use `GrpcStarter` for manual lifecycle control

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