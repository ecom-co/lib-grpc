import * as fs from 'fs';
import * as path from 'path';

// Get the proto directory path (relative to the built dist folder)
const PROTO_ROOT = path.resolve(__dirname, '..', 'proto');

/**
 * Get all proto file paths
 */
export function getProtoFiles(): string[] {
    const servicesDir = path.join(PROTO_ROOT, 'services');
    const files = fs.readdirSync(servicesDir);

    return files.filter((file) => file.endsWith('.proto')).map((file) => path.join(servicesDir, file));
}

/**
 * Get proto file path by service name
 */
export function getProtoPath(serviceName: string): string {
    return path.join(PROTO_ROOT, 'services', `${serviceName}.proto`);
}

/**
 * Get proto directory path
 */
export function getProtoDir(): string {
    return PROTO_ROOT;
}

/**
 * Get services directory path
 */
export function getServicesDir(): string {
    return path.join(PROTO_ROOT, 'services');
}

// Export paths organized by functionality
export const PROTO_PATHS = {
    ROOT: PROTO_ROOT,
    SERVICES: {
        AUTH: path.join(PROTO_ROOT, 'services', 'auth.proto'),
        DIR: path.join(PROTO_ROOT, 'services'),
        USER: path.join(PROTO_ROOT, 'services', 'user.proto'),
    },
} as const;

// Legacy exports for backward compatibility
export const PROTO_DIR = PROTO_PATHS.ROOT;

export const SERVICES_DIR = PROTO_PATHS.SERVICES.DIR;

export const AUTH_PROTO = PROTO_PATHS.SERVICES.AUTH;

export const USER_PROTO = PROTO_PATHS.SERVICES.USER;
