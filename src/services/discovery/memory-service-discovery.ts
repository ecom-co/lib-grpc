import { Injectable, Logger } from '@nestjs/common';

import { ServiceDiscovery, ServiceInstance, HealthStatus } from '../interfaces';

@Injectable()
export class MemoryServiceDiscovery implements ServiceDiscovery {
    private readonly logger = new Logger(MemoryServiceDiscovery.name);
    private readonly services = new Map<string, ServiceInstance[]>();
    private readonly watchers = new Map<string, Array<(instances: ServiceInstance[]) => void>>();

    register = (instance: ServiceInstance): Promise<void> => {
        const serviceName = instance.name;

        if (!this.services.has(serviceName)) {
            this.services.set(serviceName, []);
        }

        const instances = this.services.get(serviceName)!;
        const existingIndex = instances.findIndex((s) => s.id === instance.id);

        if (existingIndex >= 0) {
            instances[existingIndex] = instance;
            this.logger.log(`Updated service instance: ${instance.id} for service: ${serviceName}`);
        } else {
            instances.push(instance);
            this.logger.log(`Registered service instance: ${instance.id} for service: ${serviceName}`);
        }

        this.notifyWatchers(serviceName, instances);
        return Promise.resolve();
    };

    deregister = (serviceId: string): Promise<void> => {
        for (const [serviceName, instances] of this.services.entries()) {
            const index = instances.findIndex((s) => s.id === serviceId);
            if (index >= 0) {
                instances.splice(index, 1);
                this.logger.log(`Deregistered service instance: ${serviceId} from service: ${serviceName}`);
                this.notifyWatchers(serviceName, instances);
                break;
            }
        }
        return Promise.resolve();
    };

    discover = (serviceName: string): Promise<ServiceInstance[]> =>
        Promise.resolve(this.services.get(serviceName) || []);

    watch = (serviceName: string, callback: (instances: ServiceInstance[]) => void): void => {
        if (!this.watchers.has(serviceName)) {
            this.watchers.set(serviceName, []);
        }
        this.watchers.get(serviceName)!.push(callback);

        // Immediately notify with current instances
        const instances = this.services.get(serviceName) || [];
        callback(instances);
    };

    health = (serviceId: string): Promise<HealthStatus> => {
        for (const instances of this.services.values()) {
            const instance = instances.find((s) => s.id === serviceId);
            if (instance && instance.health) {
                return Promise.resolve(instance.health);
            }
        }

        return Promise.resolve({
            status: 'unknown',
            checks: [],
            lastChecked: new Date(),
        });
    };

    private notifyWatchers(serviceName: string, instances: ServiceInstance[]): void {
        const watchers = this.watchers.get(serviceName);
        if (watchers) {
            watchers.forEach((callback) => callback(instances));
        }
    }

    // Utility methods for testing and management
    clear(): void {
        this.services.clear();
        this.watchers.clear();
        this.logger.log('Cleared all service registrations');
    }

    getAllServices(): Map<string, ServiceInstance[]> {
        return new Map(this.services);
    }
}
