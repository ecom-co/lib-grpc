import { RpcException } from '@nestjs/microservices';

import { GRPC_STATUS_CODES } from '../constants/grpc.constants';

export class GrpcValidationException extends RpcException {
    constructor(
        public readonly errors: string[],
        public readonly fieldErrors?: Record<string, Record<string, string>>,
        message = 'Validation failed',
    ) {
        super({
            code: GRPC_STATUS_CODES.INVALID_ARGUMENT,
            message,
            details: JSON.stringify({ errors, fieldErrors }),
        });
    }

    getValidationMessages(): string[] {
        return this.errors;
    }

    getFieldErrors(): Record<string, Record<string, string>> | undefined {
        return this.fieldErrors;
    }
}
