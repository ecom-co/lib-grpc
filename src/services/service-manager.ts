import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { forEach } from 'lodash';
import { join } from 'path';

import { GRPC_MODULE_OPTIONS } from './constants';
import {
    ServiceDiscovery,
    CircuitBreaker,
    HealthChecker,
    DistributedTracer,
    ClusterManager,
    ServiceInstance,
    HealthCheckConfig,
    TracingSpan,
    GrpcServiceConfig,
    GrpcModuleOptions,
} from './interfaces';
import { ServiceRegistry } from './service-registry';

@Injectable()
export class ServiceManager {
    private readonly logger = new Logger(ServiceManager.name);

    constructor(
        private readonly serviceRegistry: ServiceRegistry,
        @Inject(GRPC_MODULE_OPTIONS) private readonly options: GrpcModuleOptions,
        @Optional() @Inject('SERVICE_DISCOVERY') private readonly serviceDiscovery?: ServiceDiscovery,
        @Optional() @Inject('CIRCUIT_BREAKER') private readonly circuitBreaker?: CircuitBreaker,
        @Optional() @Inject('HEALTH_CHECKER') private readonly healthChecker?: HealthChecker,
        @Optional() @Inject('DISTRIBUTED_TRACER') private readonly distributedTracer?: DistributedTracer,
        @Optional() @Inject('CLUSTER_MANAGER') private readonly clusterManager?: ClusterManager,
    ) {}

    // Basic service management methods
    getEnabledServices = () => this.serviceRegistry.getEnabledServices();
    getAllServices = () => this.serviceRegistry.getAllServices();
    enableService = (name: string) => this.serviceRegistry.enableService(name);
    disableService = (name: string) => this.serviceRegistry.disableService(name);
    addService = (config: GrpcServiceConfig) => this.serviceRegistry.addService(config);
    removeService = (name: string) => this.serviceRegistry.removeService(name);
    updateService = (name: string, updates: Partial<GrpcServiceConfig>) =>
        this.serviceRegistry.updateService(name, updates);
    getServiceByName = (name: string) => this.serviceRegistry.getServiceByName(name);
    getServiceByPackage = (packageName: string) => this.serviceRegistry.getServiceByPackage(packageName);

