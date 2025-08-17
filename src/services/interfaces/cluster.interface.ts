export interface ClusterConfig {
    nodeId: string;
    nodes: ClusterNode[];
    leaderElection?: boolean;
    heartbeatInterval?: number;
    electionTimeout?: number;
}

export interface ClusterNode {
    id: string;
    address: string;
    port: number;
    role: 'leader' | 'follower' | 'candidate';
    lastSeen: Date;
    metadata?: Record<string, any>;
}

export interface ClusterManager {
    join: (node: ClusterNode) => Promise<void>;
    leave: (nodeId: string) => Promise<void>;
    getNodes: () => ClusterNode[];
    getLeader: () => ClusterNode | null;
    isLeader: () => boolean;
    onLeaderChange: (callback: (leader: ClusterNode | null) => void) => void;
    onNodeJoin: (callback: (node: ClusterNode) => void) => void;
    onNodeLeave: (callback: (nodeId: string) => void) => void;
}
