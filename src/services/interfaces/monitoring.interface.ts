import { HealthStatus } from './service-discovery.interface';

export interface HealthCheckConfig {
    interval: number;
    timeout: number;
    retries: number;
    endpoint?: string;
}

export interface HealthChecker {
    check: (serviceId: string) => Promise<HealthStatus>;
    startMonitoring: (serviceId: string, config: HealthCheckConfig) => void;
    stopMonitoring: (serviceId: string) => void;
}

export interface TracingConfig {
    serviceName: string;
    jaegerEndpoint?: string;
    samplingRate?: number;
    tags?: Record<string, string>;
}

export interface TracingSpan {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    operationName: string;
    startTime: Date;
    endTime?: Date;
    tags: Record<string, any>;
    logs: TracingLog[];
}

export interface TracingLog {
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    fields?: Record<string, any>;
}

export interface DistributedTracer {
    startSpan: (operationName: string, parentSpan?: TracingSpan) => TracingSpan;
    finishSpan: (span: TracingSpan) => void;
    injectHeaders: (span: TracingSpan, headers: Record<string, string>) => Record<string, string>;
    extractSpan: (headers: Record<string, string>) => TracingSpan | null;
    addTag: (span: TracingSpan, key: string, value: unknown) => void;
    addLog: (
        span: TracingSpan,
        level: 'debug' | 'info' | 'warn' | 'error',
        message: string,
        fields?: Record<string, any>,
    ) => void;
}
