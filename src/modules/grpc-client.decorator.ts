import { DynamicModule, Inject, Module } from '@nestjs/common';

import { toUpper } from 'lodash';

import { GrpcClientFactory } from './grpc-client.factory';

/**
 * Normalize client name to uppercase
 * @param clientName - The client name to normalize
 * @returns Normalized client name
 */
function normalizeClientName(clientName: string): string {
    return toUpper(clientName);
}

/**
 * Decorator to inject a gRPC client by name
 * @param clientName - The name of the client configuration
 * @returns PropertyDecorator
 */
export function GrpcClient(clientName: string): PropertyDecorator {
    return (target: object, propertyKey: string | symbol) => {
        // Normalize client name to uppercase
        const normalizedName = normalizeClientName(clientName);

        // Create a unique injection token
        const token = `GRPC_CLIENT_${normalizedName}`;

        // Use NestJS Inject decorator
        Inject(token)(target, propertyKey);

        // Store the client name for later resolution
        const constructor = target.constructor as { grpcClientNames?: Map<string | symbol, string> };

        if (!constructor.grpcClientNames) {
            constructor.grpcClientNames = new Map();
        }

        constructor.grpcClientNames.set(propertyKey, normalizedName);
    };
}

/**
 * Provider factory for gRPC clients
 * @param clientName - The name of the client configuration
 * @returns Provider object
 */
export function createGrpcClientProvider(clientName: string) {
    const normalizedName = normalizeClientName(clientName);
    const token = `GRPC_CLIENT_${normalizedName}`;

    return {
        provide: token,
        useFactory: () => GrpcClientFactory.getClientByName(normalizedName),
    };
}

/**
 * Create providers for all gRPC clients
 * @param clientNames - Array of client names
 * @returns Array of provider objects
 */
export function createGrpcClientProviders(clientNames: string[]) {
    return clientNames.map((name) => createGrpcClientProvider(name));
}

/**
 * Module for gRPC client features
 * Automatically creates providers for specified client names
 */
@Module({})
export class GrpcClientModule {
    /**
     * Create a module with gRPC client providers
     * @param clientNames - Array of client names to create providers for
     * @returns DynamicModule
     */
    static forFeature(clientNames: string[]): DynamicModule {
        return {
            providers: createGrpcClientProviders(clientNames),
            exports: createGrpcClientProviders(clientNames),
            module: GrpcClientModule,
        };
    }
}
