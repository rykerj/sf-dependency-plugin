import * as path from 'path';
import { ResolverConfig } from '../../types/config';
import { GraphNode, GraphEdge, ManagedPackagePrerequisite, ResolutionResult } from '../../types/graph';
import { DirectedGraph } from './graph';
import { getPolicy, isManagedPackageComponent, extractNamespace } from './policyEngine';
import { analyzeApexFile, findApexFile, TextDependency } from './textAnalyzer';
import { ToolingApiResolver } from './toolingApi';

interface QueueItem {
  type: string;
  apiName: string;
  depth: number;
  parentId: string | null;
  referenceType: string;
}

export class Resolver {
  private graph: DirectedGraph;
  private visited: Set<string>;
  private managedPackages: Map<string, ManagedPackagePrerequisite>;
  private warnings: string[];

  constructor(
    private config: ResolverConfig,
    private toolingApi: ToolingApiResolver | null
  ) {
    this.graph = new DirectedGraph();
    this.visited = new Set();
    this.managedPackages = new Map();
    this.warnings = [];
  }

  async resolve(): Promise<ResolutionResult> {
    // Seed the queue with all configured seeds
    const queue: QueueItem[] = this.config.seeds.map((seed) => ({
      type: this.inferSeedType(seed),
      apiName: seed,
      depth: 0,
      parentId: null,
      referenceType: 'seed',
    }));

    while (queue.length > 0) {
      const current = queue.shift()!;
      const nodeId = `${current.type}:${current.apiName}`;

      // Skip already visited
      if (this.visited.has(nodeId)) {
        // Still add the edge if there's a parent
        if (current.parentId) {
          this.addEdge(current.parentId, nodeId, current.referenceType);
        }
        continue;
      }

      // Depth guard
      if (current.depth > this.config.maxDepth) {
        this.warnings.push(
          `Max depth (${this.config.maxDepth}) reached at ${nodeId} — skipping further resolution. ` +
            `Add this component as a seed if it should be fully resolved.`
        );
        continue;
      }

      this.visited.add(nodeId);

      // Check for managed package
      const isManaged = isManagedPackageComponent(current.apiName, current.type);
      const namespace = isManaged ? extractNamespace(current.apiName) : undefined;

      if (isManaged) {
        await this.handleManagedPackageComponent(current, namespace!);
        continue;
      }

      // Evaluate policy
      const policy = getPolicy(current.type, this.config.policies);

      const node: GraphNode = {
        id: nodeId,
        type: current.type,
        apiName: current.apiName,
        isManagedPackage: false,
        resolvedBy: current.depth === 0 ? 'seed' : 'text',
        policy,
        depth: current.depth,
      };

      this.graph.addNode(node);

      // Add edge from parent
      if (current.parentId) {
        this.addEdge(current.parentId, nodeId, current.referenceType);
      }

      // Do not recurse for stub or exclude
      if (policy === 'exclude' || policy === 'stub') continue;

      // Resolve dependencies for include nodes
      const deps = await this.resolveDependencies(current.type, current.apiName);

      for (const dep of deps) {
        const depId = `${dep.type}:${dep.apiName}`;
        queue.push({
          type: dep.type,
          apiName: dep.apiName,
          depth: current.depth + 1,
          parentId: nodeId,
          referenceType: dep.referenceType,
        });
      }
    }

    return {
      graph: this.graph,
      managedPackages: Array.from(this.managedPackages.values()),
      toolingApiQueryCount: this.toolingApi?.getQueryCount() ?? 0,
      warnings: this.warnings,
    };
  }

  /**
   * Resolves dependencies for a given component using text analysis (preferred)
   * with Tooling API as supplement/fallback.
   */
  private async resolveDependencies(
    type: string,
    apiName: string
  ): Promise<TextDependency[]> {
    const deps: TextDependency[] = [];

    // Text analysis first
    if (this.config.useLocalSource) {
      const textDeps = await this.resolveFromText(type, apiName);
      deps.push(...textDeps);
    }

    // Tooling API supplement if available
    if (this.toolingApi) {
      try {
        const toolingDeps = await this.toolingApi.getDependencies(apiName, type);
        // Merge: add Tooling API results not already found by text analysis
        for (const td of toolingDeps) {
          const alreadyFound = deps.some(
            (d) => d.type === td.type && d.apiName === td.apiName
          );
          if (!alreadyFound) {
            deps.push({ ...td, referenceType: 'ToolingApi' });
          }
        }
      } catch (err: any) {
        // Re-throw budget errors — these are intentional stops
        if (err.message.includes('hard abort') || err.message.includes('aborted by user')) {
          throw err;
        }
        this.warnings.push(`Tooling API query failed for ${type}:${apiName} — ${err.message}`);
      }
    }

    return deps;
  }

  private async resolveFromText(type: string, apiName: string): Promise<TextDependency[]> {
    if (type === 'ApexClass') {
      const filePath = findApexFile(apiName, this.config.localSourceDir, 'cls');
      if (filePath) {
        return analyzeApexFile(filePath);
      }
      this.warnings.push(`Local source not found for ApexClass:${apiName} — falling back to Tooling API only`);
    }

    if (type === 'ApexTrigger') {
      const filePath = findApexFile(apiName, this.config.localSourceDir, 'trigger');
      if (filePath) {
        return analyzeApexFile(filePath);
      }
      this.warnings.push(`Local source not found for ApexTrigger:${apiName} — falling back to Tooling API only`);
    }

    return [];
  }

  private async handleManagedPackageComponent(
    current: QueueItem,
    namespace: string
  ): Promise<void> {
    const nodeId = `${current.type}:${current.apiName}`;

    if (!this.managedPackages.has(namespace)) {
      // Attempt to resolve the package name
      let packageName = namespace;
      if (this.toolingApi) {
        packageName = await this.toolingApi.resolvePackageName(namespace);
      }

      this.managedPackages.set(namespace, {
        namespace,
        packageName,
        reason: `Referenced by ${current.parentId ?? 'seed'} via ${current.apiName}`,
      });
    }

    // Add as a node but mark as managed — never recurse
    const node: GraphNode = {
      id: nodeId,
      type: current.type,
      apiName: current.apiName,
      namespace,
      isManagedPackage: true,
      resolvedBy: 'tooling',
      policy: 'exclude', // Never deployed — must be pre-installed
      depth: current.depth,
    };

    this.graph.addNode(node);

    if (current.parentId) {
      this.addEdge(current.parentId, nodeId, current.referenceType);
    }
  }

  private addEdge(fromId: string, toId: string, referenceType: string): void {
    const edge: GraphEdge = {
      from: fromId,
      to: toId,
      direction: 'forward',
      referenceType,
    };
    this.graph.addEdge(edge);
  }

  /**
   * Infers the metadata type of a seed component by checking file system.
   * Defaults to ApexClass if ambiguous.
   */
  private inferSeedType(apiName: string): string {
    const triggerPath = findApexFile(apiName, this.config.localSourceDir, 'trigger');
    if (triggerPath) return 'ApexTrigger';
    return 'ApexClass';
  }
}