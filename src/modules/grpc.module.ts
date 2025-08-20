/* eslint-disable @typescript-eslint/no-explicit-any */
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
            basePort: 50051,
            host: 'localhost',
            isDevelopment: options.isDevelopment ?? process.env.NODE_ENV === 'development',
            loaderOptions: {
                defaults: true,
                enums: String,
                keepCase: true,
                longs: String,
                oneofs: true,
            },
            services: [],
            ...options,
        };

        return {
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
            module: GrpcModule,
        };
    }

    /**
     * Configure gRPC module with async factory
     * @param options - Async configuration factory options
     */
    static forRootAsync<TArgs extends readonly any[] = readonly any[]>(options: {
        imports?: DynamicModule[];
        inject?: string[];
        useFactory: (...args: TArgs) => GrpcCoreModuleOptions | Promise<GrpcCoreModuleOptions>;
    }): DynamicModule {
        return {
            imports: options.imports || [],
            providers: [
                {
                    inject: options.inject || [],
                    provide: 'GRPC_CORE_OPTIONS',
                    useFactory: async (...args: TArgs) => {
                        const config = await options.useFactory(...args);

                        // Apply default values for safety, but respect user's isDevelopment setting
                        return {
                            basePort: 50051,
                            host: 'localhost',
                            isDevelopment: config.isDevelopment ?? process.env.NODE_ENV === 'development',
                            loaderOptions: {
                                defaults: true,
                                enums: String,
                                keepCase: true,
                                longs: String,
                                oneofs: true,
                            },
                            services: [],
                            ...config,
                        } as GrpcCoreModuleOptions;
                    },
                },
                {
                    inject: ['GRPC_CORE_OPTIONS'],
                    provide: ServiceRegistry,
                    useFactory: (coreOptions: GrpcCoreModuleOptions) => new ServiceRegistry(coreOptions.services || []),
                },
                GrpcService,
                GrpcServiceManager,
                GrpcStarter,
            ],
            exports: [GrpcService, ServiceRegistry, GrpcServiceManager, GrpcStarter, 'GRPC_CORE_OPTIONS'],
            global: true,
            module: GrpcModule,
        };
    }
}
