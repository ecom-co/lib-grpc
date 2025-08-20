import type { DynamicModule, INestMicroservice, Type } from '@nestjs/common';

/**
 * Server configuration for hosting gRPC services
 */
export interface GrpcServerConfig {
    /** Unique name of the service */
    name: string;
    /** Type discriminator */
    type: 'server';
    /** Package name in proto file */
    package: string;
    /** Path to proto file relative to project root */
    protoPath: string;
    /** Host to bind the service (default: localhost) */
    host?: string;
    /** Port to bind the service (auto-assigned if not specified) */
    port?: number;
    /** Whether the service is enabled (default: true) */
    enabled?: boolean;
    /** Custom service metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Client configuration for connecting to gRPC servers
 */
export interface GrpcClientConfig {
    /** Unique name of the client */
    name: string;
    /** Type discriminator */
    type: 'client';
    /** Package name in proto file */
    package: string;
    /** Path to proto file relative to project root */
    protoPath: string;
    /** Target URL, e.g., localhost:50051 */
    url: string;
    /** Custom client metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Union type for gRPC configurations
 */
export type GrpcConfig = GrpcClientConfig | GrpcServerConfig;

/**
 * Acceptable types for the root Nest module when creating a microservice
 */
export type AppModuleType = DynamicModule | Type<unknown>;

/**
 * Handle to a running gRPC server instance
 */
export interface RunningGrpcServer {
    grpcApp: INestMicroservice;
    host: string;
    name: string;
    package: string;
    port: number;
    protoPath: string;
    startTime: Date;
    status: 'running';
    stop: () => Promise<void>;
}

/**
 * Global options for gRPC module
 */
export interface GrpcCoreModuleOptions {
    /** Array of gRPC configurations (servers and clients) */
    configs?: GrpcConfig[];
    /** Global default host for all services */
    host?: string;
    /** Base port for auto-assignment (default: 50051) */
    basePort?: number;
    /** Global gRPC server options */
    serverOptions?: GrpcServerOptions;
    /** Protocol buffer loader options */
    loaderOptions?: GrpcLoaderOptions;
    /** Enable development features */
    isDevelopment?: boolean;
    /** Custom service registry options */
    registryOptions?: ServiceRegistryOptions;
}

/**
 * gRPC server configuration options
 */
export interface GrpcServerOptions {
    /** Maximum message size in bytes */
    maxMessageSize?: number;
    /** Connection timeout in milliseconds */
    connectionTimeout?: number;
    /** Enable SSL/TLS */
    ssl?: {
        caFile?: string;
        certFile?: string;
        enabled: boolean;
        keyFile?: string;
    };
    /** Custom interceptors */
    interceptors?: unknown[];
}

/**
 * Protocol buffer loader configuration
 */
export interface GrpcLoaderOptions {
    /** Keep field names as-is (default: true) */
    keepCase?: boolean;
    /** Convert longs to strings (default: String) */
    longs?: typeof Number | typeof String;
    /** Convert enums to strings (default: String) */
    enums?: typeof Number | typeof String;
    /** Use default values (default: true) */
    defaults?: boolean;
    /** Handle oneofs (default: true) */
    oneofs?: boolean;
}

/**
 * Service registry configuration
 */
export interface ServiceRegistryOptions {
    /** Enable auto-discovery */
    autoDiscovery?: boolean;
    /** Registry refresh interval in ms */
    refreshInterval?: number;
    /** Custom registry backend */
    backend?: 'etcd' | 'memory' | 'redis';
}

/**
 * Service runtime information
 */
export interface ServiceInfo {
    host: string;
    metadata?: Record<string, unknown>;
    name: string;
    package: string;
    port: number;
    protoPath: string;
    startTime?: Date;
    status: 'error' | 'running' | 'starting' | 'stopped' | 'stopping';
}

/**
 * Service health check response
 */
export interface ServiceHealthResponse {
    metadata?: Record<string, unknown>;
    service: string;
    status: 'degraded' | 'healthy' | 'unhealthy';
    timestamp: string;
    uptime?: number;
    version?: string;
}
