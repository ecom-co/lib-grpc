import { Injectable } from '@nestjs/common';

import { assign, filter, get, has, isEmpty, map, omit, set, toPairs, values } from 'lodash';

import { GrpcConfig, GrpcCoreModuleOptions, RunningGrpcServer } from './interfaces';

@Injectable()
export class GrpcConfigService {
    private options: GrpcCoreModuleOptions = {
        basePort: 50051,
        configs: [],
        host: 'localhost',
        isDevelopment: false,
        loaderOptions: {
            defaults: true,
            enums: String,
            keepCase: true,
            longs: String,
            oneofs: true,
        },
    };

    private runningServices: Record<string, { port: number; server: RunningGrpcServer }> = {};

    getBasePort(): number {
        return get(this.options, 'basePort', 50051);
    }

    getClientConfigs(): GrpcConfig[] {
        return filter(this.getConfigs(), { type: 'client' });
    }

    getConfigs(): GrpcConfig[] {
        return get(this.options, 'configs', []);
    }

    getHost(): string {
        return get(this.options, 'host', 'localhost');
    }

    getLoaderOptions() {
        return get(this.options, 'loaderOptions', {
            defaults: true,
            enums: String,
            keepCase: true,
            longs: String,
            oneofs: true,
        });
    }

    getOptions(): GrpcCoreModuleOptions {
        return this.options;
    }

    getRegistryOptions() {
        return get(this.options, 'registryOptions');
    }

    getServerConfigs(): GrpcConfig[] {
        return filter(this.getConfigs(), { type: 'server' });
    }

    getServerOptions() {
        return get(this.options, 'serverOptions');
    }

    setOptions(options: GrpcCoreModuleOptions): void {
        this.options = assign({}, this.options, options);
    }

    isDevelopment(): boolean {
        return get(this.options, 'isDevelopment', process.env.NODE_ENV === 'development');
    }

    // Running services management
    addRunningService(name: string, port: number, server: RunningGrpcServer): void {
        set(this.runningServices, name, { port, server });
    }

    getAllRunningServices(): Record<string, { port: number; server: RunningGrpcServer }> {
        return { ...this.runningServices };
    }

    getRunningService(name: string) {
        return get(this.runningServices, name);
    }

    getRunningServicesList(): Array<{ name: string; port: number; status: string }> {
        return map(toPairs(this.runningServices), ([name, { port }]) => ({
            name,
            status: 'running',
            port,
        }));
    }

    getUsedPorts(): number[] {
        return map(values(this.runningServices), 'port');
    }

    clearRunningServices(): void {
        this.runningServices = {};
    }

    removeRunningService(name: string): boolean {
        if (has(this.runningServices, name)) {
            this.runningServices = omit(this.runningServices, name);

            return true;
        }

        return false;
    }

    isEmptyRunning(): boolean {
        return isEmpty(this.runningServices);
    }

    isServiceRunning(name: string): boolean {
        return has(this.runningServices, name);
    }
}
