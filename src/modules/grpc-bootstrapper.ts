import { NestApplication } from '@nestjs/core';

import { Injectable, Logger } from '@nestjs/common';

import { GrpcServiceManager } from './grpc-service-manager';
import { GrpcConfig } from './interfaces';

@Injectable()
export class GrpcStarter {
    private readonly logger = new Logger(GrpcStarter.name);

    constructor(private readonly grpcServiceManager: GrpcServiceManager) {
        this.logger.log('🔧 GrpcStarter constructor called');
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
    start(): void {
        this.grpcServiceManager.startAllServices();
    }

    /**
     * Shutdown all gRPC services
     */
    async shutdown(): Promise<void> {
        await this.grpcServiceManager.stopAllServices();
    }

    /**
     * Delegate methods to service manager
     */
    addService(config: GrpcConfig): void {
        this.grpcServiceManager.addService(config);
    }

    getRunningServices(): Array<{ name: string; port: number; status: string }> {
        return this.grpcServiceManager.getRunningServices();
    }

    async removeService(serviceName: string): Promise<void> {
        await this.grpcServiceManager.removeService(serviceName);
    }

    isServiceRunning(serviceName: string): boolean {
        return this.grpcServiceManager.isServiceRunning(serviceName);
    }
}
