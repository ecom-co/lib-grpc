# Enhanced gRPC Library - Scale Features

This document describes the new scale features added to the @ecom-co/grpc library.

## Overview

The enhanced gRPC library now includes the following scale features:

1. **Service Discovery** - Dynamic service registration and discovery
2. **Circuit Breaker** - Fault tolerance and resilience patterns
3. **Health Checks** - Automated service health monitoring
4. **Distributed Tracing** - Request tracing across services
5. **Clustering** - Multi-node service coordination

## Features

### 1. Service Discovery

Supports multiple backends for service registration and discovery:

- **Memory** - In-memory service registry (default)
- **Consul** - HashiCorp Consul integration (planned)
- **etcd** - etcd key-value store integration (planned)

```typescript
// Basic setup with memory provider
const config: GrpcModuleOptions = {
  services: [...],
  serviceDiscovery: {
    provider: 'memory'
  }
};
```

### 2. Circuit Breaker

Implements the circuit breaker pattern for fault tolerance:

- **Failure Threshold** - Number of failures before opening circuit
- **Recovery Timeout** - Time before attempting to close circuit
- **Monitoring Period** - Time window for failure tracking
- **Expected Errors** - List of expected gRPC errors

```typescript
const config: GrpcModuleOptions = {
  services: [...],
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    expectedErrors: ['UNAVAILABLE', 'DEADLINE_EXCEEDED']
  }
};
```

### 3. Health Checks

Automated health monitoring for all registered services:

- **Interval** - Time between health checks
- **Timeout** - Maximum time for health check response
- **Retries** - Number of retry attempts on failure
- **Endpoint** - Custom health check endpoint (optional)

```typescript
const config: GrpcModuleOptions = {
  services: [...],
  healthCheck: {
    interval: 30000,
    timeout: 5000,
    retries: 3
  }
};
```

### 4. Distributed Tracing

Request tracing across service boundaries:

- **Service Name** - Name for tracing identification
- **Jaeger Endpoint** - Jaeger collector endpoint (optional)
- **Sampling Rate** - Percentage of requests to trace (0.0-1.0)
- **Tags** - Default tags for all traces

```typescript
const config: GrpcModuleOptions = {
  services: [...],
  tracing: {
    serviceName: 'user-service',
    samplingRate: 0.1, // 10% sampling
    jaegerEndpoint: 'http://jaeger-collector:14268',
    tags: {
      'service.version': '1.0.0',
      'environment': 'production'
    }
  }
};
```

### 5. Clustering

Multi-node coordination and leader election:

- **Node ID** - Unique identifier for this node
- **Nodes** - List of cluster nodes
- **Leader Election** - Enable/disable leader election
- **Heartbeat Interval** - Time between heartbeats
- **Election Timeout** - Maximum time for leader election

```typescript
const config: GrpcModuleOptions = {
  services: [...],
  cluster: {
    nodeId: 'user-service-node-1',
    nodes: [],
    leaderElection: true,
    heartbeatInterval: 5000,
    electionTimeout: 15000
  }
};
```

## Usage Examples

### Basic Enhanced Module Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { 
  GrpcModule, 
  GrpcModuleOptions 
} from '@ecom-co/grpc';

const services = [
  {
    name: 'User Service',
    package: 'user',
    protoPath: 'src/proto/user.proto',
    port: 50052,
    enabled: true,
  }
];

const config: GrpcModuleOptions = {
  services,
  basePath: process.cwd(),
  
  // Enable service discovery
  serviceDiscovery: {
    provider: 'memory'
  },
  
  // Enable circuit breaker
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 10000,
    monitoringPeriod: 30000
  },
  
  // Enable health checks
  healthCheck: {
    interval: 15000,
    timeout: 3000,
    retries: 2
  },
  
  // Enable tracing
  tracing: {
    serviceName: 'user-service',
    samplingRate: 1.0
  },
  
  // Enable clustering
  cluster: {
    nodeId: 'user-service-1',
    nodes: [],
    leaderElection: true
  }
};

@Module({
  imports: [
    GrpcModule.forRoot(config)
  ],
})
export class AppModule {}
```

### Using Service Manager

```typescript
// user.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { 
  EnhancedServiceManager,
  ServiceDiscovery,
  CircuitBreaker 
} from '@ecom-co/grpc';

@Injectable()
export class UserService {
  constructor(
    private readonly enhancedServiceManager: EnhancedServiceManager,
    @Inject('SERVICE_DISCOVERY') private readonly serviceDiscovery: ServiceDiscovery,
    @Inject('CIRCUIT_BREAKER') private readonly circuitBreaker: CircuitBreaker
  ) {}

