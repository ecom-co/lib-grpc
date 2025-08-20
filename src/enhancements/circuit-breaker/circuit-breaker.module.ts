import { DynamicModule, Module } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerConfig } from './interfaces';

/**
 * CIRCUIT BREAKER MODULE - Separate enhancement module
 * Only loaded when circuit breaker functionality is needed
 */
@Module({})
export class GrpcCircuitBreakerModule {
    static forRoot(config: CircuitBreakerConfig): DynamicModule {
        return {
            providers: [
                {
                    provide: 'CIRCUIT_BREAKER_CONFIG',
                    useValue: config,
                },
                {
                    inject: ['CIRCUIT_BREAKER_CONFIG'],
                    provide: CircuitBreakerService,
                    useFactory: (cbConfig: CircuitBreakerConfig) => new CircuitBreakerService(cbConfig),
                },
            ],
            exports: [CircuitBreakerService, 'CIRCUIT_BREAKER_CONFIG'],
            global: true,
            module: GrpcCircuitBreakerModule,
        };
    }

    static forRootAsync(options: {
        inject?: string[];
        useFactory: (...args: unknown[]) => CircuitBreakerConfig | Promise<CircuitBreakerConfig>;
    }): DynamicModule {
        return {
            providers: [
                {
                    inject: options.inject || [],
                    provide: 'CIRCUIT_BREAKER_CONFIG',
                    useFactory: options.useFactory,
                },
                {
                    inject: ['CIRCUIT_BREAKER_CONFIG'],
                    provide: CircuitBreakerService,
                    useFactory: (config: CircuitBreakerConfig) => new CircuitBreakerService(config),
                },
            ],
            exports: [CircuitBreakerService, 'CIRCUIT_BREAKER_CONFIG'],
            global: true,
            module: GrpcCircuitBreakerModule,
        };
    }
}
