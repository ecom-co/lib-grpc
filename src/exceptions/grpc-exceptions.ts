import { RpcException } from '@nestjs/microservices';

import { GRPC_STATUS_CODES } from '../constants/grpc.constants';

export class GrpcAbortedException extends RpcException {
    constructor(message = 'Operation aborted') {
        super({ code: GRPC_STATUS_CODES.ABORTED, message });
    }
}

export class GrpcAlreadyExistsException extends RpcException {
    constructor(message = 'Resource already exists') {
        super({ code: GRPC_STATUS_CODES.ALREADY_EXISTS, message });
    }
}

export class GrpcDataLossException extends RpcException {
    constructor(message = 'Data loss') {
        super({ code: GRPC_STATUS_CODES.DATA_LOSS, message });
    }
}

export class GrpcFailedPreconditionException extends RpcException {
    constructor(message = 'Failed precondition') {
        super({ code: GRPC_STATUS_CODES.FAILED_PRECONDITION, message });
    }
}

export class GrpcInternalException extends RpcException {
    constructor(message = 'Internal error') {
        super({ code: GRPC_STATUS_CODES.INTERNAL, message });
    }
}

export class GrpcInvalidArgumentException extends RpcException {
    constructor(message = 'Invalid argument') {
        super({ code: GRPC_STATUS_CODES.INVALID_ARGUMENT, message });
    }
}

export class GrpcNotFoundException extends RpcException {
    constructor(message = 'Resource not found') {
        super({ code: GRPC_STATUS_CODES.NOT_FOUND, message });
    }
}

export class GrpcOutOfRangeException extends RpcException {
    constructor(message = 'Out of range') {
        super({ code: GRPC_STATUS_CODES.OUT_OF_RANGE, message });
    }
}

export class GrpcPermissionDeniedException extends RpcException {
    constructor(message = 'Permission denied') {
        super({ code: GRPC_STATUS_CODES.PERMISSION_DENIED, message });
    }
}

export class GrpcResourceExhaustedException extends RpcException {
    constructor(message = 'Resource exhausted') {
        super({ code: GRPC_STATUS_CODES.RESOURCE_EXHAUSTED, message });
    }
}

export class GrpcUnauthenticatedException extends RpcException {
    constructor(message = 'Unauthenticated') {
        super({ code: GRPC_STATUS_CODES.UNAUTHENTICATED, message });
    }
}

export class GrpcUnavailableException extends RpcException {
    constructor(message = 'Service unavailable') {
        super({ code: GRPC_STATUS_CODES.UNAVAILABLE, message });
    }
}

export class GrpcUnimplementedException extends RpcException {
    constructor(message = 'Method not implemented') {
        super({ code: GRPC_STATUS_CODES.UNIMPLEMENTED, message });
    }
}
