import { Injectable, Logger } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

import { DistributedTracer, TracingConfig, TracingSpan, TracingLog } from '../interfaces';

@Injectable()
export class GrpcDistributedTracer implements DistributedTracer {
    private readonly logger = new Logger(GrpcDistributedTracer.name);
    private readonly config: TracingConfig;
    private readonly spans = new Map<string, TracingSpan>();
    private readonly activeSpans = new Map<string, TracingSpan>();

    constructor(config: TracingConfig) {
        this.config = {
            samplingRate: 1.0, // Sample all traces by default
            tags: {},
            ...config,
        };
        this.logger.log(`Distributed tracer initialized for service: ${this.config.serviceName}`);
    }

    startSpan = (operationName: string, parentSpan?: TracingSpan): TracingSpan => {
        const traceId = parentSpan?.traceId || uuidv4();
        const spanId = uuidv4();

        const span: TracingSpan = {
            traceId,
            spanId,
            parentSpanId: parentSpan?.spanId,
            operationName,
            startTime: new Date(),
            tags: {
                'service.name': this.config.serviceName,
                'span.kind': 'server',
                ...this.config.tags,
            },
            logs: [],
        };

        this.spans.set(spanId, span);
        this.activeSpans.set(spanId, span);

        this.logger.debug(`Started span: ${operationName} (${spanId}) in trace: ${traceId}`);
        return span;
    };

    finishSpan = (span: TracingSpan): void => {
        span.endTime = new Date();
        this.activeSpans.delete(span.spanId);

        const duration = span.endTime.getTime() - span.startTime.getTime();
        span.tags['duration.ms'] = duration;

        this.logger.debug(`Finished span: ${span.operationName} (${span.spanId}) - Duration: ${duration}ms`);

        // In real implementation, send to tracing backend (Jaeger, Zipkin, etc.)
        if (this.shouldSample()) {
            this.sendToTracingBackend(span);
        }

        // Clean up old spans to prevent memory leaks
        this.cleanupOldSpans();
    };

    injectHeaders = (span: TracingSpan, headers: Record<string, string>): Record<string, string> => ({
        ...headers,
        'x-trace-id': span.traceId,
        'x-span-id': span.spanId,
        'x-parent-span-id': span.parentSpanId || '',
    });

    extractSpan = (headers: Record<string, string>): TracingSpan | null => {
        const traceId = headers['x-trace-id'];
        const spanId = headers['x-span-id'];
        const parentSpanId = headers['x-parent-span-id'];

        if (!traceId || !spanId) {
            return null;
        }

        return {
            traceId,
            spanId,
            parentSpanId: parentSpanId || undefined,
            operationName: 'extracted-span',
            startTime: new Date(),
            tags: {},
            logs: [],
        };
    };

    // Additional utility methods
    addTag(span: TracingSpan, key: string, value: unknown): void {
        span.tags[key] = value;
    }

    addLog(
        span: TracingSpan,
        level: 'debug' | 'info' | 'warn' | 'error',
        message: string,
        fields?: Record<string, any>,
    ): void {
        const log: TracingLog = {
            timestamp: new Date(),
            level,
            message,
            fields,
        };
        span.logs.push(log);
    }

    getActiveSpans(): TracingSpan[] {
        return Array.from(this.activeSpans.values());
    }

    getSpanById(spanId: string): TracingSpan | undefined {
        return this.spans.get(spanId);
    }

    private shouldSample(): boolean {
        return Math.random() <= (this.config.samplingRate ?? 1.0);
    }

    private sendToTracingBackend(span: TracingSpan): void {
        // In a real implementation, this would send the span to Jaeger, Zipkin, or other tracing backend
        if (this.config.jaegerEndpoint) {
            this.sendToJaeger(span);
        } else {
            // For now, just log the span data
            this.logger.log(
                `Trace data: ${JSON.stringify({
                    traceId: span.traceId,
                    spanId: span.spanId,
                    parentSpanId: span.parentSpanId,
                    operationName: span.operationName,
                    duration: span.endTime ? span.endTime.getTime() - span.startTime.getTime() : 0,
                    tags: span.tags,
                    logs: span.logs,
                })}`,
            );
        }
    }

    private sendToJaeger(span: TracingSpan): void {
        // Mock Jaeger integration - in real implementation, use jaeger-client
        const jaegerSpan = {
            traceID: span.traceId.replace(/-/g, ''),
            spanID: span.spanId.replace(/-/g, ''),
            parentSpanID: span.parentSpanId?.replace(/-/g, ''),
            operationName: span.operationName,
            startTime: span.startTime.getTime() * 1000, // microseconds
            duration: span.endTime ? (span.endTime.getTime() - span.startTime.getTime()) * 1000 : 0,
            tags: Object.entries(span.tags).map(([key, value]) => ({
                key,
                type: typeof value === 'string' ? 'string' : 'number',
                value: String(value),
            })),
            logs: span.logs.map((log) => ({
                timestamp: log.timestamp.getTime() * 1000,
                fields: [
                    { key: 'level', value: log.level },
                    { key: 'message', value: log.message },
                    ...(log.fields
                        ? Object.entries(log.fields).map(([key, value]) => ({ key, value: String(value) }))
                        : []),
                ],
            })),
        };

        this.logger.debug(`Sending span to Jaeger: ${this.config.jaegerEndpoint}`, jaegerSpan);
        // In real implementation: make HTTP request to Jaeger collector
    }

    private cleanupOldSpans(): void {
        const cutoffTime = new Date(Date.now() - 300000); // 5 minutes
        const spansToDelete: string[] = [];

        for (const [spanId, span] of this.spans.entries()) {
            if (span.endTime && span.endTime < cutoffTime) {
                spansToDelete.push(spanId);
            }
        }

        spansToDelete.forEach((spanId) => {
            this.spans.delete(spanId);
        });

        if (spansToDelete.length > 0) {
            this.logger.debug(`Cleaned up ${spansToDelete.length} old spans`);
        }
    }

    // Cleanup method
    destroy(): void {
        this.spans.clear();
        this.activeSpans.clear();
        this.logger.log('Distributed tracer destroyed');
    }
}
