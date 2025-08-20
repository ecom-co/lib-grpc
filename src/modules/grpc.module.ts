/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicModule, Module } from '@nestjs/common';

import { GrpcConfigService } from './grpc-config.service';
import { GrpcServiceManager } from './grpc-service-manager';
import { GrpcStarter } from './grpc-starter';
import { GrpcService } from './grpc.service';
import { GrpcConfig, GrpcCoreModuleOptions } from './interfaces';
import { ServiceRegistry } from './service-registry';

/**
 * GRPC MODULE - Simple approach with GrpcStarter always available
 */
@Module({})
export class GrpcModule {
    private static configs: GrpcConfig[] = [];

    /**
     * Get all gRPC configurations
     */
    static getConfigs(): GrpcConfig[] {
        return this.configs;
    }

    /**
     * Configure gRPC module with static options
     * @param options - Configuration options for gRPC services
     */
    static forRoot(options: GrpcCoreModuleOptions = {}): DynamicModule {
        // Apply default values for safety, but respect user's isDevelopment setting
        const config: GrpcCoreModuleOptions = {
            basePort: 50051,
            configs: [],
            host: 'localhost',
            isDevelopment: options.isDevelopment ?? process.env.NODE_ENV === 'development',
            loaderOptions: {
                defaults: true,
                enums: String,
                keepCase: true,
                longs: String,
                oneofs: true,
            },
            ...options,
        };

        // Store configs for later access
        this.configs = config.configs || [];

        return {
            providers: [
                {
                    provide: GrpcConfigService,
                    useFactory: () => {
                        const configService = new GrpcConfigService();

                        configService.setOptions(config);

                        return configService;
                    },
                },
                {
                    inject: [GrpcConfigService],
                    provide: ServiceRegistry,
                    useFactory: (configService: GrpcConfigService) => new ServiceRegistry(configService.getConfigs()),
                },
                GrpcService,
                GrpcServiceManager,
                GrpcStarter,
            ],
            exports: [GrpcService, ServiceRegistry, GrpcServiceManager, GrpcStarter, GrpcConfigService],
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
                    provide: GrpcConfigService,
                    useFactory: async (...args: TArgs) => {
                        const config = await options.useFactory(...args);

                        // Apply default values for safety, but respect user's isDevelopment setting
                        const finalConfig = {
                            basePort: 50051,
                            configs: [],
                            host: 'localhost',
                            isDevelopment: config.isDevelopment ?? process.env.NODE_ENV === 'development',
                            loaderOptions: {
                                defaults: true,
                                enums: String,
                                keepCase: true,
                                longs: String,
                                oneofs: true,
                            },
                            ...config,
                        } as GrpcCoreModuleOptions;

                        // Store configs for later access
                        GrpcModule.configs = finalConfig.configs || [];

                        const configService = new GrpcConfigService();

                        configService.setOptions(finalConfig);

                        return configService;
                    },
                },
                {
                    inject: [GrpcConfigService],
                    provide: ServiceRegistry,
                    useFactory: (configService: GrpcConfigService) => new ServiceRegistry(configService.getConfigs()),
                },
                GrpcService,
                GrpcServiceManager,
                GrpcStarter,
            ],
            exports: [GrpcService, ServiceRegistry, GrpcServiceManager, GrpcStarter, GrpcConfigService],
            global: true,
            module: GrpcModule,
        };
    }
}
