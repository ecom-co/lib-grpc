import { join } from 'path';

import type { NestApplication } from '@nestjs/core';

import type { CanActivate, ExceptionFilter, NestInterceptor, PipeTransform } from '@nestjs/common';

import { Transport } from '@nestjs/microservices';

import type { GrpcServerConfig } from './interfaces';
import type { GrpcOptions } from '@nestjs/microservices';

export class GrpcMicroserviceFactory {
    /**
     * Create gRPC microservice with global middleware
     */
    static createMicroservice(
        app: NestApplication,
        config: GrpcServerConfig,
        globalMiddleware?: {
            filters?: ExceptionFilter[];
            guards?: CanActivate[];
            interceptors?: NestInterceptor[];
            pipes?: PipeTransform[];
        },
    ) {
        // Create base gRPC options
        const grpcOptions: GrpcOptions = {
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
                url: `${config.host || 'localhost'}:${config.port}`,
            },
            transport: Transport.GRPC,
        };

        // Apply global middleware to options BEFORE connecting
        if (globalMiddleware) {
            // Add middleware to options directly
            const enhancedOptions = grpcOptions as GrpcOptions & {
                filters?: ExceptionFilter[];
                guards?: CanActivate[];
                interceptors?: NestInterceptor[];
                pipes?: PipeTransform[];
            };

            enhancedOptions.pipes = globalMiddleware.pipes || [];
            enhancedOptions.filters = globalMiddleware.filters || [];
            enhancedOptions.interceptors = globalMiddleware.interceptors || [];
            enhancedOptions.guards = globalMiddleware.guards || [];
        }

        // Connect microservice with middleware already configured
        return app.connectMicroservice(grpcOptions);
    }
}
