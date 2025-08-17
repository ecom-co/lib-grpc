export interface ServiceDiscoveryConfig {
    provider: 'consul' | 'etcd' | 'memory';
    consul?: ConsulConfig;
    etcd?: EtcdConfig;
}

export interface ConsulConfig {
    host: string;
    port: number;
    secure?: boolean;
    token?: string;
    datacenter?: string;
}

export interface EtcdConfig {
    hosts: string[];
    username?: string;
    password?: string;
    rootCertificate?: string;
    privateKey?: string;
    certChain?: string;
}

export interface ServiceInstance {
    id: string;
    name: string;
    address: string;
    port: number;
    tags?: string[];
    meta?: Record<string, string>;
    health?: HealthStatus;
    lastSeen?: Date;
}

export interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'warning' | 'unknown';
    checks: HealthCheck[];
    lastChecked: Date;
}

export interface HealthCheck {
    name: string;
    status: 'passing' | 'warning' | 'critical';
    output?: string;
    notes?: string;
}

export interface ServiceDiscovery {
    register: (instance: ServiceInstance) => Promise<void>;
    deregister: (serviceId: string) => Promise<void>;
    discover: (serviceName: string) => Promise<ServiceInstance[]>;
    watch: (serviceName: string, callback: (instances: ServiceInstance[]) => void) => void;
    health: (serviceId: string) => Promise<HealthStatus>;
}
