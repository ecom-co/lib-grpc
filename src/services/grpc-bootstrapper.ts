import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { map } from 'lodash';

import { GrpcServiceConfig } from './interfaces';
import { ServiceManager } from './service-manager';

export interface GrpcBootstrapOptions {
    /**
     * The NestJS application module class
     */
    appModule: any;

    /**
     * Custom logger instance (optional)
     */
    logger?: Logger;

    /**
     * Whether to log environment info
     */
    logEnvironment?: boolean;

    /**
     * Custom environment getter function
     */
    getEnvironment?: () => string;

    /**
     * Maximum concurrent service starts
     */
    maxConcurrency?: number;
}

export class GrpcBootstrapper {
    private readonly logger: Logger;

    constructor(options: { logger?: Logger } = {}) {
        this.logger = options.logger || new Logger(GrpcBootstrapper.name);
    }

    /**
     * Setup and start multiple gRPC microservices using ServiceManager
     */
    async bootstrapMicroservices(
        app: any,
        serviceManager: ServiceManager,
        options: GrpcBootstrapOptions,
    ): Promise<void> {
        const enabledServices = serviceManager.getEnabledServices();

        this.logger.log('Starting gRPC microservices bootstrap...');

        // Log services status
        serviceManager.logServicesStatus();

        if (enabledServices.length === 0) {
            this.logger.warn('No enabled services found. Skipping microservices bootstrap.');
            return;
        }

        // Start all enabled services
        await this.startServices(enabledServices, serviceManager, options);

        // Log environment and services info
        if (options.logEnvironment) {
            const environment = options.getEnvironment?.() || process.env.NODE_ENV || 'development';
            this.logger.log(`Environment: ${environment}`);
        }

        const serviceNames = map(enabledServices, (s) => s.name).join(', ');
        this.logger.log(`Active services: ${serviceNames}`);
        this.logger.log('gRPC microservices bootstrap completed.');
    }

    /**
     * Start individual services with proper error handling
     */
    private async startServices(
        services: GrpcServiceConfig[],
        serviceManager: ServiceManager,
        options: GrpcBootstrapOptions,
    ): Promise<void> {
        const maxConcurrency = options.maxConcurrency || 3;
        const chunks = this.chunkArray(services, maxConcurrency);

        for (const chunk of chunks) {
            const results = await Promise.allSettled(
                chunk.map((service) => this.startSingleService(service, serviceManager, options.appModule)),
            );

            // Log results for this chunk
            results.forEach((result, index) => {
                const service = chunk[index];
                if (result.status === 'fulfilled') {
                    const url = service.url || `0.0.0.0:${service.port}`;
                    this.logger.log(`✅ ${service.name} (${service.package}) running on ${url}`);
                } else {
                    this.logger.error(`❌ Failed to start ${service.name}: ${result.reason}`);
                }
            });
        }

        // Summary
        const failedServices = services.length - services.filter((service) => service.enabled).length;
        const totalServices = services.length;
        const successfulServices = totalServices - failedServices;

        this.logger.log(`Services summary: ${successfulServices}/${totalServices} started successfully`);

        if (failedServices > 0) {
            this.logger.warn(`${failedServices} service(s) failed to start`);
        }
    }

    /**
     * Start a single gRPC service
     */
    private async startSingleService(
        service: GrpcServiceConfig,
        serviceManager: ServiceManager,
        appModule: any,
    ): Promise<void> {
        try {
            const microserviceOptions = serviceManager.getMicroserviceOptions(service);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const grpcApp = await NestFactory.createMicroservice(appModule, microserviceOptions as any);

            await grpcApp.listen();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to start ${service.name}: ${errorMessage}`);
        }
    }

    /**
     * Helper method to chunk array for concurrent processing
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Static factory method for easier usage
     */
    static async bootstrap(app: any, serviceManager: ServiceManager, options: GrpcBootstrapOptions): Promise<void> {
        const bootstrapper = new GrpcBootstrapper({ logger: options.logger });
        await bootstrapper.bootstrapMicroservices(app, serviceManager, options);
    }
}
