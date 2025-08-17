import { DynamicModule, Module, Provider } from '@nestjs/common';

import { GRPC_MODULE_OPTIONS, GRPC_SERVICE_REGISTRY } from './constants';
import { GrpcModuleOptions, GrpcModuleAsyncOptions } from './interfaces';
import { ServiceManager } from './service-manager';
import { ServiceRegistry } from './service-registry';

@Module({})
export class GrpcModule {
    /**
     * Create a synchronous module
     */
    static forRoot(options: GrpcModuleOptions = {}): DynamicModule {
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

        return {
            module: GrpcModule,
            providers,
            exports: [ServiceManager, ServiceRegistry, GRPC_MODULE_OPTIONS],
            global: true,
        };
    }

    /**
     * Create an asynchronous module
     */
    static forRootAsync(options: GrpcModuleAsyncOptions): DynamicModule {
        const providers: Provider[] = [
            {
                provide: GRPC_MODULE_OPTIONS,
                useFactory: options.useFactory!,
                inject: options.inject || [],
            },
            {
                provide: GRPC_SERVICE_REGISTRY,
                useFactory: (moduleOptions: GrpcModuleOptions) => new ServiceRegistry(moduleOptions.services || []),
                inject: [GRPC_MODULE_OPTIONS],
            },
            {
                provide: ServiceRegistry,
                useExisting: GRPC_SERVICE_REGISTRY,
            },
            ServiceManager,
        ];

        return {
            module: GrpcModule,
            providers,
            exports: [ServiceManager, ServiceRegistry, GRPC_MODULE_OPTIONS],
            global: true,
        };
    }
}
