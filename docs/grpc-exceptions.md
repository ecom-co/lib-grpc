---
id: grpc-exceptions
title: gRPC Exceptions Library — Structured gRPC Error Classes
sidebar_label: gRPC Exceptions
slug: /grpc-exceptions
description: Thư viện đầy đủ các gRPC exception classes với status codes chuẩn, structured details và utility functions.
tags: [grpc, exceptions, error-handling, status-codes, nestjs]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::info
Thư viện gRPC Exceptions cung cấp tất cả exception classes theo gRPC status codes chuẩn, với structured details và utility functions để error handling nhất quán.
:::

### Tổng quan

- **BaseGrpcException**: Base class kế thừa từ `RpcException`
- **GrpcStatusCodes**: Enum chứa tất cả gRPC status codes chuẩn
- **15+ Exception Classes**: Mỗi gRPC status code có class riêng
- **Utility Functions**: Helper functions cho type checking và conversion

### GrpcStatusCodes Enum

| Code | Name                  | HTTP Equivalent | Mô tả                       |
| ---: | --------------------- | --------------: | --------------------------- |
|    0 | `OK`                  |             200 | Success                     |
|    1 | `CANCELLED`           |             499 | Request cancelled by client |
|    2 | `UNKNOWN`             |             500 | Unknown error               |
|    3 | `INVALID_ARGUMENT`    |             400 | Invalid request parameters  |
|    4 | `DEADLINE_EXCEEDED`   |             504 | Request timeout             |
|    5 | `NOT_FOUND`           |             404 | Resource not found          |
|    6 | `ALREADY_EXISTS`      |             409 | Resource already exists     |
|    7 | `PERMISSION_DENIED`   |             403 | Access denied               |
|    8 | `RESOURCE_EXHAUSTED`  |             429 | Rate limit exceeded         |
|    9 | `FAILED_PRECONDITION` |             412 | Precondition not met        |
|   10 | `ABORTED`             |             409 | Operation aborted           |
|   11 | `OUT_OF_RANGE`        |             400 | Value out of valid range    |
|   12 | `UNIMPLEMENTED`       |             501 | Method not implemented      |
|   13 | `INTERNAL`            |             500 | Internal server error       |
|   14 | `UNAVAILABLE`         |             503 | Service unavailable         |
|   15 | `DATA_LOSS`           |             500 | Data corruption detected    |
|   16 | `UNAUTHENTICATED`     |             401 | Authentication required     |

### Exception Classes

<Tabs>
  <TabItem value="validation" label="Validation & Input Errors">

```ts
// GrpcValidationException - INVALID_ARGUMENT (3)
throw new GrpcValidationException('Validation failed', [
    { field: 'email', message: 'Must be valid email' },
    { field: 'age', message: 'Must be between 18-100' },
]);

// GrpcBadRequestException - INVALID_ARGUMENT (3)
throw new GrpcBadRequestException('Invalid request format', {
    expectedFormat: 'JSON',
    receivedFormat: 'XML',
});

// GrpcOutOfRangeException - OUT_OF_RANGE (11)
throw new GrpcOutOfRangeException('Page number out of range', {
    min: 1,
    max: 100,
    actual: 150,
});
```

  </TabItem>
  <TabItem value="auth" label="Authentication & Authorization">

```ts
// GrpcUnauthorizedException - UNAUTHENTICATED (16)
throw new GrpcUnauthorizedException('Invalid token', 'Token expired');

// GrpcForbiddenException - PERMISSION_DENIED (7)
throw new GrpcForbiddenException('Access denied', ['admin', 'user:write']);
```

  </TabItem>
  <TabItem value="resource" label="Resource Management">

```ts
// GrpcNotFoundException - NOT_FOUND (5)
throw new GrpcNotFoundException('User not found', 'User');

// GrpcConflictException - ALREADY_EXISTS (6)
throw new GrpcConflictException('Email already exists', 'user@example.com');

// GrpcResourceExhaustedException - RESOURCE_EXHAUSTED (8)
throw new GrpcResourceExhaustedException('Rate limit exceeded', 'API calls', 1000, 1050);
```

  </TabItem>
  <TabItem value="operational" label="Operational Errors">

```ts
// GrpcTimeoutException - DEADLINE_EXCEEDED (4)
throw new GrpcTimeoutException('Database query timeout', 5000);

// GrpcUnavailableException - UNAVAILABLE (14)
throw new GrpcUnavailableException('Service maintenance', 3600); // retry after 1 hour

// GrpcInternalException - INTERNAL (13)
throw new GrpcInternalException('Database connection failed', originalError);

// GrpcAbortedException - ABORTED (10)
throw new GrpcAbortedException('Transaction rolled back', 'Concurrent modification');
```

  </TabItem>
  <TabItem value="implementation" label="Implementation & Precondition">

```ts
// GrpcNotImplementedException - UNIMPLEMENTED (12)
throw new GrpcNotImplementedException('Feature not available', 'Advanced search');

// GrpcFailedPreconditionException - FAILED_PRECONDITION (9)
throw new GrpcFailedPreconditionException('Account not verified', [
    'Email verification required',
    'Phone verification required',
]);

// GrpcCancelledException - CANCELLED (1)
throw new GrpcCancelledException('Operation cancelled by user');

// GrpcDataLossException - DATA_LOSS (15)
throw new GrpcDataLossException('Data corruption detected in backup');
```

  </TabItem>
