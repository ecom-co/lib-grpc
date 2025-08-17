# Usage Examples

## Basic Usage

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
  {
    name: 'Product Service',
    package: 'product',
    protoPath: 'src/proto/product.proto',
    port: 50053,
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

## Async Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GrpcModule, GrpcServiceConfig } from '@ecom-co/grpc';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GrpcModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const services: GrpcServiceConfig[] = [
          {
            name: 'User Service',
            package: 'user',
            protoPath: configService.get('USER_PROTO_PATH', 'src/proto/user.proto'),
            port: configService.get('USER_SERVICE_PORT', 50052),
            enabled: configService.get('USER_SERVICE_ENABLED', true),
          },
        ];

        return {
          services,
          basePath: configService.get('PROTO_BASE_PATH', process.cwd()),
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Using in Service

```typescript
// user.service.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ServiceManager } from '@ecom-co/grpc';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(private readonly serviceManager: ServiceManager) {}

  onApplicationBootstrap() {
    // Log all services status
    this.serviceManager.logServicesStatus();

    // Get enabled services
    const enabledServices = this.serviceManager.getEnabledServices();
    console.log('Enabled services:', enabledServices);

    // Get microservice options for a service
    const userService = this.serviceManager.getServiceByPackage('user');
    if (userService) {
      const options = this.serviceManager.getMicroserviceOptions(userService);
      console.log('User service options:', options);
    }
  }

  async createMicroservices() {
    // Get all microservice options
    const allOptions = this.serviceManager.getAllMicroserviceOptions();
    
    // Use with NestJS microservices
    for (const option of allOptions) {
      // Create and start microservice
      // const app = await NestFactory.createMicroservice(AppModule, option);
      // await app.listen();
    }
  }
}
```

## Dynamic Service Management

```typescript
// admin.controller.ts
import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { ServiceManager, GrpcServiceConfig } from '@ecom-co/grpc';

@Controller('admin/services')
export class AdminController {
  constructor(private readonly serviceManager: ServiceManager) {}

  @Get()
  getAllServices() {
    return this.serviceManager.getAllServices();
  }

  @Get('enabled')
  getEnabledServices() {
    return this.serviceManager.getEnabledServices();
  }

  @Post()
  addService(@Body() config: GrpcServiceConfig) {
    this.serviceManager.addService(config);
    return { message: 'Service added successfully' };
  }

  @Post(':name/enable')
  enableService(@Param('name') name: string) {
    this.serviceManager.enableService(name);
    return { message: `Service ${name} enabled` };
  }

  @Post(':name/disable')  
  disableService(@Param('name') name: string) {
    this.serviceManager.disableService(name);
    return { message: `Service ${name} disabled` };
  }

  @Delete(':name')
  removeService(@Param('name') name: string) {
    const removed = this.serviceManager.removeService(name);
    return { message: removed ? 'Service removed' : 'Service not found' };
  }
}
```

## Environment-based Configuration

```typescript
// config/grpc.config.ts
import { 
  GrpcServiceConfig, 
  getServiceConfigByEnv,
  createDefaultServiceConfig 
} from '@ecom-co/grpc';

const baseServices: GrpcServiceConfig[] = [
  createDefaultServiceConfig({
    name: 'User Service',
    package: 'user',
    protoPath: 'src/proto/user.proto',
    port: 50052,
  }),
  createDefaultServiceConfig({
    name: 'Product Service', 
    package: 'product',
    protoPath: 'src/proto/product.proto',
    port: 50053,
  }),
];

export const getGrpcConfig = () => ({
  services: baseServices.map(service => 
    getServiceConfigByEnv(service, process.env.NODE_ENV)
  ),
  basePath: process.env.PROTO_BASE_PATH || process.cwd(),
});
```
