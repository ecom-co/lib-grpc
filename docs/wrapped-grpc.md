---
id: wrapped-grpc
title: WrappedGrpc — Wrapper cho ClientGrpc (timeout, retry, circuit breaker, logging)
sidebar_label: WrappedGrpc
slug: /wrapped-grpc
description: Wrapper tiện ích cho NestJS ClientGrpc với timeout, retry có backoff, circuit breaker (opossum), và unified error handling.
tags: [grpc, nestjs, client, retry, timeout, circuit-breaker, opossum, logging, rxjs]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::info
`WrappedGrpc` là một lớp wrapper cho `ClientGrpc` (NestJS) giúp bạn: log request có sanitization, áp `timeout`, `retry` theo `retryableCodes` với exponential backoff cap, **circuit breaker** với opossum để tăng resilience, và thống nhất error thành `GrpcClientException` để filter HTTP có thể xử lý.
:::

### Tổng quan

- **Mục tiêu**: Chuẩn hoá cách gọi gRPC ở Client, giảm lặp và tăng observability.
- **Điểm nổi bật**:
    - **Logging** có sanitize fields nhạy cảm (`password`, `token`, `secret`, `key`, `authorization`, `auth`).
    - **Timeout**: auto `timeout(ms)` cho mỗi gRPC `Observable`.
    - **Retry**: `rxjs` retry với exponential backoff, chỉ retry khi `code` thuộc `retryableCodes`.
    - **Circuit Breaker**: Tự động mở circuit khi error rate vượt ngưỡng, tăng resilience.
    - **Error chuẩn**: chuyển mọi lỗi thành `GrpcClientException` (giúp HTTP layer/filter xử lý thống nhất).
    - **Resource Management**: Tự động cleanup circuit breakers khi dispose.

### Cách hoạt động (tóm tắt)

```mermaid:title="Sequence Diagram - WrappedGrpc với Circuit Breaker"
sequenceDiagram
  participant C as Controller/Service (HTTP)
  participant W as WrappedGrpc (Proxy)
  participant CB as Circuit Breaker
  participant G as ClientGrpc Service
  C->>W: getService("UserService").getUser(args)
  W->>CB: check circuit state
  alt Circuit Closed
    CB->>G: gọi method thực tế (trả về Observable)
    activate W
    Note right of W: pipe(timeout) + pipe(retryIf code ∈ retryableCodes) + catchError
    G-->>W: next/err complete
    W-->>CB: track success/failure
    W-->>C: data | throw GrpcClientException
    deactivate W
  else Circuit Open
    CB-->>W: reject with "Breaker is open"
    W-->>C: throw GrpcClientException
  end
```

:::tip
`WrappedGrpc` sử dụng `Proxy` để intercept từng method của service được trả về bởi `clientGrpc.getService(name)`. Nếu method trả về `Observable`, nó sẽ tự động wrap `pipe()` với `timeout`, `retry`, và `catchError`.
:::

### Circuit Breaker State Diagram

```mermaid:title="Circuit Breaker State Diagram"
stateDiagram-v2
    [*] --> Closed : Initial State

    Closed --> Open : Error Rate > Threshold
    Closed --> Closed : Success or Low Error Rate

    Open --> HalfOpen : Reset Timeout Elapsed
    Open --> Open : Still High Error Rate

    HalfOpen --> Closed : Success
    HalfOpen --> Open : Failure

    Closed --> [*] : Shutdown
    Open --> [*] : Shutdown
    HalfOpen --> [*] : Shutdown

    note right of Closed
        Normal operation
        All requests pass through
    end note

    note right of Open
        Circuit is open
        All requests are rejected
        "Breaker is open" error
    end note

    note right of HalfOpen
        Testing recovery
        Single request allowed
        Success → Closed, Failure → Open
    end note
```

### Khởi tạo

```ts:title="Import và Setup WrappedGrpc"
import { ClientGrpc } from '@nestjs/microservices';
import { createWrappedGrpc, WrappedGrpc } from '@ecom-co/grpc';

constructor(@Inject('GRPC_CLIENT') private readonly clientGrpc: ClientGrpc) {
  this.grpc = createWrappedGrpc(this.clientGrpc, {
    enableLogging: true,
    timeout: 30000,
    retry: 2,
    maxRetryDelay: 10000,
    retryableCodes: [1, 4, 8, 10, 13, 14, 15],
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'auth'],
  });
}

const userService = this.grpc.getService<UserService>('UserService');
```

