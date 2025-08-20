import { join } from 'path';

import { toUpper } from 'lodash';

import { ClientProxyFactory, Transport } from '@nestjs/microservices';

import type { GrpcClientConfig, GrpcConfig } from './interfaces';
import type { ClientProxy, GrpcOptions } from '@nestjs/microservices';

/**
 * Normalize client name to uppercase
 * @param clientName - The client name to normalize
 * @returns Normalized client name
 */
const normalizeClientName = (clientName: string): string => toUpper(clientName);

/**
 * Factory for creating gRPC clients from configuration
 */
function isClientConfig(config: GrpcConfig): config is GrpcClientConfig {
    return config.type === 'client';
}

// Type guard for client config
export class GrpcClientFactory {
    private static readonly clients = new Map<string, ClientProxy>();

    /**
     * Create a gRPC client from configuration
     */
    static async createClient(config: GrpcClientConfig): Promise<ClientProxy> {
        const options: GrpcOptions = {
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
                url: config.url,
            },
            transport: Transport.GRPC,
        };

        const client = ClientProxyFactory.create(options);

        await client.connect();

        return client;
    }

    /**
     * Get or create a client by name
     */
    static async getClient(config: GrpcClientConfig): Promise<ClientProxy> {
        const normalizedName = normalizeClientName(config.name);

        if (this.clients.has(normalizedName)) {
            return this.clients.get(normalizedName)!;
        }

        const client = await this.createClient(config);

        this.clients.set(normalizedName, client);

        return client;
    }

    /**
     * Get a specific client by name (after initialization)
     */
    static getClientByName(name: string): ClientProxy | undefined {
        const normalizedName = normalizeClientName(name);

        return this.clients.get(normalizedName);
    }

    /**
     * Initialize all clients from configurations
     */
    static async initializeClients(configs: GrpcConfig[]): Promise<Map<string, ClientProxy>> {
        const clientConfigs = configs.filter(isClientConfig);

        for (const config of clientConfigs) {
            await this.getClient(config);
        }

        return this.clients;
    }

    /**
     * Close all client connections
     */
    static async closeAllClients(): Promise<void> {
        const closePromises = Array.from(this.clients.values()).map((client) => client.close() as Promise<void>);

        await Promise.all(closePromises);
        this.clients.clear();
    }

    /**
     * Get all initialized clients
     */
    static getAllClients(): Map<string, ClientProxy> {
        return new Map(this.clients);
    }
}
