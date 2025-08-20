import { Injectable, Logger } from '@nestjs/common';

import { toUpper } from 'lodash';

import { GrpcClientConfig, GrpcConfig, GrpcServerConfig } from './interfaces';

/**
 * Normalize service name to uppercase
 * @param serviceName - The service name to normalize
 * @returns Normalized service name
 */
const normalizeServiceName = (serviceName: string): string => toUpper(serviceName);

@Injectable()
export class ServiceRegistry {
    private readonly logger = new Logger(ServiceRegistry.name);
    private readonly services = new Map<string, GrpcConfig>();

    constructor(services: GrpcConfig[] = []) {
        services.forEach((service) => this.register(service));
    }

    get(serviceName: string): GrpcConfig | undefined {
        const normalizedName = normalizeServiceName(serviceName);

        return this.services.get(normalizedName);
    }

    getAll(): GrpcConfig[] {
        return Array.from(this.services.values());
    }

    getClients(): GrpcClientConfig[] {
        return Array.from(this.services.values()).filter(isClientConfig);
    }

    getServers(): GrpcServerConfig[] {
        return Array.from(this.services.values()).filter(isServerConfig);
    }

    has(serviceName: string): boolean {
        const normalizedName = normalizeServiceName(serviceName);

        return this.services.has(normalizedName);
    }

    register(service: GrpcConfig): void {
        const normalizedName = normalizeServiceName(service.name);

        this.services.set(normalizedName, { ...service, name: normalizedName });
        this.logger.log(`Registered ${service.type}: ${normalizedName}`);
    }

    unregister(serviceName: string): void {
        const normalizedName = normalizeServiceName(serviceName);

        if (this.services.delete(normalizedName)) {
            this.logger.log(`❌ Unregistered service: ${normalizedName}`);
        }
    }
}

// Type guards for discriminated union
function isClientConfig(config: GrpcConfig): config is GrpcClientConfig {
    return config.type === 'client';
}

function isServerConfig(config: GrpcConfig): config is GrpcServerConfig {
    return config.type === 'server';
}
