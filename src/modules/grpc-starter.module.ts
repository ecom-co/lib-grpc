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
            imports: [GrpcModule.forRoot(options)],
            providers: [GrpcStarter],
            exports: [GrpcStarter],
            global: false, // Not global by default
            module: GrpcStarterModule,
        };
    }

    /**
     * Async version for manual control
     */
    static forRootAsync(options: {
        imports?: DynamicModule[];
        inject?: string[];
        useFactory: (...args: unknown[]) => GrpcCoreModuleOptions | Promise<GrpcCoreModuleOptions>;
    }): DynamicModule {
        return {
            imports: [
                ...(options.imports || []),
                GrpcModule.forRootAsync({
                    imports: options.imports,
                    inject: options.inject,
                    useFactory: options.useFactory,
                }),
            ],
            providers: [GrpcStarter],
            exports: [GrpcStarter],
            global: false,
            module: GrpcStarterModule,
        };
    }
}
