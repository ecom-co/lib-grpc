import { join } from 'path';

import { NestApplication } from '@nestjs/core';

import {
    CanActivate,
    ExceptionFilter,
    INestMicroservice,
    Injectable,
    Logger,
    NestInterceptor,
    PipeTransform,
} from '@nestjs/common';

import { toUpper } from 'lodash';

import { GrpcOptions, Transport } from '@nestjs/microservices';

import { GrpcConfigService } from './grpc-config.service';
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
    private readonly logger = new Logger(GrpcServiceManager.name);

    constructor(
        private readonly serviceRegistry: ServiceRegistry,
        private readonly configService: GrpcConfigService,
    ) {
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
    async startAllServices(): Promise<void> {
        this.logger.log('🚀 Starting all gRPC services...');

        const services = this.serviceRegistry.getServers();

        this.logger.log(`Found ${services.length} gRPC services to start`);

        if (services.length === 0) {
            this.logger.warn('⚠️ No gRPC services found to start');

            return;
        }

        if (!this.app) {
            throw new Error('Main app is required to start gRPC services');
        }

        this.logger.log('📋 Services to start:');
        services.forEach((service, index) => {
            this.logger.log(`  ${index + 1}. ${service.name} (${service.package})`);
        });

        for (const service of services) {
            this.startService(service);
        }

        // Start all connected microservices to ensure they listen on their ports
        this.logger.log('🔄 Starting all microservices...');
        await this.app.startAllMicroservices();

        this.logger.log(`🎉 Successfully started ${services.length} gRPC services`);
    }

    /**
     * Stop all running gRPC services
     */
    async stopAllServices(): Promise<void> {
        this.logger.log('🛑 Stopping all gRPC services...');

        const runningServices = this.configService.getAllRunningServices();
        const shutdownPromises = Object.entries(runningServices).map(async ([serviceName]) => {
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
        const host = config.host || this.configService.getHost();

        this.logger.log(`🔧 Starting service: ${config.name}`);
        this.logger.log(`Port: ${port}, Host: ${host}`);

        try {
            const server = this.createGrpcServer(config, host, port);

            this.configService.addRunningService(config.name, port, server);

            this.logger.log(`✅ Service '${config.name}' started successfully at ${host}:${port}`);
            this.logger.log(`Proto: ${config.protoPath}`);
            this.logger.log(`Package: ${config.package}`);
        } catch (error) {
            this.logger.error(`❌ Failed to start service '${config.name}':`, error);
            throw error;
        }
    }

    private async stopService(serviceName: string): Promise<void> {
        const normalizedName = normalizeServiceName(serviceName);
        const serviceInfo = this.configService.getRunningService(normalizedName);

        if (!serviceInfo) {
            this.logger.warn(`Service '${normalizedName}' not found in running services`);

            return;
        }

        try {
            await this.shutdownGrpcServer(serviceInfo.server);
            this.configService.removeRunningService(normalizedName);

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
        this.logger.log(`🚀 Creating gRPC server for ${config.name}...`);
        this.logger.log(`Host: ${host}`);
        this.logger.log(`Port: ${port}`);
        this.logger.log(`Proto: ${config.protoPath}`);
        this.logger.log(`Package: ${config.package}`);

        if (!this.app) {
            throw new Error('Main app is required to create gRPC services');
        }

        // Get microservice options for this service
        const microserviceOptions = this.getMicroserviceOptions(config, host, port);

        // Connect microservice to main app (hybrid approach)
        const microservice = this.app.connectMicroservice(microserviceOptions);

        this.logger.log(`✅ gRPC microservice connected for ${config.name}`);

        // Apply global middleware to the microservice
        this.applyGlobalMiddleware(microservice);

        this.logger.log(`🎉 gRPC server fully configured for ${config.name} at ${host}:${port}`);

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
        const basePort = this.configService.getBasePort();
        const usedPorts = this.configService.getUsedPorts();

        let nextPort = basePort;

        while (usedPorts.includes(nextPort)) {
            nextPort++;
        }

        return nextPort;
    }

    /**
     * Apply global middleware to gRPC microservice
     */
    private applyGlobalMiddleware(microservice: INestMicroservice): void {
        const globalOptions = this.configService.getGlobalOptions();

        this.logger.log('🔧 Applying global middleware to gRPC service...');
        this.logger.log('Global options:', JSON.stringify(globalOptions, null, 2));

        if (!globalOptions) {
            this.logger.warn('No global options found');

            return;
        }

        if (!globalOptions.globalMiddleware) {
            this.logger.warn('No global middleware configuration found');

            return;
        }

        // Apply global pipes
        if (globalOptions.globalMiddleware?.pipes?.length) {
            this.logger.log(`✅ Applying ${globalOptions.globalMiddleware.pipes.length} global pipes to gRPC service`);
            globalOptions.globalMiddleware.pipes.forEach((pipe: PipeTransform, index: number) => {
                this.logger.log(`  - Pipe ${index + 1}: ${pipe.constructor.name}`);
                microservice.useGlobalPipes(pipe);
            });
        } else {
            this.logger.warn('No global pipes configured');
        }

        // Apply global filters
        if (globalOptions.globalMiddleware?.filters?.length) {
            this.logger.log(
                `✅ Applying ${globalOptions.globalMiddleware.filters.length} global filters to gRPC service`,
            );
            globalOptions.globalMiddleware.filters.forEach((filter: ExceptionFilter, index: number) => {
                this.logger.log(`  - Filter ${index + 1}: ${filter.constructor.name}`);
                microservice.useGlobalFilters(filter);
            });
        } else {
            this.logger.warn('No global filters configured');
        }

        // Apply global interceptors
        if (globalOptions.globalMiddleware?.interceptors?.length) {
            this.logger.log(
                `✅ Applying ${globalOptions.globalMiddleware.interceptors.length} global interceptors to gRPC service`,
            );
            globalOptions.globalMiddleware.interceptors.forEach((interceptor: NestInterceptor, index: number) => {
                this.logger.log(`  - Interceptor ${index + 1}: ${interceptor.constructor.name}`);
                microservice.useGlobalInterceptors(interceptor);
            });
        } else {
            this.logger.warn('No global interceptors configured');
        }

        // Apply global guards
        if (globalOptions.globalMiddleware?.guards?.length) {
            this.logger.log(
                `✅ Applying ${globalOptions.globalMiddleware.guards.length} global guards to gRPC service`,
            );
            globalOptions.globalMiddleware.guards.forEach((guard: CanActivate, index: number) => {
                this.logger.log(`  - Guard ${index + 1}: ${guard.constructor.name}`);
                microservice.useGlobalGuards(guard);
            });
        } else {
            this.logger.warn('No global guards configured');
        }

        this.logger.log('🎉 Global middleware applied successfully!');
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
        return this.configService.getRunningServicesList();
    }

    async removeService(serviceName: string): Promise<void> {
        const normalizedName = normalizeServiceName(serviceName);

        await this.stopService(normalizedName);
        this.serviceRegistry.unregister(normalizedName);
    }

    isServiceRunning(serviceName: string): boolean {
        const normalizedName = normalizeServiceName(serviceName);

        return this.configService.isServiceRunning(normalizedName);
    }
}
