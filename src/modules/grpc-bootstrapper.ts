import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';

import { ServiceConfig } from './interfaces';
import { ServiceRegistry } from './service-registry';

@Injectable()
export class GrpcBootstrapper implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly logger = new Logger(GrpcBootstrapper.name);
    private readonly runningServices = new Map<string, { server: unknown; port: number }>();
    private basePort = 50051;

    constructor(private readonly serviceRegistry: ServiceRegistry) {
        this.logger.log('🔧 GrpcBootstrapper constructor called');
    }

    async onApplicationBootstrap(): Promise<void> {
        this.logger.log('🚀 Starting gRPC services bootstrap...');

        const services = this.serviceRegistry.getAll();

        if (services.length === 0) {
            this.logger.warn('⚠️ No gRPC services found to bootstrap');
            return;
        }

        for (const service of services) {
            await this.startService(service);
        }

        this.logger.log(`✅ Successfully bootstrapped ${services.length} gRPC services`);
    }

    async onApplicationShutdown(signal?: string): Promise<void> {
        this.logger.log(`🛑 Shutting down gRPC services... (signal: ${signal})`);

        const shutdownPromises = Array.from(this.runningServices.entries()).map(async ([serviceName]) => {
            try {
                await this.stopService(serviceName);
                this.logger.log(`✅ Service ${serviceName} stopped gracefully`);
            } catch (error) {
                this.logger.error(`❌ Failed to stop service ${serviceName}:`, error);
            }
        });

        await Promise.all(shutdownPromises);
        this.logger.log('🔴 All gRPC services shut down');
    }

    private async startService(config: ServiceConfig): Promise<void> {
        const port = config.port || this.getNextAvailablePort();
        const host = config.host || 'localhost';

        try {
            // Simulate gRPC server creation (replace with actual gRPC implementation)
            const server = await this.createGrpcServer(config, host, port);

            this.runningServices.set(config.name, { server, port });

            this.logger.log(`🟢 Service '${config.name}' started at ${host}:${port}`);
            this.logger.debug(`   📁 Proto: ${config.protoPath}`);
            this.logger.debug(`   📦 Package: ${config.package}`);
        } catch (error) {
            this.logger.error(`❌ Failed to start service '${config.name}':`, error);
            throw error;
        }
    }

    private async stopService(serviceName: string): Promise<void> {
        const serviceInfo = this.runningServices.get(serviceName);
        if (!serviceInfo) {
            this.logger.warn(`⚠️ Service '${serviceName}' not found in running services`);
            return;
        }

        try {
            // Simulate graceful shutdown (replace with actual gRPC implementation)
            await this.shutdownGrpcServer(serviceInfo.server);
            this.runningServices.delete(serviceName);

            this.logger.log(`🔴 Service '${serviceName}' stopped`);
        } catch (error) {
            this.logger.error(`❌ Error stopping service '${serviceName}':`, error);
            throw error;
        }
    }

    private async createGrpcServer(config: ServiceConfig, host: string, port: number): Promise<unknown> {
        // TODO: Replace with actual gRPC server implementation using NestJS microservices
        // For now, using enhanced mock implementation

        this.logger.debug(`🔧 Creating gRPC server for ${config.name}...`);
        this.logger.debug(`   Host: ${host}`);
        this.logger.debug(`   Port: ${port}`);
        this.logger.debug(`   Proto: ${config.protoPath}`);
        this.logger.debug(`   Package: ${config.package}`);

        // Enhanced mock implementation with better server simulation
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockServer = {
                    name: config.name,
                    host,
                    port,
                    status: 'running',
                    package: config.package,
                    protoPath: config.protoPath,
                    startTime: new Date(),
                    // Simulate server methods
                    stop: async () => {
                        this.logger.debug(`🔴 Stopping gRPC server for ${config.name}...`);
                        return Promise.resolve();
                    },
                };

                this.logger.debug(`✅ Mock gRPC server created for ${config.name}`);
                resolve(mockServer);
            }, 100);
        });
    }

    private async shutdownGrpcServer(server: unknown): Promise<void> {
        // Call the server's stop method if available
        if (server && typeof server === 'object' && 'stop' in server && typeof server.stop === 'function') {
            await (server as { stop: () => Promise<void> }).stop();
        }

        this.logger.debug('✅ gRPC server shutdown complete');
    }

    private getNextAvailablePort(): number {
        const usedPorts = Array.from(this.runningServices.values()).map((service) => service.port);

        while (usedPorts.includes(this.basePort)) {
            this.basePort++;
        }

        return this.basePort++;
    }

    /**
     * Public methods for runtime service management
     */
    async addService(config: ServiceConfig): Promise<void> {
        this.serviceRegistry.register(config);
        await this.startService(config);
    }

    async removeService(serviceName: string): Promise<void> {
        await this.stopService(serviceName);
        this.serviceRegistry.unregister(serviceName);
    }

    getRunningServices(): Array<{ name: string; port: number; status: string }> {
        return Array.from(this.runningServices.entries()).map(([name, { port }]) => ({
            name,
            port,
            status: 'running',
        }));
    }

    isServiceRunning(serviceName: string): boolean {
        return this.runningServices.has(serviceName);
    }
}
