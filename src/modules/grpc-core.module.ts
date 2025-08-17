import { DynamicModule, Module } from '@nestjs/common';

import { GrpcBootstrapper } from './grpc-bootstrapper';
import { GrpcService } from './grpc.service';
import { GrpcCoreModuleOptions } from './interfaces';
import { ServiceRegistry } from './service-registry';

/**
 * GRPC MODULE - Essential functionality
 * Lightweight, fast startup, modular architecture
 */
@Module({})
export class GrpcModule {
    static forRoot(options: GrpcCoreModuleOptions = {}): DynamicModule {
        return {
            module: GrpcModule,
            providers: [
                {
                    provide: 'GRPC_CORE_OPTIONS',
                    useValue: options,
                },
                {
                    provide: ServiceRegistry,
                    useFactory: () => new ServiceRegistry(options.services || []),
                },
                GrpcService,
                GrpcBootstrapper, // Auto-bootstrap services on application start
            ],
            exports: [GrpcService, ServiceRegistry, GrpcBootstrapper, 'GRPC_CORE_OPTIONS'],
            global: true,
        };
    }

    static forRootAsync(options: {
        useFactory: (...args: unknown[]) => Promise<GrpcCoreModuleOptions> | GrpcCoreModuleOptions;
        inject?: string[];
    }): DynamicModule {
        return {
            module: GrpcModule,
            providers: [
                {
                    provide: 'GRPC_CORE_OPTIONS',
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
                {
                    provide: ServiceRegistry,
                    useFactory: (coreOptions: GrpcCoreModuleOptions) => new ServiceRegistry(coreOptions.services || []),
                    inject: ['GRPC_CORE_OPTIONS'],
                },
                GrpcService,
                GrpcBootstrapper,
            ],
            exports: [GrpcService, ServiceRegistry, GrpcBootstrapper, 'GRPC_CORE_OPTIONS'],
            global: true,
        };
    }
}