### API surface

- **`createWrappedGrpc(clientGrpc: ClientGrpc, options?: GrpcOptions): WrappedGrpc`**
- **`new WrappedGrpc(clientGrpc: ClientGrpc, options?: GrpcOptions)`**
- **`getService<T>(name: string): T`** — trả về service như `ClientGrpc.getService`, nhưng các method Observable sẽ được wrap.
- **`getClientByServiceName<T>(name: string): T`** — passthrough.
- **`dispose(): void`** — cleanup tất cả circuit breakers và resources.

### GrpcOptions

| Option            | Type          | Mặc định                                                          | Mô tả                                                                          |
| ----------------- | ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `enableLogging`   | `boolean`     | `true`                                                            | Bật/tắt log khi gọi method gRPC (args được sanitize).                          |
| `timeout`         | `number` (ms) | `30000`                                                           | Áp `rxjs timeout`. >0 thì bật; 0 hoặc undefined sẽ bỏ qua.                     |
| `retry`           | `number`      | `0`                                                               | Số lần retry khi lỗi có `code` thuộc `retryableCodes`.                         |
| `maxRetryDelay`   | `number` (ms) | `10000`                                                           | Trần delay cho exponential backoff: `min(1000 * 2^retryCount, maxRetryDelay)`. |
| `retryableCodes`  | `number[]`    | `[1,4,8,10,13,14,15]`                                             | Danh sách gRPC status codes sẽ được phép retry.                                |
| `sensitiveFields` | `string[]`    | `['password', 'token', 'secret', 'key', 'authorization', 'auth']` | Fields sẽ bị thay bằng "[REDACTED]" trong log.                                 |
| `opossum`         | `object`      | `{ enabled: false }`                                              | Cấu hình circuit breaker với opossum.                                          |

:::note
Backoff sử dụng `Math.min(1000 * Math.pow(2, retryCount), maxRetryDelay)`. Ví dụ: 1s → 2s → 4s → ... capped bởi `maxRetryDelay`.
:::

### Circuit Breaker Options (opossum)

| Option                     | Type      | Mặc định                 | Mô tả                                                                        |
| -------------------------- | --------- | ------------------------ | ---------------------------------------------------------------------------- |
| `enabled`                  | `boolean` | `false`                  | Bật/tắt circuit breaker. **Mặc định tắt để đảm bảo backward compatibility.** |
| `timeout`                  | `number`  | `30000`                  | Timeout cho mỗi request (ms).                                                |
| `errorThresholdPercentage` | `number`  | `50`                     | Phần trăm lỗi để mở circuit (%).                                             |
| `resetTimeout`             | `number`  | `30000`                  | Thời gian chờ trước khi thử đóng circuit (ms).                               |
| `volumeThreshold`          | `number`  | `10`                     | Số lượng request tối thiểu trước khi circuit có thể mở.                      |
| `rollingCountTimeout`      | `number`  | `10000`                  | Thời gian cho rolling window (ms).                                           |
| `rollingCountBuckets`      | `number`  | `10`                     | Số bucket trong rolling window.                                              |
| `allowWarmUp`              | `boolean` | `true`                   | Cho phép warm-up period trước khi circuit có thể mở.                         |
| `name`                     | `string`  | `'grpc-circuit-breaker'` | Tên cho circuit breaker (dùng cho logging).                                  |

### Error model: GrpcClientException

Mọi lỗi sau khi qua `catchError` sẽ ném `GrpcClientException` với các field:

| Field      | Type       | Mô tả                                    |
| ---------- | ---------- | ---------------------------------------- |
| `message`  | `string`   | Thông điệp lỗi.                          |
| `code`     | `number?`  | gRPC status code (nếu có).               |
| `details`  | `unknown?` | Thông tin chi tiết (string hoặc object). |
| `metadata` | `unknown?` | Metadata gRPC (nếu được đính kèm).       |

:::warning
`retry` chỉ áp dụng khi lỗi có `code` và nằm trong `retryableCodes`. Nếu không, lỗi được throw ngay.
:::

### Ví dụ sử dụng

<Tabs>
  <TabItem value="setup" label="Setup trong Module">

```ts:title="Module Setup với gRPC Client"
// user.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'USER_GRPC_CLIENT',
                transport: Transport.GRPC,
                options: {
                    package: 'user',
                    protoPath: join(__dirname, '../proto/user.proto'),
                    url: 'localhost:50051',
                },
            },
        ]),
    ],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
```

  </TabItem>
  <TabItem value="service" label="Service Implementation">

