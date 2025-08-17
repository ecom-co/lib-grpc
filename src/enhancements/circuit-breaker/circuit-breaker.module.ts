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
            module: GrpcCircuitBreakerModule,
            providers: [
                {
                    provide: 'CIRCUIT_BREAKER_CONFIG',
                    useValue: config,
                },
                {
                    provide: CircuitBreakerService,
                    useFactory: (cbConfig: CircuitBreakerConfig) => new CircuitBreakerService(cbConfig),
                    inject: ['CIRCUIT_BREAKER_CONFIG'],
                },
            ],
            exports: [CircuitBreakerService, 'CIRCUIT_BREAKER_CONFIG'],
            global: true,
        };
    }

    static forRootAsync(options: {
        useFactory: (...args: unknown[]) => Promise<CircuitBreakerConfig> | CircuitBreakerConfig;
        inject?: string[];
    }): DynamicModule {
        return {
            module: GrpcCircuitBreakerModule,
            providers: [
                {
                    provide: 'CIRCUIT_BREAKER_CONFIG',
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
                {
                    provide: CircuitBreakerService,
                    useFactory: (config: CircuitBreakerConfig) => new CircuitBreakerService(config),
                    inject: ['CIRCUIT_BREAKER_CONFIG'],
                },
            ],
            exports: [CircuitBreakerService, 'CIRCUIT_BREAKER_CONFIG'],
            global: true,
        };
    }
}
