export interface GrpcServiceConfig {
    name: string;
    package: string;
    protoPath: string;
    port: number;
    enabled: boolean;
    url?: string;
}

export interface GrpcModuleOptions {
    services?: GrpcServiceConfig[];
    defaultEnabled?: boolean;
    basePath?: string;
}

export interface GrpcModuleAsyncOptions {
    useFactory?: (...args: any[]) => Promise<GrpcModuleOptions> | GrpcModuleOptions;
    inject?: any[];
}
