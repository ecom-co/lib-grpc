import { Injectable, Logger } from '@nestjs/common';

import { GrpcServiceManager } from './grpc-service-manager';

@Injectable()
export class GrpcBootstrapper {
    private readonly logger = new Logger(GrpcBootstrapper.name);

    constructor(private readonly grpcServiceManager: GrpcServiceManager) {
        this.logger.log('🔧 GrpcBootstrapper constructor called');
    }

    /**
     * Set the app module for creating microservices
     */
    setAppModule(appModule: any): void {
        this.grpcServiceManager.setAppModule(appModule);
    }

    /**
     * Manually bootstrap all gRPC services
     */
    async bootstrap(): Promise<void> {
        await this.grpcServiceManager.startAllServices();
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
    async addService(config: any): Promise<void> {
        await this.grpcServiceManager.addService(config);
    }

    async removeService(serviceName: string): Promise<void> {
        await this.grpcServiceManager.removeService(serviceName);
    }

    getRunningServices(): Array<{ name: string; port: number; status: string }> {
        return this.grpcServiceManager.getRunningServices();
    }

    isServiceRunning(serviceName: string): boolean {
        return this.grpcServiceManager.isServiceRunning(serviceName);
    }
}
