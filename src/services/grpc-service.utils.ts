import { get } from 'lodash';

import { SERVICE_PORT_RANGES, ServicePortRange } from './constants';
import { GrpcServiceConfig } from './interfaces';

/**
 * Get next available port for a service type
 */
export const getNextAvailablePort = (serviceType: string): number => {
    const range: ServicePortRange | undefined = get(SERVICE_PORT_RANGES, serviceType);
    // In a real implementation, you would check which ports are actually in use
    return range?.start || 50051;
};

/**
 * Validate service configuration
 */
export const validateServiceConfig = (config: GrpcServiceConfig): boolean =>
    !!(
        config.name &&
        config.package &&
        config.protoPath &&
        config.port &&
        typeof config.port === 'number' &&
        config.port > 0 &&
        config.port < 65536
    );

/**
 * Create default service config
 */
export const createDefaultServiceConfig = (overrides: Partial<GrpcServiceConfig> = {}): GrpcServiceConfig => ({
    name: 'Default Service',
    package: 'default',
    protoPath: 'src/proto/default.proto',
    port: 50051,
    enabled: true,
    ...overrides,
});

/**
 * Generate service URL
 */
export const generateServiceUrl = (host: string = '0.0.0.0', port: number): string => `${host}:${port}`;

/**
 * Parse service URL
 */
export const parseServiceUrl = (url: string): { host: string; port: number } => {
    const parts = url.split(':');
    return {
        host: parts[0] || '0.0.0.0',
        port: parseInt(parts[1], 10) || 50051,
    };
};

/**
 * Check if port is in valid range
 */
export const isValidPort = (port: number): boolean => port > 0 && port <= 65535;

/**
 * Get service config by environment
 */
export const getServiceConfigByEnv = (
    baseConfig: GrpcServiceConfig,
    env: string = process.env.NODE_ENV || 'development',
): GrpcServiceConfig => {
    const envOverrides: Record<string, Partial<GrpcServiceConfig>> = {
        development: {
            enabled: true,
        },
        test: {
            enabled: false,
        },
        production: {
            enabled: true,
        },
    };

    return {
        ...baseConfig,
        ...envOverrides[env],
    };
};
