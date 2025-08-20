import { Injectable, Logger } from '@nestjs/common';

import { ServiceConfig } from './interfaces';

@Injectable()
export class ServiceRegistry {
    private readonly logger = new Logger(ServiceRegistry.name);
    private readonly services = new Map<string, ServiceConfig>();

    constructor(services: ServiceConfig[] = []) {
        services.forEach((service) => this.register(service));
    }

    get(serviceName: string): ServiceConfig | undefined {
        return this.services.get(serviceName);
    }

    getAll(): ServiceConfig[] {
        return Array.from(this.services.values());
    }

    has(serviceName: string): boolean {
        return this.services.has(serviceName);
    }

    register(service: ServiceConfig): void {
        this.services.set(service.name, service);
        this.logger.log(`Registered service: ${service.name}`);
    }

    unregister(serviceName: string): void {
        if (this.services.delete(serviceName)) {
            this.logger.log(`❌ Unregistered service: ${serviceName}`);
        }
    }
}
