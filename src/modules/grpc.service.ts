import { Injectable, Logger } from '@nestjs/common';

import { ServiceConfig } from './interfaces';
import { ServiceRegistry } from './service-registry';

@Injectable()
export class GrpcService {
    private readonly logger = new Logger(GrpcService.name);

    constructor(private readonly serviceRegistry: ServiceRegistry) {}

    startService(config: ServiceConfig): void {
        this.logger.log(`🚀 Starting gRPC service: ${config.name}`);
        // Core gRPC service logic here
        this.serviceRegistry.register(config);
    }

    stopService(serviceName: string): void {
        this.logger.log(`🛑 Stopping gRPC service: ${serviceName}`);
        this.serviceRegistry.unregister(serviceName);
    }

    getServiceStatus(serviceName: string): { status: 'running' | 'stopped'; config?: ServiceConfig } {
        const config = this.serviceRegistry.get(serviceName);
        return {
            status: config ? 'running' : 'stopped',
            config,
        };
    }

    getAllServices(): ServiceConfig[] {
        return this.serviceRegistry.getAll();
    }
}
