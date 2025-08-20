# @ecom-co/grpc

🚀 **Modern gRPC Library** for NestJS with hybrid architecture, type-safe configurations, and production-ready features.

## ✨ Key Features

### 🎯 **Core Components**
- **GrpcModule**: Main module for configuring gRPC services & clients
- **GrpcConfigService**: Centralized configuration and runtime state management
- **ServiceRegistry**: Dynamic service registration with auto-uppercase naming
- **GrpcStarter**: Manual lifecycle management with graceful shutdown
- **GrpcServiceManager**: Hybrid gRPC service orchestration
- **GrpcClientFactory**: Client connection management
- **GrpcClientModule**: Feature-based client providers

### 🎨 **Smart Decorators** 
- **@GrpcClient()**: Inject gRPC clients by name with auto-uppercase
- **@TraceOperation**: Request tracing with UUID
- **@MonitorPerformance**: Performance monitoring with memory tracking
- **@Cacheable**: TTL-based method result caching
- **@EnhancedOperation**: All-in-one decorator (tracing + performance + cache)

### 🔧 **Production Features**
- **Hybrid Architecture**: Single app instance for HTTP + gRPC
- **Type-Safe Configurations**: Discriminated union types for server/client configs
- **Auto-Uppercase Naming**: Consistent naming with automatic normalization
- **Centralized Configuration**: Single source of truth for all configs and runtime state
- **Exception Handling**: gRPC-specific error handling and filters
- **Validation**: Type-safe request validation pipes

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

### 1. **Configure App Module**

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { GrpcModule, GrpcConfig } from '@ecom-co/grpc';
import { UserModule } from './user/user.module';

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
    UserModule
  ]
})
export class AppModule {}
```

### 2. **Bootstrap Application**

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { GrpcStarter, GrpcClientFactory, GrpcConfigService } from '@ecom-co/grpc';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set app instance for hybrid microservices
  const starter = app.get(GrpcStarter);
  starter.setApp(app);
  
  // Start all gRPC services (connects to main app)
  starter.start();
  
  // Initialize all gRPC clients
  const configService = app.get(GrpcConfigService);
  const configs = configService.getConfigs();
  await GrpcClientFactory.initializeClients(configs);
  
  // Start HTTP server (gRPC services already connected)
  await app.listen(3000);
  
  console.log('🚀 Application running on port 3000');
  console.log('🔗 gRPC services connected to main app');
}

bootstrap();
```

### 3. **Use gRPC Clients in Feature Modules**

```typescript
// user/user.module.ts
import { Module } from '@nestjs/common';
import { GrpcClientModule } from '@ecom-co/grpc';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [
    // REQUIRED: Create providers for clients you want to use
    GrpcClientModule.forFeature(['order-client'])
  ],
  providers: [UserService],
  controllers: [UserController]
})
export class UserModule {}
```

```typescript
// user/user.service.ts
import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GrpcClient } from '@ecom-co/grpc';

interface OrderService {
  GetOrder(data: { id: string }): any;
  CreateOrder(data: { userId: string; items: any[] }): any;
}

@Injectable()
export class UserService {
  constructor(
    // Inject the client (auto-uppercase: 'order-client' → 'ORDER-CLIENT')
    @GrpcClient('order-client') private readonly orderClient: ClientProxy
  ) {}

  async getUserWithOrders(userId: string) {
    // Get user data
    const user = await this.getUserById(userId);
    
    // Call order service
    const orderService = this.orderClient.getService<OrderService>('OrderService');
    
    try {
      const orders = await firstValueFrom(
        orderService.GetOrder({ id: userId })
      );
      
      return {
        ...user,
        orders
      };
    } catch (error) {
      console.error('Failed to get orders:', error);
      return user;
    }
  }

  private async getUserById(id: string) {
    // Your user logic here
    return { id, name: 'John Doe' };
  }
}
```

### 4. **Advanced Service with Decorators**

```typescript
// user/user.service.ts
import { Injectable } from '@nestjs/common';
import { 
  TraceOperation, 
  MonitorPerformance, 
  Cacheable,
  EnhancedOperation 
} from '@ecom-co/grpc';

@Injectable()
export class UserService {
  
  // Request tracing
  @TraceOperation({ 
    operationName: 'getUserById',
    includeArgs: true,
    includeResult: false 
  })
  async getUserById(id: string) {
    // Logic here
    return { id, name: 'John Doe' };
  }

  // Performance monitoring
  @MonitorPerformance({ 
    threshold: 1000, // warn if > 1s
    includeMemory: true 
  })
  async updateUser(id: string, data: any) {
    // Logic here
    return { id, ...data };
  }

  // Method result caching  
  @Cacheable({ 
    ttl: 300, // 5 minutes
    key: 'user-list' 
  })
  async getAllUsers() {
    // Expensive operation
    return [{ id: '1', name: 'John' }];
  }

  // All-in-one decorator
  @EnhancedOperation({
    operationName: 'createUser',
    cacheEnabled: true,
    cacheTtl: 600,
    performanceThreshold: 2000,
    includeArgs: true
  })
  async createUser(userData: any) {
    // Auto: tracing + performance + caching
    return { id: 'new-id', ...userData };
  }
}
```

## 🔧 Advanced Features

### **Centralized Configuration**

```typescript
// Access all configurations and runtime state from one service
@Injectable()
export class MyService {
  constructor(private readonly configService: GrpcConfigService) {}

  async someMethod() {
    // Get configurations
    const allConfigs = this.configService.getConfigs();
    const serverConfigs = this.configService.getServerConfigs();
    const clientConfigs = this.configService.getClientConfigs();
    
    // Get runtime state
    const runningServices = this.configService.getRunningServicesList();
    const usedPorts = this.configService.getUsedPorts();
    const isServiceRunning = this.configService.isServiceRunning('USER-SERVICE');
    
    // Get configuration options
    const basePort = this.configService.getBasePort();
    const host = this.configService.getHost();
    const isDev = this.configService.isDevelopment();
  }
}
```

### **Type-Safe Configuration**

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

### **Auto-Uppercase Naming**

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
}

// Global exception filter
@UseFilters(new GrpcExceptionFilter())
@Controller()
export class UserController {
  // All methods protected
}
```

## 📊 Observability & Monitoring

### **Performance Monitoring**

```typescript
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
│   ├── grpc-config.service.ts      # Centralized config & runtime state
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
2. **Auto-Uppercase**: Consistent naming prevents errors
3. **Type Safety**: Use discriminated union types for configs
4. **Centralized Config**: Use `GrpcConfigService` for all config and runtime state
5. **Client Management**: Use `@GrpcClient()` decorator for clean injection
6. **Module Import**: Always import `GrpcClientModule.forFeature()` in modules that use clients
7. **Performance**: Monitor memory usage in `@MonitorPerformance`
8. **Exception Handling**: Use proper gRPC exception types
9. **Service Management**: Use `GrpcStarter` for manual lifecycle control

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