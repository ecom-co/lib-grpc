import { DynamicModule, Module } from '@nestjs/common';

import { GrpcServiceManager } from './grpc-service-manager';
import { GrpcStarter } from './grpc-starter';
import { GrpcService } from './grpc.service';
import { GrpcCoreModuleOptions } from './interfaces';
import { ServiceRegistry } from './service-registry';

/**
 * GRPC MODULE - Simple approach with GrpcStarter always available
 */
@Module({})
export class GrpcModule {
    /**
     * Configure gRPC module with static options
     * @param options - Configuration options for gRPC services
     */
    static forRoot(options: GrpcCoreModuleOptions = {}): DynamicModule {
        // Apply default values for safety, but respect user's isDevelopment setting
        const config: GrpcCoreModuleOptions = {
            services: [],
            host: 'localhost',
            basePort: 50051,
            isDevelopment: options.isDevelopment ?? process.env.NODE_ENV === 'development',
            loaderOptions: {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
            },
            ...options,
        };

        return {
            module: GrpcModule,
            providers: [
                {
                    provide: 'GRPC_CORE_OPTIONS',
                    useValue: config,
                },
                {
                    provide: ServiceRegistry,
                    useFactory: () => new ServiceRegistry(config.services || []),
                },
                GrpcService,
                GrpcServiceManager,
                GrpcStarter,
            ],
            exports: [GrpcService, ServiceRegistry, GrpcServiceManager, GrpcStarter, 'GRPC_CORE_OPTIONS'],
            global: true,
        };
    }

    /**
     * Configure gRPC module with async factory
     * @param options - Async configuration factory options
     */
    static forRootAsync(options: {
        useFactory: (...args: unknown[]) => Promise<GrpcCoreModuleOptions> | GrpcCoreModuleOptions;
        inject?: string[];
        imports?: DynamicModule[];
    }): DynamicModule {
        return {
            module: GrpcModule,
            imports: options.imports || [],
            providers: [
                {
                    provide: 'GRPC_CORE_OPTIONS',
                    useFactory: async (...args: unknown[]) => {
                        const config = await options.useFactory(...args);

                        // Apply default values for safety, but respect user's isDevelopment setting
                        return {
                            services: [],
                            host: 'localhost',
                            basePort: 50051,
                            isDevelopment: config.isDevelopment ?? process.env.NODE_ENV === 'development',
                            loaderOptions: {
                                keepCase: true,
                                longs: String,
                                enums: String,
                                defaults: true,
                                oneofs: true,
                            },
                            ...config,
                        } as GrpcCoreModuleOptions;
                    },
                    inject: options.inject || [],
                },
                {
                    provide: ServiceRegistry,
                    useFactory: (coreOptions: GrpcCoreModuleOptions) => new ServiceRegistry(coreOptions.services || []),
                    inject: ['GRPC_CORE_OPTIONS'],
                },
                GrpcService,
                GrpcServiceManager,
                GrpcStarter,
            ],
            exports: [GrpcService, ServiceRegistry, GrpcServiceManager, GrpcStarter, 'GRPC_CORE_OPTIONS'],
            global: true,
        };
    }
}
