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

        // Connect microservice first
        const microservice = app.connectMicroservice(grpcOptions);

        // Apply global middleware AFTER connecting but BEFORE starting
        if (globalMiddleware) {
            if (globalMiddleware.pipes?.length) {
                globalMiddleware.pipes.forEach((pipe) => {
                    microservice.useGlobalPipes(pipe);
                });
            }

            if (globalMiddleware.filters?.length) {
                globalMiddleware.filters.forEach((filter) => {
                    microservice.useGlobalFilters(filter);
                });
            }

            if (globalMiddleware.interceptors?.length) {
                globalMiddleware.interceptors.forEach((interceptor) => {
                    microservice.useGlobalInterceptors(interceptor);
                });
            }

            if (globalMiddleware.guards?.length) {
                globalMiddleware.guards.forEach((guard) => {
                    microservice.useGlobalGuards(guard);
                });
            }
        }

        return microservice;
    }
}
