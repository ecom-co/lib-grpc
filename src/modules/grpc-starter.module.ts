import { DynamicModule, Module } from '@nestjs/common';

import { GrpcStarter } from './grpc-starter';
import { GrpcModule } from './grpc.module';
import { GrpcCoreModuleOptions } from './interfaces';

/**
 * Optional module for manual gRPC service management
 * Use this when you need full control over service lifecycle
 */
@Module({})
export class GrpcStarterModule {
    /**
     * Import this module when you want manual control over gRPC services
     * @param options - Same options as GrpcModule.forRoot()
     */
    static forRoot(options: GrpcCoreModuleOptions = {}): DynamicModule {
        return {
            module: GrpcStarterModule,
            imports: [GrpcModule.forRoot(options)],
            providers: [GrpcStarter],
            exports: [GrpcStarter],
            global: false, // Not global by default
        };
    }

    /**
     * Async version for manual control
     */
    static forRootAsync(options: {
        useFactory: (...args: unknown[]) => Promise<GrpcCoreModuleOptions> | GrpcCoreModuleOptions;
        inject?: string[];
        imports?: DynamicModule[];
    }): DynamicModule {
        return {
            module: GrpcStarterModule,
            imports: [
                ...(options.imports || []),
                GrpcModule.forRootAsync({
                    useFactory: options.useFactory,
                    inject: options.inject,
                    imports: options.imports,
                }),
            ],
            providers: [GrpcStarter],
            exports: [GrpcStarter],
            global: false,
        };
    }
}
