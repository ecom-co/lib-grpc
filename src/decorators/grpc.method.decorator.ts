import { applyDecorators, SetMetadata } from '@nestjs/common';

import { GrpcMethod as GrpcMethodDecorator } from '@nestjs/microservices';

import { GRPC_METHOD_METADATA_KEY, GRPC_SERVICE_METADATA_KEY } from '../constants';

/**
 * Enhanced gRPC method decorator that adds metadata for service and method identification
 * @param service - The gRPC service name
 * @param method - The gRPC method name
 * @returns A decorator that combines gRPC method registration with metadata
 */
export const GrpcMethod = (service: string, method: string) =>
    applyDecorators(
        GrpcMethodDecorator(service, method),
        SetMetadata(GRPC_SERVICE_METADATA_KEY, service),
        SetMetadata(GRPC_METHOD_METADATA_KEY, method),
    );
