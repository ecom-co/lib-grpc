export interface GrpcCoreModuleOptions {
    services?: Array<{ name: string; package: string; protoPath: string }>;
    host?: string;
    port?: number;
}

export interface ServiceConfig {
    name: string;
    package: string;
    protoPath: string;
    host?: string;
    port?: number;
}
