# Global Middleware cho gRPC Services

## Tổng quan

Module gRPC hỗ trợ áp dụng global middleware cho tất cả gRPC services thông qua cấu hình `globalMiddleware` trong `GrpcModule.forRoot()`.

## Các loại Middleware được hỗ trợ

### 1. Pipes (Validation & Transformation)
```typescript
import { PipeTransform } from '@nestjs/common';

pipes?: PipeTransform[];
```

**Ví dụ:**
```typescript
import { ValidationPipe } from '@nestjs/common';
import { GrpcValidationPipe } from '@ecom-co/grpc';

pipes: [new GrpcValidationPipe(), new ValidationPipe()]
```

### 2. Filters (Exception Handling)
```typescript
import { ExceptionFilter } from '@nestjs/common';

filters?: ExceptionFilter[];
```

**Ví dụ:**
```typescript
import { GrpcExceptionFilter } from '@ecom-co/grpc';

filters: [new GrpcExceptionFilter({
    enableLogging: true,
    enableMetrics: true,
    isDevelopment: true,
})]
```

### 3. Interceptors (Cross-cutting Concerns)
```typescript
import { NestInterceptor } from '@nestjs/common';

interceptors?: NestInterceptor[];
```

**Ví dụ:**
```typescript
import { LoggingInterceptor } from '@nestjs/common';

interceptors: [new LoggingInterceptor()]
```

### 4. Guards (Access Control)
```typescript
import { CanActivate } from '@nestjs/common';

guards?: CanActivate[];
```

**Ví dụ:**
```typescript
import { AuthGuard } from './guards/auth.guard';

guards: [new AuthGuard()]
```

## Cách sử dụng

### Cấu hình trong AppModule

```typescript
import { Module } from '@nestjs/common';
import { GrpcModule, GrpcValidationPipe, GrpcExceptionFilter } from '@ecom-co/grpc';

@Module({
    imports: [
        GrpcModule.forRoot({
            configs: [
                {
                    name: 'user-service',
                    type: 'server',
                    package: 'user',
                    port: 50052,
                    protoPath: 'src/proto/services/user.proto',
                },
            ],
            globalMiddleware: {
                pipes: [new GrpcValidationPipe()],
                filters: [
                    new GrpcExceptionFilter({
                        enableAsyncLogging: true,
                        enableLogging: true,
                        enableMetrics: true,
                        errorRateLimit: 10,
                        isDevelopment: true,
                        maxDetailsSize: 1000,
                        rateLimitWindowMs: 60000,
                    }),
                ],
                interceptors: [new LoggingInterceptor()],
                guards: [new AuthGuard()],
            },
        }),
    ],
})
export class AppModule {}
```

### Controller không cần decorator

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class UserGrpcController {
    // Không cần @UsePipes() - validation được áp dụng globally
    @GrpcMethod('UserService', 'CreateUser')
    async createUser(data: CreateUserDto) {
        // Validation tự động được áp dụng cho data
        return await this.userService.create(data);
    }
}
```

## Ưu điểm

1. **Type Safety**: Tất cả middleware có type rõ ràng theo chuẩn NestJS
2. **Global Scope**: Áp dụng cho tất cả gRPC services
3. **Tự động**: Không cần decorator ở controller
4. **Instance-based**: Chỉ nhận instance (không nhận class)
5. **Tập trung**: Quản lý cấu hình ở một nơi

## Lưu ý

- Middleware được áp dụng cho từng microservice riêng biệt
- Hoạt động với hybrid microservices architecture
- Tương thích với tất cả NestJS middleware types
- Chỉ nhận **instance** (không nhận class/Type)
- Có thể kết hợp nhiều middleware cùng lúc
