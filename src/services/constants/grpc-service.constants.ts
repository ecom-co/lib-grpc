export const GRPC_MODULE_OPTIONS = 'GRPC_MODULE_OPTIONS';
export const GRPC_SERVICE_REGISTRY = 'GRPC_SERVICE_REGISTRY';

export const DEFAULT_GRPC_PORT = 50051;

export interface ServicePortRange {
    start: number;
    end: number;
}

/**
 * Service port ranges
 */
export const SERVICE_PORT_RANGES: Record<string, ServicePortRange> = {
    USER_SERVICES: { start: 50052, end: 50060 },
    PRODUCT_SERVICES: { start: 50061, end: 50070 },
    ORDER_SERVICES: { start: 50071, end: 50080 },
    PAYMENT_SERVICES: { start: 50081, end: 50090 },
    NOTIFICATION_SERVICES: { start: 50091, end: 50100 },
} as const;
