import { PolicyValue } from './config';
export type ResolvedBy = 'tooling' | 'text' | 'seed';
export type EdgeDirection = 'forward' | 'reverse';
export interface GraphNode {
    id: string;
    type: string;
    apiName: string;
    namespace?: string;
    isManagedPackage: boolean;
    resolvedBy: ResolvedBy;
    policy: PolicyValue;
    depth: number;
    referencedFields?: string[];
}
export interface GraphEdge {
    from: string;
    to: string;
    direction: EdgeDirection;
    referenceType: string;
}
export interface DependencyGraph {
    nodes: Map<string, GraphNode>;
    edges: GraphEdge[];
    getDeployableNodes(): GraphNode[];
}
export interface ManagedPackagePrerequisite {
    namespace: string;
    packageName: string;
    reason: string;
}
export interface StubPackagePrerequisite {
    packageLabel: string;
    namespace: string | null;
    components: string[];
}
export interface ResolutionResult {
    graph: DependencyGraph;
    managedPackages: ManagedPackagePrerequisite[];
    stubPackages: StubPackagePrerequisite[];
    toolingApiQueryCount: number;
    warnings: string[];
}
//# sourceMappingURL=graph.d.ts.map