import { GraphNode, GraphEdge, DependencyGraph } from '../../types/graph';
export declare class DirectedGraph implements DependencyGraph {
    nodes: Map<string, GraphNode>;
    edges: GraphEdge[];
    addNode(node: GraphNode): void;
    addEdge(edge: GraphEdge): void;
    hasNode(id: string): boolean;
    getNode(id: string): GraphNode | undefined;
    /** Returns all forward edges from a given node id */
    getForwardDependencies(nodeId: string): GraphEdge[];
    /** Returns all nodes with policy 'include' or 'stub' — i.e. those that will be deployed */
    getDeployableNodes(): GraphNode[];
    /** Returns all managed package nodes */
    getManagedPackageNodes(): GraphNode[];
    toJSON(): object;
}
//# sourceMappingURL=graph.d.ts.map