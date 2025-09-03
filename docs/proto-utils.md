---
id: proto-utils
title: Proto Utils — Shared Proto Files Management
sidebar_label: Proto Utils
slug: /proto-utils
description: Utility module để share và manage proto files trong gRPC library, hỗ trợ dynamic discovery và custom proto paths.
tags: [grpc, proto, protobuf, utils, shared, library]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::info
`Proto Utils` là utility module để share proto files giữa các services, quản lý proto file paths và hỗ trợ dynamic discovery. Thay vì duplicate proto files ở nhiều nơi, bạn có thể sử dụng shared library này.
:::

### Tổng quan

- **Shared Proto Files**: Centralized proto files cho tất cả services
- **Dynamic Discovery**: Tự động discover proto files trong services directory
- **Path Management**: Utility functions để get proto paths
- **Backward Compatibility**: Support legacy exports
- **Customizable**: Có thể extend và customize cho project riêng

### File Structure

```
libs/grpc/
├── proto/
│   ├── services/
│   │   ├── auth.proto
│   │   └── user.proto
│   └── README.md
└── src/
    └── proto.utils.ts
```

### API Reference

#### Functions

| Function                    | Return Type | Mô tả                                                |
| --------------------------- | ----------- | ---------------------------------------------------- |
| `getProtoFiles()`           | `string[]`  | Get tất cả proto file paths trong services directory |
| `getProtoPath(serviceName)` | `string`    | Get proto file path theo service name                |
| `getProtoDir()`             | `string`    | Get proto root directory path                        |
| `getServicesDir()`          | `string`    | Get services directory path                          |

#### Constants

| Constant       | Type     | Mô tả                                     |
| -------------- | -------- | ----------------------------------------- |
| `PROTO_PATHS`  | `object` | Organized proto paths by functionality    |
| `PROTO_DIR`    | `string` | Legacy: proto root directory (deprecated) |
| `SERVICES_DIR` | `string` | Legacy: services directory (deprecated)   |
| `AUTH_PROTO`   | `string` | Legacy: auth.proto path (deprecated)      |
| `USER_PROTO`   | `string` | Legacy: user.proto path (deprecated)      |

### Usage Examples

<Tabs>
  <TabItem value="basic" label="Basic Usage">

```ts
// Import proto utils
import { getProtoFiles, getProtoPath, getProtoDir, PROTO_PATHS } from '@ecom-co/grpc/proto.utils';

// Get all proto files
const allProtoFiles = getProtoFiles();
console.log(allProtoFiles);
// ['/path/to/proto/services/auth.proto', '/path/to/proto/services/user.proto']

// Get specific proto file path
const userProtoPath = getProtoPath('user');
console.log(userProtoPath);
// '/path/to/proto/services/user.proto'

// Get directories
const protoDir = getProtoDir();
const servicesDir = getServicesDir();

// Using organized constants
console.log(PROTO_PATHS.SERVICES.AUTH);
// '/path/to/proto/services/auth.proto'
```

  </TabItem>
  <TabItem value="nestjs" label="NestJS Integration">

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { getProtoPath, PROTO_PATHS } from '@ecom-co/grpc/proto.utils';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'AUTH_SERVICE',
                transport: Transport.GRPC,
                options: {
                    package: 'auth',
                    protoPath: getProtoPath('auth'), // Dynamic path
                    url: 'localhost:50051',
                },
            },
            {
                name: 'USER_SERVICE',
                transport: Transport.GRPC,
                options: {
                    package: 'user',
                    protoPath: PROTO_PATHS.SERVICES.USER, // Static constant
                    url: 'localhost:50052',
                },
            },
        ]),
    ],
})
export class AppModule {}
```

  </TabItem>
  <TabItem value="microservice" label="Microservice Setup">

```ts
// main.ts - gRPC Microservice
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getProtoFiles, getProtoPath } from '@ecom-co/grpc/proto.utils';
import { AppModule } from './app.module';

