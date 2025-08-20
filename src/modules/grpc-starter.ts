import { NestApplication } from '@nestjs/core';

import { Injectable, Logger } from '@nestjs/common';

import { GrpcServiceManager } from './grpc-service-manager';
import { GrpcConfig } from './interfaces';

@Injectable()
export class GrpcStarter {
    private readonly logger = new Logger(GrpcStarter.name);

    constructor(private readonly grpcServiceManager: GrpcServiceManager) {
        this.logger.log('GrpcStarter initialized');
    }

    /**
     * Set the main app instance for hybrid microservices
     */
    setApp(app: NestApplication): void {
        this.grpcServiceManager.setApp(app);
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
    addService(config: GrpcConfig): void {
        this.grpcServiceManager.addService(config);
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
