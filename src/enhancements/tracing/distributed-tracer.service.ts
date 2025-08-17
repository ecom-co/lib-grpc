import { Injectable, Logger } from '@nestjs/common';

import { randomUUID } from 'crypto';

export interface TraceSpan {
    traceId: string;
    spanId: string;
    operationName: string;
    startTime: bigint;
    endTime?: bigint;
    duration?: number;
    status: 'active' | 'completed' | 'failed';
    tags: Record<string, unknown>;
    logs: TraceLog[];
    parentSpanId?: string;
}

export interface TraceLog {
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    fields?: Record<string, unknown>;
}

export interface TracingOptions {
    serviceName: string;
    enableSampling?: boolean;
    samplingRate?: number; // 0.0 to 1.0
    maxSpans?: number;
}

@Injectable()
export class DistributedTracer {
    private readonly logger = new Logger(DistributedTracer.name);
    private readonly activeSpans = new Map<string, TraceSpan>();
    private readonly completedSpans: TraceSpan[] = [];
    private readonly options: Required<TracingOptions>;

    constructor(options: TracingOptions) {
        this.options = {
            enableSampling: true,
            samplingRate: 1.0,
            maxSpans: 10000,
            ...options,
        };
    }

    /**
     * Start a new trace span
     */
    startSpan(operationName: string, parentSpanId?: string, tags: Record<string, unknown> = {}): TraceSpan {
        const traceId = parentSpanId ? this.getTraceId(parentSpanId) : randomUUID();
        const spanId = randomUUID();

        // Sampling logic
        if (this.options.enableSampling && Math.random() > this.options.samplingRate) {
            return this.createNoOpSpan(traceId, spanId, operationName);
        }

        const span: TraceSpan = {
            traceId,
            spanId,
            operationName,
            startTime: process.hrtime.bigint(),
            status: 'active',
            tags: {
                'service.name': this.options.serviceName,
                'span.kind': 'server',
                ...tags,
            },
            logs: [],
            parentSpanId,
        };

        this.activeSpans.set(spanId, span);

        this.logger.debug(`🟢 Started span: ${operationName}`, {
            traceId,
            spanId,
            operationName,
            parentSpanId,
            tags,
        });

        return span;
    }

    /**
     * Finish a span
     */
    finishSpan(spanId: string, status: 'completed' | 'failed' = 'completed', tags: Record<string, unknown> = {}): void {
        const span = this.activeSpans.get(spanId);
        if (!span) {
            this.logger.warn(`Span not found: ${spanId}`);
            return;
        }

        span.endTime = process.hrtime.bigint();
        span.duration = Number(span.endTime - span.startTime) / 1_000_000; // Convert to ms
        span.status = status;
        span.tags = { ...span.tags, ...tags };

        this.activeSpans.delete(spanId);
        this.completedSpans.push(span);

        // Cleanup old spans if needed
        if (this.completedSpans.length > this.options.maxSpans) {
            this.completedSpans.splice(0, this.completedSpans.length - this.options.maxSpans);
        }

        const statusEmoji = status === 'completed' ? '✅' : '❌';
        this.logger.debug(`${statusEmoji} Finished span: ${span.operationName} (${span.duration?.toFixed(2)}ms)`, {
            traceId: span.traceId,
            spanId: span.spanId,
            operationName: span.operationName,
            duration: `${span.duration?.toFixed(2)}ms`,
            status,
            tags: span.tags,
        });
    }

    /**
     * Add log to span
     */
    addLog(
        spanId: string,
        level: 'info' | 'warn' | 'error' | 'debug',
        message: string,
        fields?: Record<string, unknown>,
    ): void {
        const span = this.activeSpans.get(spanId);
        if (!span) return;

        span.logs.push({
            timestamp: Date.now(),
            level,
            message,
            fields,
        });
    }

    /**
     * Add tags to span
     */
    addTags(spanId: string, tags: Record<string, unknown>): void {
        const span = this.activeSpans.get(spanId);
        if (!span) return;

        span.tags = { ...span.tags, ...tags };
    }

    /**
     * Get span by ID
     */
    getSpan(spanId: string): TraceSpan | undefined {
        return this.activeSpans.get(spanId);
    }

    /**
     * Get all spans for a trace
     */
    getTrace(traceId: string): TraceSpan[] {
        const activeSpans = Array.from(this.activeSpans.values()).filter((span) => span.traceId === traceId);
        const completedSpans = this.completedSpans.filter((span) => span.traceId === traceId);
        return [...activeSpans, ...completedSpans];
    }

    /**
     * Get tracing statistics
     */
    getStats(): {
        activeSpans: number;
        completedSpans: number;
        totalTraces: number;
        serviceName: string;
        samplingRate: number;
    } {
        const uniqueTraces = new Set([
            ...Array.from(this.activeSpans.values()).map((s) => s.traceId),
            ...this.completedSpans.map((s) => s.traceId),
        ]);

        return {
            activeSpans: this.activeSpans.size,
            completedSpans: this.completedSpans.length,
            totalTraces: uniqueTraces.size,
            serviceName: this.options.serviceName,
            samplingRate: this.options.samplingRate,
        };
    }

    /**
     * Clear all spans (useful for testing)
     */
    clear(): void {
        this.activeSpans.clear();
        this.completedSpans.length = 0;
        this.logger.debug('🧹 Cleared all tracing data');
    }

    private getTraceId(spanId: string): string {
        const span = this.activeSpans.get(spanId);
        return span?.traceId || randomUUID();
    }

    private createNoOpSpan(traceId: string, spanId: string, operationName: string): TraceSpan {
        return {
            traceId,
            spanId,
            operationName,
            startTime: process.hrtime.bigint(),
            status: 'active',
            tags: {},
            logs: [],
        };
    }
}
