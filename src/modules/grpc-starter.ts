import { Injectable, Logger } from '@nestjs/common';

import { GrpcServiceManager } from './grpc-service-manager';
import { AppModuleType, ServiceConfig } from './interfaces';

@Injectable()
export class GrpcStarter {
    private readonly logger = new Logger(GrpcStarter.name);

    constructor(private readonly grpcServiceManager: GrpcServiceManager) {
        this.logger.log('GrpcStarter initialized');
    }

    /**
     * Set the app module for creating microservices
     */
    setAppModule(appModule: AppModuleType): void {
        this.grpcServiceManager.setAppModule(appModule);
    }

    /**
     * Manually start all gRPC services
     */
    async start(): Promise<void> {
        await this.grpcServiceManager.startAllServices();
    }

    /**
     * Shutdown all gRPC services
     */
    async shutdown(): Promise<void> {
        await this.grpcServiceManager.stopAllServices();
    }

    /**
     * Add a new gRPC service dynamically
     * @param config - Service configuration with proper typing
     */
    async addService(config: ServiceConfig): Promise<void> {
        await this.grpcServiceManager.addService(config);
    }

    /**
     * Remove a gRPC service by name
     * @param serviceName - Name of the service to remove
     */
    async removeService(serviceName: string): Promise<void> {
        await this.grpcServiceManager.removeService(serviceName);
    }

    /**
     * Get list of running services
     * @returns Array of service information
     */
    getRunningServices(): Array<{ name: string; port: number; status: string }> {
        return this.grpcServiceManager.getRunningServices();
    }

    /**
     * Check if a service is currently running
     * @param serviceName - Name of the service to check
     */
    isServiceRunning(serviceName: string): boolean {
        return this.grpcServiceManager.isServiceRunning(serviceName);
    }
}