    /**
     * Log services status
     */
    logServicesStatus(): void {
        const allServices = this.getAllServices();
        const enabledServices = this.getEnabledServices();

        this.logger.log(`Total services: ${allServices.length}`);
        this.logger.log(`Enabled services: ${enabledServices.length}`);

        enabledServices.forEach((service) => {
            this.logger.log(`- ${service.name} (${service.package}) on port ${service.port}`);
        });
    }

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
                url: `0.0.0.0:${service.port}`,
            },
        };
    }

    /**
     * Get all microservice options
     */
    getAllMicroserviceOptions(): MicroserviceOptions[] {
        const enabledServices = this.getEnabledServices();
        return enabledServices.map((service) => this.getMicroserviceOptions(service));
    }

    /**
     * Validate all services
     */
    validateServices(): void {
        const services = this.getAllServices();
        const errors: string[] = [];

        forEach(services, (service) => {
            if (!service.name?.trim()) {
                errors.push('Service name is required');
            }
            if (!service.package?.trim()) {
                errors.push(`Service ${service.name}: package is required`);
            }
            if (!service.protoPath?.trim()) {
                errors.push(`Service ${service.name}: protoPath is required`);
            }
            if (!service.port || service.port <= 0) {
                errors.push(`Service ${service.name}: valid port is required`);
            }
        });

        if (errors.length > 0) {
            throw new Error(`Service validation failed:\n${errors.join('\n')}`);
        }
    }

    /**
     * Enhanced service registration with service discovery
     */
    async registerServiceWithDiscovery(config: GrpcServiceConfig): Promise<void> {
        this.addService(config);

        if (this.serviceDiscovery) {
            const instance: ServiceInstance = {
                id: `${config.name}-${Date.now()}`,
                name: config.name,
                address: '0.0.0.0',
                port: config.port,
                tags: ['grpc', config.package],
                meta: {
                    package: config.package,
                    protoPath: config.protoPath,
                },
                health: {
                    status: 'healthy',
                    checks: [],
                    lastChecked: new Date(),
                },
            };

            await this.serviceDiscovery.register(instance);
            this.logger.log(`Registered service ${config.name} with service discovery`);
        }
    }

    /**
     * Enhanced service execution with circuit breaker and tracing
     */
    executeWithEnhancements<T>(
        operation: () => Promise<T>,
        operationName: string,
        parentSpan?: TracingSpan,
    ): Promise<T> {
        return this._executeWithEnhancementsInternal(operation, operationName, parentSpan);
    }

    /**
     * Internal implementation with proper typing
     */
    private async _executeWithEnhancementsInternal<T>(
        operation: () => Promise<T>,
        operationName: string,
        parentSpan?: TracingSpan,
    ): Promise<T> {
        let span: TracingSpan | undefined;

        // Start distributed tracing span
        if (this.distributedTracer) {
            span = this.distributedTracer.startSpan(operationName, parentSpan);
            if (this.distributedTracer.addTag) {
                this.distributedTracer.addTag(span, 'service.enhanced', true);
            }
        }

        try {
            let result: T;

            // Execute with circuit breaker if available
            if (this.circuitBreaker) {
                result = await this.circuitBreaker.execute(operation);
            } else {
                result = await operation();
            }

            // Add success tags to span
            if (span && this.distributedTracer?.addTag && this.distributedTracer?.addLog) {
                this.distributedTracer.addTag(span, 'success', true);
                this.distributedTracer.addLog(span, 'info', `Operation ${operationName} completed successfully`);
            }

            return result;
        } catch (error) {
            // Add error information to span
            if (span && this.distributedTracer?.addTag && this.distributedTracer?.addLog) {
                this.distributedTracer.addTag(span, 'error', true);
                this.distributedTracer.addTag(span, 'error.message', (error as Error).message);
                this.distributedTracer.addLog(span, 'error', `Operation ${operationName} failed`, {
                    error: (error as Error).message,
                    stack: (error as Error).stack,
                });
            }

            throw error;
        } finally {
            // Finish span
            if (span && this.distributedTracer) {
                this.distributedTracer.finishSpan(span);
            }
        }
    }

    /**
     * Start health monitoring for all services
     */
    startHealthMonitoring(config: HealthCheckConfig): void {
        if (!this.healthChecker) {
            this.logger.warn('Health checker not available, skipping health monitoring');
            return;
        }

        const services = this.getAllServices();
        for (const service of services) {
            if (service.enabled) {
                const serviceId = `${service.name}-${service.port}`;
                this.healthChecker.startMonitoring(serviceId, config);
                this.logger.log(`Started health monitoring for ${service.name}`);
            }
        }
    }

    /**
     * Stop health monitoring for all services
     */
    stopHealthMonitoring(): void {
        if (!this.healthChecker) {
            return;
        }

        const services = this.getAllServices();
        for (const service of services) {
            const serviceId = `${service.name}-${service.port}`;
            this.healthChecker.stopMonitoring(serviceId);
        }
        this.logger.log('Stopped health monitoring for all services');
    }

    /**
     * Get service instances from service discovery
     */
    async discoverServices(serviceName: string): Promise<ServiceInstance[]> {
        if (!this.serviceDiscovery) {
            this.logger.warn('Service discovery not available');
            return [];
        }

        return this.serviceDiscovery.discover(serviceName);
    }

    /**
     * Watch for service changes
     */
    watchServiceChanges(serviceName: string, callback: (instances: ServiceInstance[]) => void): void {
        if (!this.serviceDiscovery) {
            this.logger.warn('Service discovery not available for watching');
            return;
        }

        this.serviceDiscovery.watch(serviceName, callback);
        this.logger.log(`Started watching service changes for: ${serviceName}`);
    }

    /**
     * Get circuit breaker state
     */
    getCircuitBreakerState(): unknown {
        if (!this.circuitBreaker) {
            return null;
        }

        return this.circuitBreaker.getState();
    }

    /**
     * Get circuit breaker metrics if available
     */
    getCircuitBreakerMetrics(): unknown {
        if (!this.circuitBreaker) {
            return null;
        }

        if (this.circuitBreaker.getMetrics) {
            return this.circuitBreaker.getMetrics();
        }

        return this.getCircuitBreakerState();
    }

    /**
     * Get cluster information
     */
    getClusterInfo(): { nodes: unknown[]; leader: unknown; isLeader: boolean } | null {
        if (!this.clusterManager) {
            return null;
        }

        return {
            nodes: this.clusterManager.getNodes(),
            leader: this.clusterManager.getLeader(),
            isLeader: this.clusterManager.isLeader(),
        };
    }

    /**
     * Enhanced service status with all monitoring data
     */
    getEnhancedServiceStatus(): {
        services: GrpcServiceConfig[];
        cluster?: { nodes: unknown[]; leader: unknown; isLeader: boolean } | null;
        circuitBreaker?: unknown;
        health?: string;
    } {
        const services = this.getAllServices();
        const result: {
            services: GrpcServiceConfig[];
            cluster?: { nodes: unknown[]; leader: unknown; isLeader: boolean } | null;
            circuitBreaker?: unknown;
            health?: string;
        } = { services };

        // Add cluster information
        const clusterInfo = this.getClusterInfo();
        if (clusterInfo) {
            result.cluster = clusterInfo;
        }

        // Add circuit breaker metrics
        const circuitBreakerMetrics = this.getCircuitBreakerMetrics();
        if (circuitBreakerMetrics) {
            result.circuitBreaker = circuitBreakerMetrics;
        }

        // Add health status placeholder
        if (this.healthChecker) {
            result.health = 'Health checker available';
        }

        return result;
    }

    /**
     * Graceful shutdown with cleanup
     */
    gracefulShutdown(): Promise<void> {
        this.logger.log('Starting graceful shutdown...');

        try {
            // Stop health monitoring
            this.stopHealthMonitoring();

            this.logger.log('Graceful shutdown completed');
            return Promise.resolve();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error during graceful shutdown: ${errorMessage}`);
            return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        }
    }
}