```ts:title="Service Implementation với Circuit Breaker"
// user.service.ts
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { createWrappedGrpc, WrappedGrpc } from '@ecom-co/grpc';
import { firstValueFrom, Observable } from 'rxjs';

interface UserGrpcService {
    getUser(data: { id: string }): Observable<any>;
    createUser(data: any): Observable<any>;
    updateUser(data: any): Observable<any>;
}

@Injectable()
export class UserService implements OnModuleDestroy {
    private grpc: WrappedGrpc;
    private userService: UserGrpcService;

    constructor(@Inject('USER_GRPC_CLIENT') private readonly client: ClientGrpc) {
        this.grpc = createWrappedGrpc(this.client, {
            enableLogging: true,
            timeout: 15000, // 15 seconds
            retry: 3,
            maxRetryDelay: 5000,
            retryableCodes: [1, 4, 8, 10, 13, 14, 15], // CANCELLED, DEADLINE_EXCEEDED, etc.
            sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'auth'],
            opossum: {
                enabled: true,
                timeout: 15000,
                errorThresholdPercentage: 30, // Mở circuit khi 30% requests fail
                resetTimeout: 20000, // Đợi 20s trước khi thử đóng circuit
                volumeThreshold: 5, // Cần ít nhất 5 requests trước khi mở circuit
            },
        });
    }

    onModuleInit() {
        this.userService = this.grpc.getService<UserGrpcService>('UserService');
    }

    onModuleDestroy() {
        // Cleanup resources
        this.grpc.dispose();
    }

    async findById(id: string) {
        try {
            return await firstValueFrom(this.userService.getUser({ id }));
        } catch (error) {
            // error sẽ là GrpcClientException, sẽ được GrpcClientFilter xử lý
            throw error;
        }
    }

    async create(userData: any) {
        return firstValueFrom(this.userService.createUser(userData));
    }
}
```

  </TabItem>
  <TabItem value="controller" label="Controller Usage">

```ts:title="Controller Usage"
// user.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get(':id')
    async getUser(@Param('id') id: string) {
        // Nếu gRPC service lỗi, GrpcClientFilter sẽ tự động convert thành HTTP response
        return this.userService.findById(id);
    }

    @Post()
    async createUser(@Body() userData: any) {
        return this.userService.create(userData);
    }
}
```

  </TabItem>
  <TabItem value="observable" label="Observable Pattern">

```ts:title="Observable Pattern Usage"
// Sử dụng Observable trực tiếp
const user$ = userService.getUser({ id: '123' });
user$.subscribe({
    next: (u) => console.log(u),
    error: (e) => console.error(e), // e instanceof GrpcClientException
});

// Hoặc convert thành Promise
const user = await firstValueFrom(userService.getUser({ id: '123' }));
```

  </TabItem>
  <TabItem value="advanced" label="Advanced Configuration">

```ts:title="Advanced Configuration với Circuit Breaker"
// Cấu hình nâng cao cho production
const grpc = createWrappedGrpc(clientGrpc, {
    enableLogging: process.env.NODE_ENV !== 'production',
    timeout: 30000, // 30s cho operations phức tạp
    retry: 2, // Ít retry hơn để tránh cascade failure
    maxRetryDelay: 8000,
    retryableCodes: [
        1, // CANCELLED - client cancel
        4, // DEADLINE_EXCEEDED - timeout
        8, // RESOURCE_EXHAUSTED - rate limit
        14, // UNAVAILABLE - service down
    ],
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'auth', 'apiKey'],
    opossum: {
        enabled: true,
        timeout: 30000,
        errorThresholdPercentage: 40, // Mở circuit khi 40% requests fail
        resetTimeout: 60000, // Đợi 1 phút trước khi thử đóng circuit
        volumeThreshold: 10, // Cần ít nhất 10 requests
        rollingCountTimeout: 15000, // 15s rolling window
        allowWarmUp: true, // Cho phép warm-up period
    },
});

// Sử dụng với error handling chi tiết
try {
    const result = await firstValueFrom(service.complexOperation(data));
    return result;
} catch (error) {
    if (error.code === 5) {
        // NOT_FOUND
        throw new NotFoundException('Resource not found');
    }
    // Các lỗi khác để GrpcClientFilter xử lý
    throw error;
}
```

  </TabItem>
