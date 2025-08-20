import { join } from 'path';

import { NestFactory } from '@nestjs/core';

import { Injectable, Logger } from '@nestjs/common';

import { GrpcOptions, Transport } from '@nestjs/microservices';

import { AppModuleType, RunningGrpcServer, ServiceConfig } from './interfaces';
import { ServiceRegistry } from './service-registry';

@Injectable()
export class GrpcServiceManager {
    private appModule: AppModuleType | null = null;
    private basePort = 50051;
    private readonly logger = new Logger(GrpcServiceManager.name);
    private readonly runningServices = new Map<string, { port: number; server: RunningGrpcServer }>();

    constructor(private readonly serviceRegistry: ServiceRegistry) {
        this.logger.log('GrpcServiceManager initialized');
    }

    /**
     * Set the app module for creating microservices
     */
    setAppModule(appModule: AppModuleType): void {
        this.appModule = appModule;
        this.logger.log('App module set for gRPC service creation');
    }

    /**
     * Manually start all registered gRPC services
     */
    async startAllServices(): Promise<void> {
        this.logger.log('Starting gRPC services...');

        const services = this.serviceRegistry.getAll();

        if (services.length === 0) {
            this.logger.warn('No gRPC services found to start');

            return;
        }

        for (const service of services) {
            await this.startService(service);
        }

        this.logger.log(`Successfully started ${services.length} gRPC services`);
    }

    /**
     * Stop all running gRPC services
     */
    async stopAllServices(): Promise<void> {
        this.logger.log('🛑 Stopping all gRPC services...');

        const shutdownPromises = Array.from(this.runningServices.entries()).map(async ([serviceName]) => {
            try {
                await this.stopService(serviceName);
                this.logger.log(`Service ${serviceName} stopped gracefully`);
            } catch (error) {
                this.logger.error(`Failed to stop service ${serviceName}:`, error);
            }
        });

        await Promise.all(shutdownPromises);
        this.logger.log('All gRPC services stopped');
    }

    private async startService(config: ServiceConfig): Promise<void> {
        const port = config.port || this.getNextAvailablePort();
        const host = config.host || 'localhost';

        try {
            const server = await this.createGrpcServer(config, host, port);

            this.runningServices.set(config.name, { port, server });

            this.logger.log(`Service '${config.name}' started at ${host}:${port}`);
            this.logger.debug(`Proto: ${config.protoPath}`);
            this.logger.debug(`Package: ${config.package}`);
        } catch (error) {
            this.logger.error(`Failed to start service '${config.name}':`, error);
            throw error;
        }
    }

    private async stopService(serviceName: string): Promise<void> {
        const serviceInfo = this.runningServices.get(serviceName);

        if (!serviceInfo) {
            this.logger.warn(`Service '${serviceName}' not found in running services`);

            return;
        }

        try {
            await this.shutdownGrpcServer(serviceInfo.server);
            this.runningServices.delete(serviceName);

            this.logger.log(`Service '${serviceName}' stopped`);
        } catch (error) {
            this.logger.error(`Error stopping service '${serviceName}':`, error);
            throw error;
        }
    }

    /**
     * Create a dedicated gRPC microservice for each service
     */
    /**
     * Start a single gRPC service using NestFactory.createMicroservice
     */
    private async createGrpcServer(config: ServiceConfig, host: string, port: number): Promise<RunningGrpcServer> {
        this.logger.debug(`Creating gRPC server for ${config.name}...`);
        this.logger.debug(`Host: ${host}`);
        this.logger.debug(`Port: ${port}`);
        this.logger.debug(`Proto: ${config.protoPath}`);
        this.logger.debug(`Package: ${config.package}`);

        if (!this.appModule) {
            throw new Error('App module is required to create gRPC services');
        }

        // Get microservice options for this service
        const microserviceOptions = this.getMicroserviceOptions(config, host, port);

        // Create real gRPC microservice using NestFactory
        const grpcApp = await NestFactory.createMicroservice(this.appModule, microserviceOptions);

        // Start listening on the specified port
        await grpcApp.listen();

        this.logger.log(`gRPC server created for ${config.name} at ${host}:${port}`);

        return {
            name: config.name,
            status: 'running',
            grpcApp, // Store the actual NestJS microservice instance
            host,
            package: config.package,
            port,
            protoPath: config.protoPath,
            startTime: new Date(),
            stop: async () => {
                this.logger.debug(`Stopping gRPC server for ${config.name}...`);
                await grpcApp.close();
            },
        };
    }

    /**
     * Get microservice options for gRPC transport
     */
    private getMicroserviceOptions(config: ServiceConfig, host: string, port: number): GrpcOptions {
        return {
            options: {
                loader: {
                    defaults: true,
                    enums: String,
                    keepCase: true,
                    longs: String,
                    oneofs: true,
                },
                package: config.package,
                protoPath: join(process.cwd(), config.protoPath),
                url: `${host}:${port}`,
            },
            transport: Transport.GRPC,
        };
    }

    private getNextAvailablePort(): number {
        const usedPorts = Array.from(this.runningServices.values()).map((service) => service.port);

        while (usedPorts.includes(this.basePort)) {
            this.basePort++;
        }

        return this.basePort++;
    }

    private async shutdownGrpcServer(server: RunningGrpcServer): Promise<void> {
        await server.stop();

        this.logger.debug('gRPC server shutdown complete');
    }

    /**
     * Public methods for runtime service management
     */
    async addService(config: ServiceConfig): Promise<void> {
        this.serviceRegistry.register(config);
        await this.startService(config);
    }

    getRunningServices(): Array<{ name: string; port: number; status: string }> {
        return Array.from(this.runningServices.entries()).map(([name, { port }]) => ({
            name,
            status: 'running',
            port,
        }));
    }

    async removeService(serviceName: string): Promise<void> {
        await this.stopService(serviceName);
        this.serviceRegistry.unregister(serviceName);
    }

    isServiceRunning(serviceName: string): boolean {
        return this.runningServices.has(serviceName);
    }
}