async function bootstrap() {
    // Single service
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.GRPC,
        options: {
            package: 'user',
            protoPath: getProtoPath('user'),
            url: '0.0.0.0:50052',
        },
    });

    await app.listen();
}

// Multiple services
async function bootstrapMultipleServices() {
    const allProtoFiles = getProtoFiles();

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.GRPC,
        options: {
            package: ['auth', 'user'], // Multiple packages
            protoPath: allProtoFiles, // All proto files
            url: '0.0.0.0:50050',
        },
    });

    await app.listen();
}

bootstrap();
```

  </TabItem>
</Tabs>

### Customization Guide

#### 1. Clone và Setup

```bash
# Clone library về project
git clone <grpc-lib-repo>
cd libs/grpc

# Install dependencies
npm install

# Build library
npm run build
```

#### 2. Thêm Proto Files Mới

```bash
# Thêm proto file mới
touch proto/services/payment.proto
touch proto/services/notification.proto
```

```protobuf
// proto/services/payment.proto
syntax = "proto3";

package payment;

service PaymentService {
    rpc ProcessPayment(PaymentRequest) returns (PaymentResponse);
    rpc GetPaymentHistory(HistoryRequest) returns (HistoryResponse);
}

message PaymentRequest {
    string user_id = 1;
    double amount = 2;
    string currency = 3;
    string method = 4;
}

message PaymentResponse {
    string transaction_id = 1;
    string status = 2;
    string message = 3;
}
```

#### 3. Update Constants

```ts
// src/proto.utils.ts - Thêm constants mới
export const PROTO_PATHS = {
    ROOT: PROTO_ROOT,
    SERVICES: {
        AUTH: path.join(PROTO_ROOT, 'services', 'auth.proto'),
        DIR: path.join(PROTO_ROOT, 'services'),
        USER: path.join(PROTO_ROOT, 'services', 'user.proto'),
        // Thêm services mới
        PAYMENT: path.join(PROTO_ROOT, 'services', 'payment.proto'),
        NOTIFICATION: path.join(PROTO_ROOT, 'services', 'notification.proto'),
    },
} as const;

// Legacy exports - thêm nếu cần backward compatibility
export const PAYMENT_PROTO = PROTO_PATHS.SERVICES.PAYMENT;
export const NOTIFICATION_PROTO = PROTO_PATHS.SERVICES.NOTIFICATION;
```

#### 4. Build và Publish

```bash
# Build lại library
npm run build

# Test functions
npm test

# Publish (nếu là npm package)
npm publish
```

### Advanced Usage

<Tabs>
  <TabItem value="dynamic" label="Dynamic Service Discovery">

```ts
// services/dynamic-grpc.service.ts
import { Injectable } from '@nestjs/common';
import { getProtoFiles } from '@ecom-co/grpc/proto.utils';
import * as path from 'path';

@Injectable()
export class DynamicGrpcService {
    private availableServices: string[] = [];

    constructor() {
        this.discoverServices();
    }

    private discoverServices() {
        const protoFiles = getProtoFiles();

        this.availableServices = protoFiles.map((filePath) => {
            const fileName = path.basename(filePath, '.proto');
            return fileName;
        });

        console.log('Discovered services:', this.availableServices);
    }

    getAvailableServices(): string[] {
        return this.availableServices;
    }

    isServiceAvailable(serviceName: string): boolean {
        return this.availableServices.includes(serviceName);
    }
}
```

  </TabItem>
  <TabItem value="config" label="Configuration Service">

```ts
// config/grpc-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getProtoPath, PROTO_PATHS } from '@ecom-co/grpc/proto.utils';

interface GrpcServiceConfig {
    name: string;
    package: string;
    protoPath: string;
    url: string;
}

@Injectable()
export class GrpcConfigService {
    constructor(private configService: ConfigService) {}

    getServiceConfig(serviceName: string): GrpcServiceConfig {
        const baseUrl = this.configService.get('GRPC_BASE_URL', 'localhost');
        const port = this.configService.get(`GRPC_${serviceName.toUpperCase()}_PORT`);

        return {
            name: `${serviceName.toUpperCase()}_SERVICE`,
            package: serviceName.toLowerCase(),
            protoPath: getProtoPath(serviceName),
            url: `${baseUrl}:${port}`,
        };
    }

