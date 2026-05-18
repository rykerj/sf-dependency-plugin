import { GraphNode, GraphEdge, DependencyGraph } from '../../types/graph';

export class DirectedGraph implements DependencyGraph {
  nodes: Map<string, GraphNode> = new Map();
  edges: GraphEdge[] = [];

  addNode(node: GraphNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
  }

  addEdge(edge: GraphEdge): void {
    const exists = this.edges.some(
      (e) => e.from === edge.from && e.to === edge.to && e.referenceType === edge.referenceType
    );
    if (!exists) {
      this.edges.push(edge);
    }
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /** Returns all forward edges from a given node id */
  getForwardDependencies(nodeId: string): GraphEdge[] {
    return this.edges.filter((e) => e.from === nodeId && e.direction === 'forward');
  }

  /** Returns all nodes with policy 'include' or 'stub' — i.e. those that will be deployed */
  getDeployableNodes(): GraphNode[] {
    return Array.from(this.nodes.values()).filter(
      (n) => n.policy === 'include' || n.policy === 'stub'
    );
  }

  /** Returns all managed package nodes */
  getManagedPackageNodes(): GraphNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.isManagedPackage);
  }

  toJSON(): object {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }
}