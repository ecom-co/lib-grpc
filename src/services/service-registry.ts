import { Injectable, Logger } from '@nestjs/common';

import { filter, find } from 'lodash';

import { GrpcServiceConfig } from './interfaces';

@Injectable()
export class ServiceRegistry {
    private readonly logger = new Logger(ServiceRegistry.name);
    private services: GrpcServiceConfig[] = [];

    constructor(services: GrpcServiceConfig[] = []) {
        this.services = services;
    }

    getEnabledServices(): GrpcServiceConfig[] {
        return filter(this.services, (service) => service.enabled);
    }

    getAllServices(): GrpcServiceConfig[] {
        return [...this.services];
    }

    getServiceByName(name: string): GrpcServiceConfig | undefined {
        return find(this.services, (service) => service.name === name);
    }

    getServiceByPackage(packageName: string): GrpcServiceConfig | undefined {
        return find(this.services, (service) => service.package === packageName);
    }

    enableService(name: string): void {
        const service = this.getServiceByName(name);
        if (service) {
            service.enabled = true;
            this.logger.log(`Service "${name}" enabled`);
        } else {
            this.logger.warn(`Service "${name}" not found`);
        }
    }

    disableService(name: string): void {
        const service = this.getServiceByName(name);
        if (service) {
            service.enabled = false;
            this.logger.log(`Service "${name}" disabled`);
        } else {
            this.logger.warn(`Service "${name}" not found`);
        }
    }

    addService(config: GrpcServiceConfig): void {
        const existingService = this.getServiceByName(config.name);
        if (existingService) {
            this.logger.warn(`Service "${config.name}" already exists, updating configuration`);
            Object.assign(existingService, config);
        } else {
            this.services.push(config);
            this.logger.log(`Service "${config.name}" added`);
        }
    }

    removeService(name: string): boolean {
        const index = this.services.findIndex((service) => service.name === name);
        if (index !== -1) {
            this.services.splice(index, 1);
            this.logger.log(`Service "${name}" removed`);
            return true;
        }
        this.logger.warn(`Service "${name}" not found for removal`);
        return false;
    }

    updateService(name: string, updates: Partial<GrpcServiceConfig>): boolean {
        const service = this.getServiceByName(name);
        if (service) {
            Object.assign(service, updates);
            this.logger.log(`Service "${name}" updated`);
            return true;
        }
        this.logger.warn(`Service "${name}" not found for update`);
        return false;
    }

    setServices(services: GrpcServiceConfig[]): void {
        this.services = [...services];
        this.logger.log(`Service registry updated with ${services.length} services`);
    }

    clearServices(): void {
        this.services = [];
        this.logger.log('Service registry cleared');
    }
}
