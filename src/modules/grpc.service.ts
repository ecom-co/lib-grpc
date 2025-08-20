import { Injectable, Logger } from '@nestjs/common';

import { GrpcConfig, GrpcServerConfig } from './interfaces';
import { ServiceRegistry } from './service-registry';

@Injectable()
export class GrpcService {
    private readonly logger = new Logger(GrpcService.name);

    constructor(private readonly serviceRegistry: ServiceRegistry) {}

    getAllServices(): GrpcConfig[] {
        return this.serviceRegistry.getAll();
    }

    getServiceStatus(serviceName: string): { config?: GrpcConfig; status: 'running' | 'stopped' } {
        const config = this.serviceRegistry.get(serviceName);

        return {
            status: config ? 'running' : 'stopped',
            config,
        };
    }

    startService(config: GrpcServerConfig): void {
        this.logger.log(`🚀 Starting gRPC service: ${config.name}`);
        // Core gRPC service logic here
        this.serviceRegistry.register(config);
    }

    stopService(serviceName: string): void {
        this.logger.log(`🛑 Stopping gRPC service: ${serviceName}`);
        this.serviceRegistry.unregister(serviceName);
    }
}
