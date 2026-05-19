import { PolicyValue } from './config';

export type ResolvedBy = 'tooling' | 'text' | 'seed';
export type EdgeDirection = 'forward' | 'reverse';

export interface GraphNode {
  id: string;                  // "ApexClass:MyClass"
  type: string;                // "ApexClass", "CustomField", etc.
  apiName: string;             // "MyClass", "MyObject__c.MyField__c"
  namespace?: string;          // namespace prefix if managed package
  isManagedPackage: boolean;
  resolvedBy: ResolvedBy;
  policy: PolicyValue;
  depth: number;
  referencedFields?: string[]; // For CustomObject nodes only
}

export interface GraphEdge {
  from: string;                // Node id
  to: string;                  // Node id
  direction: EdgeDirection;
  referenceType: string;       // "FieldReference", "MethodCall", "ActionOverride", etc.
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