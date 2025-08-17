import { Injectable, Logger, Inject } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { forEach } from 'lodash';
import { join } from 'path';

import { GRPC_MODULE_OPTIONS } from './constants';
import { GrpcServiceConfig, GrpcModuleOptions } from './interfaces';
import { ServiceRegistry } from './service-registry';

@Injectable()
export class ServiceManager {
    private readonly logger = new Logger(ServiceManager.name);

    constructor(
        private readonly serviceRegistry: ServiceRegistry,
        @Inject(GRPC_MODULE_OPTIONS) private readonly options: GrpcModuleOptions,
    ) {}

    /**
     * Get microservice options for a specific service
     */
    getMicroserviceOptions(service: GrpcServiceConfig): MicroserviceOptions {
        const basePath = this.options.basePath || process.cwd();
        const protoPath = join(basePath, service.protoPath);

        return {
            transport: Transport.GRPC,
            options: {
                package: service.package,
                protoPath,
                url: service.url || `0.0.0.0:${service.port}`,
            },
        };
    }

    /**
     * Get all enabled services
     */
    getEnabledServices(): GrpcServiceConfig[] {
        return this.serviceRegistry.getEnabledServices();
    }

    /**
     * Get all services (enabled and disabled)
     */
    getAllServices(): GrpcServiceConfig[] {
        return this.serviceRegistry.getAllServices();
    }

    /**
     * Enable a service
     */
    enableService(name: string): void {
        this.serviceRegistry.enableService(name);
    }

    /**
     * Disable a service
     */
    disableService(name: string): void {
        this.serviceRegistry.disableService(name);
    }

    /**
     * Add a new service
     */
    addService(config: GrpcServiceConfig): void {
        this.serviceRegistry.addService(config);
    }

    /**
     * Remove a service
     */
    removeService(name: string): boolean {
        return this.serviceRegistry.removeService(name);
    }

    /**
     * Update a service
     */
    updateService(name: string, updates: Partial<GrpcServiceConfig>): boolean {
        return this.serviceRegistry.updateService(name, updates);
    }

    /**
     * Get service by name
     */
    getServiceByName(name: string): GrpcServiceConfig | undefined {
        return this.serviceRegistry.getServiceByName(name);
    }

    /**
     * Get service by package name
     */
    getServiceByPackage(packageName: string): GrpcServiceConfig | undefined {
        return this.serviceRegistry.getServiceByPackage(packageName);
    }

    /**
     * Log all services status
     */
    logServicesStatus(): void {
        const allServices = this.getAllServices();
        const enabledServices = this.getEnabledServices();

        this.logger.log('=== Services Status ===');
        forEach(allServices, (service) => {
            const status = service.enabled ? '✅ Enabled' : '❌ Disabled';
            const url = service.url || `0.0.0.0:${service.port}`;
            this.logger.log(`${service.name} (${service.package}): ${status} - ${url}`);
        });
        this.logger.log(`Total: ${allServices.length} services, ${enabledServices.length} enabled`);
    }

    /**
     * Get microservice options for all enabled services
     */
    getAllMicroserviceOptions(): MicroserviceOptions[] {
        return this.getEnabledServices().map((service) => this.getMicroserviceOptions(service));
    }

    /**
     * Validate all services configuration
     */
    validateServices(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const services = this.getAllServices();

        forEach(services, (service) => {
            if (!service.name) {
                errors.push(`Service missing name: ${JSON.stringify(service)}`);
            }
            if (!service.package) {
                errors.push(`Service "${service.name}" missing package`);
            }
            if (!service.protoPath) {
                errors.push(`Service "${service.name}" missing protoPath`);
            }
            if (!service.port || service.port < 1 || service.port > 65535) {
                errors.push(`Service "${service.name}" has invalid port: ${service.port}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