</Tabs>

### Exception Classes Reference

| Exception Class                   | gRPC Code | Constructor Parameters                        | Details Structure                                   |
| --------------------------------- | --------: | --------------------------------------------- | --------------------------------------------------- |
| `GrpcValidationException`         |         3 | `(message, errors, field?)`                   | `{ type, count, errors, field? }`                   |
| `GrpcBadRequestException`         |         3 | `(message, details?)`                         | `{ type, ...details }`                              |
| `GrpcUnauthorizedException`       |        16 | `(message?, reason?)`                         | `{ type, reason? }`                                 |
| `GrpcForbiddenException`          |         7 | `(message?, requiredPermissions?)`            | `{ type, requiredPermissions? }`                    |
| `GrpcNotFoundException`           |         5 | `(message, resource?)`                        | `{ type, resource? }`                               |
| `GrpcConflictException`           |         6 | `(message, conflictingResource?)`             | `{ type, conflictingResource? }`                    |
| `GrpcTimeoutException`            |         4 | `(message?, timeoutMs?)`                      | `{ type, timeoutMs? }`                              |
| `GrpcResourceExhaustedException`  |         8 | `(message?, resourceType?, limit?, current?)` | `{ type, resourceType?, limit?, current?, usage? }` |
| `GrpcInternalException`           |        13 | `(message?, cause?)`                          | `{ type, originalError?, stack? }`                  |
| `GrpcUnavailableException`        |        14 | `(message?, retryAfter?)`                     | `{ type, retryAfter? }`                             |
| `GrpcAbortedException`            |        10 | `(message?, reason?)`                         | `{ type, reason? }`                                 |
| `GrpcNotImplementedException`     |        12 | `(message?, feature?)`                        | `{ type, feature? }`                                |
| `GrpcFailedPreconditionException` |         9 | `(message, requiredConditions?)`              | `{ type, requiredConditions? }`                     |
| `GrpcOutOfRangeException`         |        11 | `(message, range?)`                           | `{ type, range? }`                                  |
| `GrpcCancelledException`          |         1 | `(message?, reason?)`                         | `{ type, reason? }`                                 |
| `GrpcDataLossException`           |        15 | `(message?)`                                  | `{ type }`                                          |

### Utility Functions

<Tabs>
  <TabItem value="type-guards" label="Type Guards & Checks">

```ts
import { isGrpcException, BaseGrpcException } from '@ecom-co/grpc';

function handleError(error: unknown) {
    if (isGrpcException(error)) {
        // error is BaseGrpcException | RpcException
        console.log('gRPC Error:', error.getError());
    } else {
        console.log('Non-gRPC Error:', error);
    }
}

// Check specific exception type
function isNotFound(error: unknown): error is GrpcNotFoundException {
    return error instanceof GrpcNotFoundException;
}
```

  </TabItem>
  <TabItem value="conversion" label="HTTP → gRPC Conversion">

```ts
import { createGrpcExceptionFromHttp } from '@ecom-co/grpc';

// Convert HTTP status codes to gRPC exceptions
const grpcError400 = createGrpcExceptionFromHttp(400, 'Bad request');
// Returns: GrpcBadRequestException

const grpcError404 = createGrpcExceptionFromHttp(404, 'Not found');
// Returns: GrpcNotFoundException

const grpcError500 = createGrpcExceptionFromHttp(500, 'Internal error');
// Returns: GrpcInternalException

// Usage trong HTTP → gRPC gateway
app.use((req, res, next) => {
    try {
        // HTTP logic
    } catch (error) {
        if (error.status) {
            throw createGrpcExceptionFromHttp(error.status, error.message);
        }
        throw error;
    }
});
```

  </TabItem>
</Tabs>

### Usage Patterns

<Tabs>
  <TabItem value="service" label="Service Implementation">

```ts
// user.service.ts
import { Injectable } from '@nestjs/common';
import {
    GrpcNotFoundException,
    GrpcConflictException,
    GrpcValidationException,
    GrpcInternalException,
} from '@ecom-co/grpc';

@Injectable()
export class UserService {
    async findById(id: string) {
        if (!id) {
            throw new GrpcValidationException('User ID is required', [{ field: 'id', message: 'ID cannot be empty' }]);
        }

        const user = await this.repository.findById(id);
        if (!user) {
            throw new GrpcNotFoundException('User not found', 'User');
        }

        return user;
    }

    async createUser(data: CreateUserDto) {
        // Check email uniqueness
        const existing = await this.repository.findByEmail(data.email);
        if (existing) {
            throw new GrpcConflictException('User already exists', data.email);
        }

        try {
            return await this.repository.create(data);
        } catch (dbError) {
            throw new GrpcInternalException('Failed to create user', dbError);
        }
    }

    async deleteUser(id: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new GrpcFailedPreconditionException('Cannot delete own account', [
                'Use different account',
                'Contact administrator',
            ]);
        }

        const user = await this.findById(id); // May throw GrpcNotFoundException
        await this.repository.delete(id);

        return { success: true };
    }
}
```

  </TabItem>
  <TabItem value="middleware" label="Error Handling Middleware">

