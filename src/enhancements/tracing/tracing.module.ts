import { DynamicModule, Module } from '@nestjs/common';

import { DistributedTracer, TracingOptions } from './distributed-tracer.service';

@Module({})
export class TracingModule {
    static forRoot(options: TracingOptions): DynamicModule {
        return {
            providers: [
                {
                    provide: 'TRACING_OPTIONS',
                    useValue: options,
                },
                {
                    inject: ['TRACING_OPTIONS'],
                    provide: DistributedTracer,
                    useFactory: (tracingOptions: TracingOptions) => new DistributedTracer(tracingOptions),
                },
            ],
            exports: [DistributedTracer],
            global: true,
            module: TracingModule,
        };
    }

    static forRootAsync(options: {
        inject?: string[];
        useFactory: (...args: unknown[]) => Promise<TracingOptions> | TracingOptions;
    }): DynamicModule {
        return {
            providers: [
                {
                    inject: options.inject || [],
                    provide: 'TRACING_OPTIONS',
                    useFactory: options.useFactory,
                },
                {
                    inject: ['TRACING_OPTIONS'],
                    provide: DistributedTracer,
                    useFactory: (tracingOptions: TracingOptions) => new DistributedTracer(tracingOptions),
                },
            ],
            exports: [DistributedTracer],
            global: true,
            module: TracingModule,
        };
    }
}