</Tabs>

### Logging & sanitize args

```ts:title="Logging với Sanitization"
// Các field sau sẽ bị thay bằng "[REDACTED]" trong log:
// password, token, secret, key, authorization, auth
this.logger.debug(`Calling gRPC method: ${service}.${method}`, { args: sanitizedArgs });

// Ví dụ log output:
// Calling gRPC method: UserService.createUser {
//   args: [{
//     name: "John Doe",
//     email: "john@example.com",
//     password: "[REDACTED]"
//   }]
// }
```

### Circuit Breaker Events & Logging

Khi circuit breaker được bật, bạn sẽ thấy các log events sau:

```ts:title="Circuit Breaker Events & Logging"
// Circuit breaker mở
[WARN] Circuit breaker opened for UserService.getUser

// Circuit breaker đóng
[LOG] Circuit breaker closed for UserService.getUser

// Circuit breaker half-open (đang test recovery)
[LOG] Circuit breaker half-open for UserService.getUser

// Khi circuit mở, tất cả requests sẽ nhận error:
// Error: Breaker is open
// Code: 'EOPENBREAKER'
```

### Resource Management

```ts:title="Resource Management và Cleanup"
// Trong service, implement OnModuleDestroy để cleanup
export class UserService implements OnModuleDestroy {
    // ... constructor và methods

    onModuleDestroy() {
        // Đóng tất cả circuit breakers và cleanup resources
        this.grpc.dispose();
    }
}

// Hoặc manual cleanup
const grpc = createWrappedGrpc(clientGrpc, options);
// ... sử dụng
grpc.dispose(); // Cleanup khi không cần nữa
```

### Mermaid: Complete Pipeline với Circuit Breaker

```mermaid:title="Complete Pipeline với Circuit Breaker"
flowchart TD
  A[Observable từ ClientGrpc] --> B{Circuit Breaker enabled?}
  B -- No --> C[Standard Pipeline]
  B -- Yes --> D{Circuit State?}

  D -- Closed --> E[Execute Request]
  D -- Open --> F[Reject: "Breaker is open"]
  D -- HalfOpen --> G[Single Test Request]

  E --> H{timeout > 0?}
  H -- No --> I
  H -- Yes --> I[apply timeout(ms)]
  I --> J{retry > 0?}
  J -- No --> K[catchError → throw GrpcClientException]
  J -- Yes --> L[retryIf(code ∈ retryableCodes) with exp backoff]
  L --> K

  G --> H
  F --> K

  K --> M[Track Success/Failure]
  M --> N[Update Circuit State]
```

### Best practices

- **Đặt timeout** phù hợp với SLA của service.
- **Giới hạn retry** để tránh gây load dồn khi downstream gặp sự cố.
- **Circuit Breaker**:
    - Bật `enabled: true` chỉ khi cần tăng resilience
    - Đặt `errorThresholdPercentage` phù hợp (30-50% là hợp lý)
    - `volumeThreshold` nên >= 5 để tránh false positive
    - `resetTimeout` nên đủ dài để service có thời gian recovery
- **Sensitive Fields**: Cấu hình `sensitiveFields` để bảo vệ thông tin nhạy cảm trong log
- **Resource Cleanup**: Luôn implement `OnModuleDestroy` hoặc gọi `dispose()` để cleanup resources
- **Kết hợp GrpcClientFilter** ở HTTP layer để mapping lỗi gRPC → HTTP chuẩn.

### Migration từ version cũ

Nếu bạn đang sử dụng version cũ, các thay đổi chính:

1. **Sensitive Fields**: Mặc định đã bao gồm `authorization` và `auth`
2. **Resource Management**: Thêm method `dispose()` để cleanup
3. **Error Handling**: Cải thiện sanitization cho error details
4. **Validation**: Tăng cường validation cho options

```ts:title="Migration Example"
// Trước (version cũ)
const grpc = createWrappedGrpc(clientGrpc, {
    enableLogging: true,
    timeout: 30000,
    retry: 2,
    opossum: { enabled: true }
});

// Sau (version mới)
const grpc = createWrappedGrpc(clientGrpc, {
    enableLogging: true,
    timeout: 30000,
    retry: 2,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'auth'],
    opossum: {
        enabled: true,
        errorThresholdPercentage: 30,
        resetTimeout: 20000
    }
});

// Cleanup khi service destroy
onModuleDestroy() {
    this.grpc.dispose();
}
```
