import { DynamicModule, Module } from '@nestjs/common';

import { DistributedTracer, TracingOptions } from './distributed-tracer.service';

@Module({})
export class TracingModule {
    static forRoot(options: TracingOptions): DynamicModule {
        return {
            module: TracingModule,
            providers: [
                {
                    provide: 'TRACING_OPTIONS',
                    useValue: options,
                },
                {
                    provide: DistributedTracer,
                    useFactory: (tracingOptions: TracingOptions) => new DistributedTracer(tracingOptions),
                    inject: ['TRACING_OPTIONS'],
                },
            ],
            exports: [DistributedTracer],
            global: true,
        };
    }

    static forRootAsync(options: {
        useFactory: (...args: unknown[]) => Promise<TracingOptions> | TracingOptions;
        inject?: string[];
    }): DynamicModule {
        return {
            module: TracingModule,
            providers: [
                {
                    provide: 'TRACING_OPTIONS',
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
                {
                    provide: DistributedTracer,
                    useFactory: (tracingOptions: TracingOptions) => new DistributedTracer(tracingOptions),
                    inject: ['TRACING_OPTIONS'],
                },
            ],
            exports: [DistributedTracer],
            global: true,
        };
    }
}
