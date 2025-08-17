/**
 * Configuration for individual gRPC service
 */
export interface ServiceConfig {
    /** Unique name of the service */
    name: string;
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
 * Global options for gRPC module
 */
export interface GrpcCoreModuleOptions {
    /** Array of service configurations */
    services?: ServiceConfig[];
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
        enabled: boolean;
        keyFile?: string;
        certFile?: string;
        caFile?: string;
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
    longs?: typeof String | typeof Number;
    /** Convert enums to strings (default: String) */
    enums?: typeof String | typeof Number;
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
    backend?: 'memory' | 'redis' | 'etcd';
}

/**
 * Service runtime information
 */
export interface ServiceInfo {
    name: string;
    host: string;
    port: number;
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
    package: string;
    protoPath: string;
    startTime?: Date;
    metadata?: Record<string, unknown>;
}

/**
 * Service health check response
 */
export interface ServiceHealthResponse {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime?: number;
    version?: string;
    metadata?: Record<string, unknown>;
}