    getAllServicesConfig(): GrpcServiceConfig[] {
        const services = ['auth', 'user', 'payment'];
        return services.map((service) => this.getServiceConfig(service));
    }

    // Static config cho performance
    getStaticConfig() {
        return {
            AUTH_SERVICE: {
                name: 'AUTH_SERVICE',
                package: 'auth',
                protoPath: PROTO_PATHS.SERVICES.AUTH,
                url: this.configService.get('AUTH_GRPC_URL', 'localhost:50051'),
            },
            USER_SERVICE: {
                name: 'USER_SERVICE',
                package: 'user',
                protoPath: PROTO_PATHS.SERVICES.USER,
                url: this.configService.get('USER_GRPC_URL', 'localhost:50052'),
            },
        };
    }
}
```

  </TabItem>
  <TabItem value="validation" label="Proto File Validation">

```ts
// utils/proto-validator.ts
import * as fs from 'fs';
import { getProtoFiles, getProtoPath } from '@ecom-co/grpc/proto.utils';

export class ProtoValidator {
    static validateProtoExists(serviceName: string): boolean {
        const protoPath = getProtoPath(serviceName);
        return fs.existsSync(protoPath);
    }

    static validateAllProtos(): { valid: string[]; invalid: string[] } {
        const protoFiles = getProtoFiles();
        const valid: string[] = [];
        const invalid: string[] = [];

        protoFiles.forEach((filePath) => {
            if (fs.existsSync(filePath)) {
                valid.push(filePath);
            } else {
                invalid.push(filePath);
            }
        });

        return { valid, invalid };
    }

    static getProtoStats() {
        const protoFiles = getProtoFiles();
        const stats = protoFiles.map((filePath) => ({
            file: filePath,
            exists: fs.existsSync(filePath),
            size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
            modified: fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null,
        }));

        return {
            total: stats.length,
            valid: stats.filter((s) => s.exists).length,
            invalid: stats.filter((s) => !s.exists).length,
            details: stats,
        };
    }
}

// Usage
const validation = ProtoValidator.validateAllProtos();
console.log('Proto validation:', validation);

const stats = ProtoValidator.getProtoStats();
console.log('Proto stats:', stats);
```

  </TabItem>
</Tabs>

### Best Practices

- **Sử dụng functions thay vì constants** cho dynamic paths
- **Validate proto files exist** trước khi sử dụng
- **Cache proto paths** nếu cần performance
- **Version control proto files** cùng với library
- **Document proto file changes** trong changelog
- **Test proto file compatibility** khi update

### Migration Guide

#### Từ Legacy Constants

```ts
// ❌ Old way (deprecated)
import { AUTH_PROTO, USER_PROTO } from '@ecom-co/grpc/proto.utils';

// ✅ New way (recommended)
import { PROTO_PATHS, getProtoPath } from '@ecom-co/grpc/proto.utils';

// Static paths
const authProto = PROTO_PATHS.SERVICES.AUTH;
const userProto = PROTO_PATHS.SERVICES.USER;

// Dynamic paths
const authProto = getProtoPath('auth');
const userProto = getProtoPath('user');
```

#### Custom Proto Directory

```ts
// Nếu cần custom proto directory
const customProtoRoot = path.resolve(__dirname, 'custom-proto');

export const CUSTOM_PROTO_PATHS = {
    ROOT: customProtoRoot,
    SERVICES: {
        CUSTOM: path.join(customProtoRoot, 'services', 'custom.proto'),
    },
};
```

:::tip
Proto Utils được design để dễ dàng extend và customize. Bạn có thể clone library về, thêm proto files mới, update constants và build lại để phù hợp với project của mình.
:::

:::warning
Khi update proto files, đảm bảo backward compatibility để không break existing services. Sử dụng proto versioning nếu cần breaking changes.
:::
