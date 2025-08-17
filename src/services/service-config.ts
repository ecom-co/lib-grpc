import { GrpcServiceConfig } from './interfaces';

/**
 * Default service configurations
 */
export const DEFAULT_SERVICES: GrpcServiceConfig[] = [];

// Re-export utilities for backward compatibility
export {
    getNextAvailablePort,
    validateServiceConfig,
    createDefaultServiceConfig,
    generateServiceUrl,
    parseServiceUrl,
    isValidPort,
    getServiceConfigByEnv,
} from './grpc-service.utils';