  async createUser(userData: any) {
    // Execute with circuit breaker and tracing
    return this.enhancedServiceManager.executeWithEnhancements(
      async () => {
        // Your business logic here
        return { id: 1, ...userData };
      },
      'createUser'
    );
  }

  async getServiceInstances() {
    // Discover other service instances
    return this.enhancedServiceManager.discoverServices('product-service');
  }

  async getSystemStatus() {
    // Get enhanced status with all monitoring data
    return this.enhancedServiceManager.getEnhancedServiceStatus();
  }
}
```

### Enhanced Bootstrap with All Features

```typescript
// main.ts
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EnhancedServiceManager } from '@ecom-co/grpc';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const enhancedServiceManager = app.get(EnhancedServiceManager);

  // Start health monitoring
  enhancedServiceManager.startHealthMonitoring({
    interval: 30000,
    timeout: 5000,
    retries: 3
  });

  // Register services with discovery
  const services = enhancedServiceManager.getAllServices();
  for (const service of services) {
    if (service.enabled) {
      await enhancedServiceManager.registerServiceWithDiscovery(service);
    }
  }

  // Watch for service changes
  enhancedServiceManager.watchServiceChanges('product-service', (instances) => {
    logger.log(`Product service instances updated: ${instances.length} instances`);
  });

  // Log enhanced status
  const status = enhancedServiceManager.getEnhancedServiceStatus();
  logger.log(`System Status: ${JSON.stringify(status, null, 2)}`);

  // Setup graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await enhancedServiceManager.gracefulShutdown();
    process.exit(0);
  });

  await app.listen(3000);
  logger.log('Enhanced gRPC service started');
};

bootstrap();
```

## Monitoring and Observability

### Circuit Breaker Metrics

```typescript
const metrics = enhancedServiceManager.getCircuitBreakerMetrics();
console.log('Circuit Breaker Metrics:', metrics);
// Output: { totalRequests: 100, successfulRequests: 95, failedRequests: 5, ... }
```

### Cluster Status

```typescript
const clusterInfo = enhancedServiceManager.getClusterInfo();
console.log('Cluster Info:', clusterInfo);
// Output: { nodes: [...], leader: {...}, isLeader: true }
```

### Enhanced Service Status

```typescript
const status = enhancedServiceManager.getEnhancedServiceStatus();
console.log('Enhanced Status:', status);
// Output: { services: [...], cluster: {...}, circuitBreaker: {...}, health: {...} }
```

## Best Practices

1. **Service Discovery**: Use memory provider for development, Consul/etcd for production
2. **Circuit Breaker**: Set appropriate failure thresholds based on your service SLA
3. **Health Checks**: Balance check frequency with system load
4. **Tracing**: Use sampling to reduce overhead in high-traffic environments
5. **Clustering**: Ensure proper network connectivity between cluster nodes

## Performance Considerations

1. **Memory Usage**: Service registry keeps all data in memory
2. **Network Overhead**: Health checks and heartbeats generate network traffic
3. **Tracing Overhead**: High sampling rates can impact performance
4. **Circuit Breaker**: Adds minimal latency to each request

## Migration from Basic Library

To migrate from the basic gRPC library:

1. Replace your existing `GrpcModule` with the new enhanced `GrpcModule`
2. Update configuration to include new scale features
3. Replace `ServiceManager` with `EnhancedServiceManager`
4. Add monitoring and observability code

## Future Enhancements

- Consul service discovery integration
- etcd service discovery integration
- Advanced circuit breaker patterns (bulkhead, timeout)
- Metrics export to Prometheus
- Integration with external tracing systems
- Advanced clustering algorithms
- Service mesh integration

## Troubleshooting

### Common Issues

1. **Service Discovery Not Working**: Check provider configuration
2. **Circuit Breaker Always Open**: Review failure threshold and expected errors
3. **Health Checks Failing**: Verify timeout and retry settings
4. **Tracing Data Missing**: Check sampling rate and Jaeger endpoint
5. **Cluster Leader Election Issues**: Ensure network connectivity between nodes

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
// Set LOG_LEVEL=debug environment variable
process.env.LOG_LEVEL = 'debug';
```

### Performance Monitoring

Monitor key metrics:

- Circuit breaker success/failure rates
- Health check response times
- Service discovery lookup times
- Cluster heartbeat latency
- Tracing overhead