```ts
// error-handling.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GrpcTimeoutException, GrpcResourceExhaustedException, isGrpcException } from '@ecom-co/grpc';

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const startTime = Date.now();
        const timeout = 30000; // 30 seconds

        // Set timeout
        const timeoutId = setTimeout(() => {
            if (!res.headersSent) {
                throw new GrpcTimeoutException('Request timeout', timeout);
            }
        }, timeout);

        // Rate limiting check
        const clientId = req.ip;
        const requestCount = this.getRequestCount(clientId);
        if (requestCount > 100) {
            clearTimeout(timeoutId);
            throw new GrpcResourceExhaustedException('Rate limit exceeded', 'Requests per minute', 100, requestCount);
        }

        res.on('finish', () => {
            clearTimeout(timeoutId);
        });

        next();
    }

    private getRequestCount(clientId: string): number {
        // Implementation for rate limiting
        return 0;
    }
}
```

  </TabItem>
  <TabItem value="interceptor" label="Logging Interceptor">

```ts
// grpc-logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isGrpcException } from '@ecom-co/grpc';

@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const rpcContext = context.switchToRpc();
        const methodName = context.getHandler().name;
        const data = rpcContext.getData();

        console.log(`[gRPC] ${methodName} called with:`, data);

        return next.handle().pipe(
            tap((result) => {
                console.log(`[gRPC] ${methodName} success:`, result);
            }),
            catchError((error) => {
                if (isGrpcException(error)) {
                    const grpcError = error.getError();
                    console.error(`[gRPC] ${methodName} failed:`, {
                        code: grpcError.code,
                        message: grpcError.message,
                        details: grpcError.details,
                    });
                } else {
                    console.error(`[gRPC] ${methodName} unexpected error:`, error);
                }
                return throwError(() => error);
            }),
        );
    }
}
```

  </TabItem>
  <TabItem value="custom" label="Custom Exception Classes">

```ts
// custom-exceptions.ts
import { BaseGrpcException, GrpcStatusCodes } from '@ecom-co/grpc';

// Domain-specific exception
export class UserQuotaExceededException extends BaseGrpcException {
  constructor(currentUsage: number, limit: number, quotaType: string = 'storage') {
    super({
      code: GrpcStatusCodes.RESOURCE_EXHAUSTED,
      message: `${quotaType} quota exceeded: ${currentUsage}/${limit}`,
      details: {
        type: 'QUOTA_EXCEEDED',
        quotaType,
        currentUsage,
        limit,
        overageAmount: currentUsage - limit,
      },
    });
  }
}

// Business logic exception
export class PaymentRequiredException extends BaseGrpcException {
  constructor(requiredAmount: number, currency: string = 'USD') {
    super({
      code: GrpcStatusCodes.FAILED_PRECONDITION,
      message: `Payment required: ${requiredAmount} ${currency}`,
      details: {
        type: 'PAYMENT_REQUIRED',
        amount: requiredAmount,
        currency,
        paymentMethods: ['credit_card', 'paypal', 'bank_transfer'],
      },
    });
  }
}

// Usage
async upgradeAccount(userId: string, plan: string) {
  const user = await this.findById(userId);
  const pricing = await this.getPricing(plan);

  if (!user.paymentMethod) {
    throw new PaymentRequiredException(pricing.amount, pricing.currency);
  }

  const currentUsage = await this.getStorageUsage(userId);
  const newLimit = this.getStorageLimit(plan);

  if (currentUsage > newLimit) {
    throw new UserQuotaExceededException(currentUsage, newLimit, 'storage');
  }

  return this.processUpgrade(user, plan);
}
```

  </TabItem>
</Tabs>

### Mermaid: Exception Hierarchy

```mermaid
classDiagram
    class RpcException {
        +getError()
    }

    class BaseGrpcException {
        +code: GrpcStatusCodes
        +message: string
        +details?: object
    }

    class GrpcValidationException {
        +errors: unknown[]
        +field?: string
    }

    class GrpcNotFoundException {
        +resource?: string
    }

    class GrpcConflictException {
        +conflictingResource?: string
    }

    class GrpcInternalException {
        +originalError?: string
        +stack?: string
    }

    RpcException <|-- BaseGrpcException
    BaseGrpcException <|-- GrpcValidationException
    BaseGrpcException <|-- GrpcNotFoundException
    BaseGrpcException <|-- GrpcConflictException
    BaseGrpcException <|-- GrpcInternalException
    BaseGrpcException <|-- "... 11 more classes"
```

### Best Practices

- **Sử dụng specific exception classes** thay vì generic `RpcException`
- **Include meaningful details** trong exception constructor
- **Custom exceptions** cho domain-specific errors
- **Type guards** để handle different error types safely
- **Structured logging** với exception details để debugging

:::tip
Kết hợp với `GrpcExceptionFilter` để tự động convert HTTP exceptions thành gRPC exceptions!
:::
