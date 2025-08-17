import { Injectable, Logger } from '@nestjs/common';

import { ClusterManager, ClusterConfig, ClusterNode } from '../interfaces';

@Injectable()
export class GrpcClusterManager implements ClusterManager {
    private readonly logger = new Logger(GrpcClusterManager.name);
    private readonly config: ClusterConfig;
    private readonly nodes = new Map<string, ClusterNode>();
    private currentLeader: ClusterNode | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private electionTimer: NodeJS.Timeout | null = null;

    private readonly leaderChangeCallbacks: Array<(leader: ClusterNode | null) => void> = [];
    private readonly nodeJoinCallbacks: Array<(node: ClusterNode) => void> = [];
    private readonly nodeLeaveCallbacks: Array<(nodeId: string) => void> = [];

    constructor(config: ClusterConfig) {
        const defaultConfig: Partial<ClusterConfig> = {
            leaderElection: true,
            heartbeatInterval: 5000,
            electionTimeout: 15000,
        };

        this.config = { ...defaultConfig, ...config } as ClusterConfig;
        this.logger.log(`Cluster manager initialized for node: ${this.config.nodeId}`);

        this.startHeartbeat();
        if (this.config.leaderElection) {
            this.startLeaderElection();
        }
    }

    join = (node: ClusterNode): Promise<void> => {
        this.nodes.set(node.id, node);
        this.logger.log(`Node joined cluster: ${node.id} (${node.address}:${node.port})`);

        // Notify callbacks
        this.nodeJoinCallbacks.forEach((callback) => callback(node));

        // If this is the first node or leader election is disabled, make it leader
        if (!this.currentLeader && (!this.config.leaderElection || this.nodes.size === 1)) {
            this.setLeader(node);
        }

        this.logClusterStatus();
        return Promise.resolve();
    };

    leave = (nodeId: string): Promise<void> => {
        const node = this.nodes.get(nodeId);
        if (!node) {
            this.logger.warn(`Attempted to remove non-existent node: ${nodeId}`);
            return Promise.resolve();
        }

        this.nodes.delete(nodeId);
        this.logger.log(`Node left cluster: ${nodeId}`);

        // Notify callbacks
        this.nodeLeaveCallbacks.forEach((callback) => callback(nodeId));

        // If the leader left, trigger election
        if (this.currentLeader?.id === nodeId) {
            this.currentLeader = null;
            this.notifyLeaderChange(null);

            if (this.config.leaderElection) {
                this.triggerElection();
            }
        }

        this.logClusterStatus();
        return Promise.resolve();
    };

    getNodes = (): ClusterNode[] => Array.from(this.nodes.values());

    getLeader = (): ClusterNode | null => this.currentLeader;

    isLeader = (): boolean => this.currentLeader?.id === this.config.nodeId;

    onLeaderChange = (callback: (leader: ClusterNode | null) => void): void => {
        this.leaderChangeCallbacks.push(callback);
    };

    onNodeJoin = (callback: (node: ClusterNode) => void): void => {
        this.nodeJoinCallbacks.push(callback);
    };

    onNodeLeave = (callback: (nodeId: string) => void): void => {
        this.nodeLeaveCallbacks.push(callback);
    };

    // Additional utility methods
    getNodeById(nodeId: string): ClusterNode | undefined {
        return this.nodes.get(nodeId);
    }

    updateNodeMetadata(nodeId: string, metadata: Record<string, any>): void {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.metadata = { ...node.metadata, ...metadata };
            node.lastSeen = new Date();
            this.logger.debug(`Updated metadata for node: ${nodeId}`);
        }
    }

    private startHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
            this.checkNodeHealth();
        }, this.config.heartbeatInterval ?? 5000);

        this.logger.debug('Started cluster heartbeat');
    }

    private sendHeartbeat(): void {
        // Update our own last seen
        const currentNode = this.nodes.get(this.config.nodeId);
        if (currentNode) {
            currentNode.lastSeen = new Date();
        }

        // In real implementation, send heartbeat to other nodes
        this.logger.debug('Heartbeat sent');
    }

    private checkNodeHealth(): void {
        const now = new Date();
        const timeout = (this.config.heartbeatInterval ?? 5000) * 3; // 3x heartbeat interval
        const nodesToRemove: string[] = [];

        for (const [nodeId, node] of this.nodes.entries()) {
            if (nodeId === this.config.nodeId) continue; // Don't check our own health

            const timeSinceLastSeen = now.getTime() - node.lastSeen.getTime();
            if (timeSinceLastSeen > timeout) {
                nodesToRemove.push(nodeId);
                this.logger.warn(`Node ${nodeId} is unresponsive, removing from cluster`);
            }
        }

        // Remove unresponsive nodes
        nodesToRemove.forEach((nodeId) => {
            void this.leave(nodeId);
        });
    }

    private startLeaderElection(): void {
        if (!this.config.leaderElection) return;

        this.triggerElection();
    }

    private triggerElection(): void {
        if (this.electionTimer) {
            clearTimeout(this.electionTimer);
        }

        this.logger.log('Starting leader election');

        this.electionTimer = setTimeout(
            () => {
                this.conductElection();
            },
            Math.random() * (this.config.electionTimeout ?? 15000),
        );
    }

    private conductElection(): void {
        const allNodes = this.getNodes();
        if (allNodes.length === 0) {
            this.logger.warn('No nodes available for election');
            return;
        }

        // Simple election algorithm: choose node with lowest ID
        const sortedNodes = allNodes.sort((a, b) => a.id.localeCompare(b.id));
        const [newLeader] = sortedNodes;

        if (!this.currentLeader || this.currentLeader.id !== newLeader.id) {
            this.setLeader(newLeader);
        }
    }

    private setLeader(leader: ClusterNode): void {
        const previousLeader = this.currentLeader;
        this.currentLeader = { ...leader, role: 'leader' };

        // Update all other nodes to follower role
        for (const [nodeId, node] of this.nodes.entries()) {
            if (nodeId === leader.id) {
                node.role = 'leader';
            } else {
                node.role = 'follower';
            }
        }

        if (!previousLeader || previousLeader.id !== leader.id) {
            this.logger.log(`New leader elected: ${leader.id}`);
            this.notifyLeaderChange(this.currentLeader);
        }
    }

    private notifyLeaderChange(leader: ClusterNode | null): void {
        this.leaderChangeCallbacks.forEach((callback) => callback(leader));
    }

    private logClusterStatus(): void {
        const nodes = this.getNodes();
        const leader = this.getLeader();

        this.logger.log('=== Cluster Status ===');
        this.logger.log(`Total nodes: ${nodes.length}`);
        this.logger.log(`Current leader: ${leader ? leader.id : 'None'}`);
        this.logger.log(`This node role: ${this.isLeader() ? 'Leader' : 'Follower'}`);

        nodes.forEach((node) => {
            const status = node.role === 'leader' ? '👑' : '👥';
            this.logger.log(`${status} ${node.id} (${node.address}:${node.port}) - ${node.role}`);
        });
    }

    // Cleanup method
    destroy(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        if (this.electionTimer) {
            clearTimeout(this.electionTimer);
            this.electionTimer = null;
        }

        this.nodes.clear();
        this.currentLeader = null;
        this.leaderChangeCallbacks.length = 0;
        this.nodeJoinCallbacks.length = 0;
        this.nodeLeaveCallbacks.length = 0;

        this.logger.log('Cluster manager destroyed');
    }
}
