import { DynamicModule, Module, Provider } from '@nestjs/common';

import { GrpcCircuitBreaker } from './circuit-breaker';
import { GrpcClusterManager } from './cluster';
import { GRPC_MODULE_OPTIONS, GRPC_SERVICE_REGISTRY } from './constants';
import { MemoryServiceDiscovery } from './discovery';
import { GrpcHealthChecker } from './health';
import {
    GrpcModuleOptions as BaseGrpcModuleOptions,
    GrpcModuleAsyncOptions as BaseGrpcModuleAsyncOptions,
    ServiceDiscoveryConfig,
    CircuitBreakerConfig,
    HealthCheckConfig,
    TracingConfig,
    ClusterConfig,
} from './interfaces';
import { ServiceManager } from './service-manager';
import { ServiceRegistry } from './service-registry';
import { GrpcDistributedTracer } from './tracing';

type EnhancedGrpcModuleOptions = BaseGrpcModuleOptions & {
    serviceDiscovery?: ServiceDiscoveryConfig;
    circuitBreaker?: CircuitBreakerConfig;
    healthCheck?: HealthCheckConfig;
    tracing?: TracingConfig;
    cluster?: ClusterConfig;
};

type EnhancedGrpcModuleAsyncOptions = Omit<BaseGrpcModuleAsyncOptions, 'useFactory'> & {
    useFactory?: (...args: any[]) => Promise<EnhancedGrpcModuleOptions> | EnhancedGrpcModuleOptions;
};

@Module({})
export class GrpcModule {
    /**
     * Create a synchronous module with scale features
     */
    static forRoot(options: EnhancedGrpcModuleOptions = {}): DynamicModule {
        const providers: Provider[] = [
            {
                provide: GRPC_MODULE_OPTIONS,
                useValue: options,
            },
            {
                provide: GRPC_SERVICE_REGISTRY,
                useFactory: () => new ServiceRegistry(options.services || []),
            },
            {
                provide: ServiceRegistry,
                useExisting: GRPC_SERVICE_REGISTRY,
            },
            ServiceManager,
        ];

        // Add Service Discovery
        if (options.serviceDiscovery) {
            if (options.serviceDiscovery.provider === 'memory') {
                providers.push({
                    provide: 'SERVICE_DISCOVERY',
                    useClass: MemoryServiceDiscovery,
                });
            }
            // Add other providers (consul, etcd) here
        }

        // Add Circuit Breaker
        if (options.circuitBreaker) {
            providers.push({
                provide: 'CIRCUIT_BREAKER',
                useFactory: () => new GrpcCircuitBreaker(options.circuitBreaker!),
            });
        }

        // Add Health Checker
        if (options.healthCheck) {
            providers.push({
                provide: 'HEALTH_CHECKER',
                useClass: GrpcHealthChecker,
            });
        }

        // Add Distributed Tracing
        if (options.tracing) {
            providers.push({
                provide: 'DISTRIBUTED_TRACER',
                useFactory: () => new GrpcDistributedTracer(options.tracing!),
            });
        }

        // Add Cluster Manager
        if (options.cluster) {
            providers.push({
                provide: 'CLUSTER_MANAGER',
                useFactory: () => new GrpcClusterManager(options.cluster!),
            });
        }

        return {
            module: GrpcModule,
            providers,
            exports: [
                ServiceManager,
                ServiceRegistry,
                GRPC_MODULE_OPTIONS,
                ...(options.serviceDiscovery ? ['SERVICE_DISCOVERY'] : []),
                ...(options.circuitBreaker ? ['CIRCUIT_BREAKER'] : []),
                ...(options.healthCheck ? ['HEALTH_CHECKER'] : []),
                ...(options.tracing ? ['DISTRIBUTED_TRACER'] : []),
                ...(options.cluster ? ['CLUSTER_MANAGER'] : []),
            ],
            global: true,
        };
    }

    /**
     * Create an asynchronous module with scale features
     */
    static forRootAsync(options: EnhancedGrpcModuleAsyncOptions): DynamicModule {
        const providers: Provider[] = [
            {
                provide: GRPC_MODULE_OPTIONS,
                useFactory: options.useFactory!,
                inject: options.inject || [],
            },
            {
                provide: GRPC_SERVICE_REGISTRY,
                useFactory: (moduleOptions: EnhancedGrpcModuleOptions) =>
                    new ServiceRegistry(moduleOptions.services || []),
                inject: [GRPC_MODULE_OPTIONS],
            },
            {
                provide: ServiceRegistry,
                useExisting: GRPC_SERVICE_REGISTRY,
            },
            ServiceManager,
        ];

        // Dynamic providers for scale features
        providers.push({
            provide: 'SERVICE_DISCOVERY',
            useFactory: (moduleOptions: EnhancedGrpcModuleOptions) => {
                if (moduleOptions.serviceDiscovery?.provider === 'memory') {
                    return new MemoryServiceDiscovery();
                }
                return null;
            },
            inject: [GRPC_MODULE_OPTIONS],
        });

        providers.push({
            provide: 'CIRCUIT_BREAKER',
            useFactory: (moduleOptions: EnhancedGrpcModuleOptions) =>
                moduleOptions.circuitBreaker ? new GrpcCircuitBreaker(moduleOptions.circuitBreaker) : null,
            inject: [GRPC_MODULE_OPTIONS],
        });

        providers.push({
            provide: 'HEALTH_CHECKER',
            useFactory: (moduleOptions: EnhancedGrpcModuleOptions) =>
                moduleOptions.healthCheck ? new GrpcHealthChecker() : null,
            inject: [GRPC_MODULE_OPTIONS],
        });

        providers.push({
            provide: 'DISTRIBUTED_TRACER',
            useFactory: (moduleOptions: EnhancedGrpcModuleOptions) =>
                moduleOptions.tracing ? new GrpcDistributedTracer(moduleOptions.tracing) : null,
            inject: [GRPC_MODULE_OPTIONS],
        });

        providers.push({
            provide: 'CLUSTER_MANAGER',
            useFactory: (moduleOptions: EnhancedGrpcModuleOptions) =>
                moduleOptions.cluster ? new GrpcClusterManager(moduleOptions.cluster) : null,
            inject: [GRPC_MODULE_OPTIONS],
        });

        return {
            module: GrpcModule,
            providers,
            exports: [
                ServiceManager,
                ServiceRegistry,
                GRPC_MODULE_OPTIONS,
                'SERVICE_DISCOVERY',
                'CIRCUIT_BREAKER',
                'HEALTH_CHECKER',
                'DISTRIBUTED_TRACER',
                'CLUSTER_MANAGER',
            ],
            global: true,
        };
    }
}
