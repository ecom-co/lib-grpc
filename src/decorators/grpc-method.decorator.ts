import { applyDecorators, SetMetadata } from '@nestjs/common';

import { GrpcMethod as GrpcMethodDecorator } from '@nestjs/microservices';

export const GRPC_METHOD_METADATA = 'grpc:method_metadata';

export interface GrpcMethodMetadata {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    description?: string;
    logLevel?: 'debug' | 'error' | 'info' | 'warn';
    method: string;
    rateLimit?: number;
    requiresAuth?: boolean;
    service: string;
}

export const GrpcMethod = (service: string, method: string, metadata?: Partial<GrpcMethodMetadata>) => {
    const fullMetadata: GrpcMethodMetadata = {
        description: `${service}.${method}`,
        logLevel: 'info',
        method,
        service,
        ...metadata,
    };

    return applyDecorators(GrpcMethodDecorator(service, method), SetMetadata(GRPC_METHOD_METADATA, fullMetadata));
};
