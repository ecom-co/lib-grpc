import { join } from 'path';

import { NestApplication } from '@nestjs/core';

import { Injectable, Logger } from '@nestjs/common';

import { toUpper } from 'lodash';

import { GrpcOptions, Transport } from '@nestjs/microservices';

import { GrpcConfig, GrpcServerConfig, RunningGrpcServer } from './interfaces';
import { ServiceRegistry } from './service-registry';

/**
 * Normalize service name to uppercase
 * @param serviceName - The service name to normalize
 * @returns Normalized service name
 */
const normalizeServiceName = (serviceName: string): string => toUpper(serviceName);

@Injectable()
export class GrpcServiceManager {
    private app: NestApplication | null = null;
    private basePort = 50051;
    private readonly logger = new Logger(GrpcServiceManager.name);
    private readonly runningServices = new Map<string, { port: number; server: RunningGrpcServer }>();

    constructor(private readonly serviceRegistry: ServiceRegistry) {
        this.logger.log('GrpcServiceManager initialized');
    }

    /**
     * Set the main app instance for hybrid microservices
     */
    setApp(app: NestApplication): void {
        this.app = app;
        this.logger.log('Main app set for hybrid gRPC services');
    }

    /**
     * Manually start all registered gRPC services
     */
    startAllServices(): void {
        this.logger.log('Starting gRPC services...');

        const services = this.serviceRegistry.getServers();

        if (services.length === 0) {
            this.logger.warn('No gRPC services found to start');

            return;
        }

        if (!this.app) {
            throw new Error('Main app is required to start gRPC services');
        }

        for (const service of services) {
            this.startService(service);
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

    private startService(config: GrpcServerConfig): void {
        const port = config.port || this.getNextAvailablePort();
        const host = config.host || 'localhost';

        try {
            const server = this.createGrpcServer(config, host, port);

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
        const normalizedName = normalizeServiceName(serviceName);
        const serviceInfo = this.runningServices.get(normalizedName);

        if (!serviceInfo) {
            this.logger.warn(`Service '${normalizedName}' not found in running services`);

            return;
        }

        try {
            await this.shutdownGrpcServer(serviceInfo.server);
            this.runningServices.delete(normalizedName);

            this.logger.log(`Service '${normalizedName}' stopped`);
        } catch (error) {
            this.logger.error(`Error stopping service '${normalizedName}':`, error);
            throw error;
        }
    }

    /**
     * Connect gRPC microservice to main app (hybrid approach)
     */
    private createGrpcServer(config: GrpcServerConfig, host: string, port: number): RunningGrpcServer {
        this.logger.debug(`Creating gRPC server for ${config.name}...`);
        this.logger.debug(`Host: ${host}`);
        this.logger.debug(`Port: ${port}`);
        this.logger.debug(`Proto: ${config.protoPath}`);
        this.logger.debug(`Package: ${config.package}`);

        if (!this.app) {
            throw new Error('Main app is required to create gRPC services');
        }

        // Get microservice options for this service
        const microserviceOptions = this.getMicroserviceOptions(config, host, port);

        // Connect microservice to main app (hybrid approach)
        const microservice = this.app.connectMicroservice(microserviceOptions);

        this.logger.log(`gRPC server connected for ${config.name} at ${host}:${port}`);

        return {
            name: config.name,
            status: 'running',
            grpcApp: microservice, // This is the microservice instance
            host,
            package: config.package,
            port,
            protoPath: config.protoPath,
            startTime: new Date(),
            stop: () => {
                this.logger.debug(`Stopping gRPC server for ${config.name}...`);

                // Note: In hybrid mode, microservices are stopped with the main app
                // Individual microservice stop is not needed
                return Promise.resolve();
            },
        };
    }

    /**
     * Get microservice options for gRPC transport
     */
    private getMicroserviceOptions(config: GrpcServerConfig, host: string, port: number): GrpcOptions {
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
    addService(config: GrpcConfig): void {
        this.serviceRegistry.register(config);

        if (config.type === 'server') {
            this.startService(config);
        }
    }

    getRunningServices(): Array<{ name: string; port: number; status: string }> {
        return Array.from(this.runningServices.entries()).map(([name, { port }]) => ({
            name,
            status: 'running',
            port,
        }));
    }

    async removeService(serviceName: string): Promise<void> {
        const normalizedName = normalizeServiceName(serviceName);

        await this.stopService(normalizedName);
        this.serviceRegistry.unregister(normalizedName);
    }

    isServiceRunning(serviceName: string): boolean {
        const normalizedName = normalizeServiceName(serviceName);

        return this.runningServices.has(normalizedName);
    }
}
