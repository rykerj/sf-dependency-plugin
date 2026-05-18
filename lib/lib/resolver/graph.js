"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectedGraph = void 0;
class DirectedGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }
    addNode(node) {
        if (!this.nodes.has(node.id)) {
            this.nodes.set(node.id, node);
        }
    }
    addEdge(edge) {
        const exists = this.edges.some((e) => e.from === edge.from && e.to === edge.to && e.referenceType === edge.referenceType);
        if (!exists) {
            this.edges.push(edge);
        }
    }
    hasNode(id) {
        return this.nodes.has(id);
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    /** Returns all forward edges from a given node id */
    getForwardDependencies(nodeId) {
        return this.edges.filter((e) => e.from === nodeId && e.direction === 'forward');
    }
    /** Returns all nodes with policy 'include' or 'stub' — i.e. those that will be deployed */
    getDeployableNodes() {
        return Array.from(this.nodes.values()).filter((n) => n.policy === 'include' || n.policy === 'stub');
    }
    /** Returns all managed package nodes */
    getManagedPackageNodes() {
        return Array.from(this.nodes.values()).filter((n) => n.isManagedPackage);
    }
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges,
        };
    }
}
exports.DirectedGraph = DirectedGraph;
//# sourceMappingURL=graph.js.map