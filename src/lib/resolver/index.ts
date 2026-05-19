import * as path from 'path';
import * as fs from 'fs';
import { ResolverConfig } from '../../types/config';
import {
  GraphNode,
  GraphEdge,
  ManagedPackagePrerequisite,
  StubPackagePrerequisite,
  ResolutionResult,
} from '../../types/graph';
import { DirectedGraph } from './graph';
import { getPolicy, isManagedPackageComponent, extractNamespace } from './policyEngine';
import { analyzeApexFile, findApexFile, TextDependency } from './textAnalyzer';
import { ToolingApiResolver } from './toolingApi';
import {
  buildStubDirectoryIndex,
  findInStubIndex,
  buildStubPackagePrerequisites,
  StubDirectoryIndex,
  StubPackageComponent,
} from './stubDirectory';

interface QueueItem {
  type: string;
  apiName: string;
  depth: number;
  parentId: string | null;
  referenceType: string;
}

type MissingComponentReason =
  | 'managed-package'
  | 'stub-package'
  | 'inner-class'
  | 'false-positive'
  | 'unresolvable';

export class Resolver {
  private graph: DirectedGraph;
  private visited: Set<string>;
  private managedPackages: Map<string, ManagedPackagePrerequisite>;
  private stubPackageComponents: StubPackageComponent[];
  private warnings: string[];
  private stubIndex: StubDirectoryIndex;

  constructor(
    private config: ResolverConfig,
    private toolingApi: ToolingApiResolver | null
  ) {
    this.graph = new DirectedGraph();
    this.visited = new Set();
    this.managedPackages = new Map();
    this.stubPackageComponents = [];
    this.warnings = [];

    // Build stub index once at construction — zero cost if no stubDir configured
    this.stubIndex = buildStubDirectoryIndex(config.stubDir ?? '');
  }

  async resolve(): Promise<ResolutionResult> {
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

      if (this.visited.has(nodeId)) {
        if (current.parentId) {
          this.addEdge(current.parentId, nodeId, current.referenceType);
        }
        continue;
      }

      if (current.depth > this.config.maxDepth) {
        this.warnings.push(
          `Max depth (${this.config.maxDepth}) reached at ${nodeId} — skipping. ` +
          `Add as a seed if it should be fully resolved.`
        );
        continue;
      }

      this.visited.add(nodeId);

      // ------------------------------------------------------------------
      // Step 1: Stub directory check (covers 2GP, unlocked, and 1GP with
      // namespace). Do this BEFORE managed package check so that unlocked
      // packages (no namespace) are caught here.
      // ------------------------------------------------------------------
      const stubMatch = findInStubIndex(current.apiName, this.stubIndex);
      if (stubMatch) {
        this.handleStubPackageComponent(current, nodeId, stubMatch);
        continue;
      }

      // ------------------------------------------------------------------
      // Step 2: Managed package check via namespace prefix (1GP).
      // ------------------------------------------------------------------
      const isManaged = isManagedPackageComponent(current.apiName, current.type);
      if (isManaged) {
        await this.handleManagedPackageComponent(current, nodeId, extractNamespace(current.apiName));
        continue;
      }

      // ------------------------------------------------------------------
      // Step 3: Local file existence check.
      // When useLocalSource is true, the file system IS the authority.
      // If not found locally and not in stub/managed package — classify and
      // decide: skip silently, warn, or exclude from manifest.
      // ------------------------------------------------------------------
      if (this.config.useLocalSource) {
        const localPath = this.findLocalFile(current.type, current.apiName);

        if (!localPath) {
          const reason = this.classifyMissingComponent(current);
          this.handleMissingComponent(current, nodeId, reason);
          continue;
        }
      }

      // ------------------------------------------------------------------
      // Step 4: Component confirmed present — evaluate policy and add to graph
      // ------------------------------------------------------------------
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

      if (current.parentId) {
        this.addEdge(current.parentId, nodeId, current.referenceType);
      }

      if (policy === 'exclude' || policy === 'stub') continue;

      // ------------------------------------------------------------------
      // Step 5: Resolve children
      // ------------------------------------------------------------------
      const deps = await this.resolveDependencies(current.type, current.apiName);

      for (const dep of deps) {
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
      stubPackages: buildStubPackagePrerequisites(this.stubPackageComponents),
      toolingApiQueryCount: this.toolingApi?.getQueryCount() ?? 0,
      warnings: this.warnings,
    };
  }

  // --------------------------------------------------------------------------
  // Dependency resolution — driven by toolingApiMode
  // --------------------------------------------------------------------------

  /**
   * Resolves dependencies for a confirmed-present component.
   *
   * toolingApiMode behaviour:
   *   'never'              — text analysis only, no API calls ever
   *   'package-names-only' — text analysis only for graph building; API only
   *                          used separately for package name lookup
   *   'supplement'         — text analysis first, then API to catch what regex missed
   *   'primary'            — API only (useLocalSource false)
   */
  private async resolveDependencies(
    type: string,
    apiName: string
  ): Promise<TextDependency[]> {
    const deps: TextDependency[] = [];
    const mode = this.config.toolingApiMode;

    // Local text analysis (all modes except 'primary')
    if (mode !== 'primary' && this.config.useLocalSource) {
      const localPath = this.findLocalFile(type, apiName);
      if (localPath) {
        deps.push(...analyzeApexFile(localPath));
      }
      if (mode === 'never' || mode === 'package-names-only') {
        return deps;
      }
    }

    // Tooling API (supplement or primary only)
    if ((mode === 'supplement' || mode === 'primary') && this.toolingApi) {
      try {
        const toolingDeps = await this.toolingApi.getDependencies(apiName, type);
        for (const td of toolingDeps) {
          const alreadyFound = deps.some(
            (d) => d.type === td.type && d.apiName === td.apiName
          );
          if (!alreadyFound) deps.push(td);
        }
      } catch (err: any) {
        if (
          err.message.includes('hard abort') ||
          err.message.includes('aborted by user')
        ) {
          throw err;
        }
        this.warnings.push(
          `Tooling API query failed for ${type}:${apiName} — ${err.message}`
        );
      }
    }

    return deps;
  }

  // --------------------------------------------------------------------------
  // File location
  // --------------------------------------------------------------------------

  private findLocalFile(type: string, apiName: string): string | null {
    if (type === 'ApexClass') {
      return findApexFile(apiName, this.config.localSourceDir, 'cls');
    }
    if (type === 'ApexTrigger') {
      return findApexFile(apiName, this.config.localSourceDir, 'trigger');
    }
    if (type === 'CustomObject') {
      const p = path.join(
        this.config.localSourceDir,
        'objects', apiName, `${apiName}.object-meta.xml`
      );
      return fs.existsSync(p) ? p : null;
    }
    if (type === 'CustomField') {
      const parts = apiName.split('.');
      if (parts.length === 2) {
        const p = path.join(
          this.config.localSourceDir,
          'objects', parts[0], 'fields', `${parts[1]}.field-meta.xml`
        );
        return fs.existsSync(p) ? p : null;
      }
      return null;
    }
    // Other types driven by parent object metadata — not individually file-located
    return null;
  }

  // --------------------------------------------------------------------------
  // Missing component classification and handling
  // --------------------------------------------------------------------------

  private classifyMissingComponent(current: QueueItem): MissingComponentReason {
    const { apiName, referenceType } = current;

    if (apiName.includes('__')) return 'unresolvable';

    // Inner class: referenced via StaticMethodCall where no top-level file exists.
    // The outer class file should already be (or will be) in the graph.
    if (referenceType === 'StaticMethodCall') return 'inner-class';

    // Regex over-capture — generic type param that turned out to be a platform type
    if (referenceType === 'GenericType' || referenceType === 'GenericTypeClass') {
      return 'false-positive';
    }

    return 'unresolvable';
  }

  /**
   * Handles a component not found in local source, stub dir, or managed packages.
   *
   * Key rule: if a component is unresolvable (not in local source, not a stub,
   * not a managed package) it is NOT added to the graph at all — meaning it will
   * not appear in the manifest. It is only warned about so the developer can
   * manually add it as a seed or investigate.
   */
  private handleMissingComponent(
    current: QueueItem,
    nodeId: string,
    reason: MissingComponentReason
  ): void {
    switch (reason) {
      case 'inner-class':
        // Silent — expected. Outer class is in the graph.
        break;

      case 'false-positive':
        // Silent — expected regex over-capture.
        break;

      case 'unresolvable':
        // NOT added to graph → NOT in manifest. Warn so developer can investigate.
        this.warnings.push(
          `⚠️  ${nodeId} not found in local source, stub directory, or as a managed package ` +
          `(referenced via ${current.referenceType} from ${current.parentId ?? 'seed'}). ` +
          `It will be excluded from the manifest. If this is a real dependency, ` +
          `add it to seeds manually or verify your localSourceDir and stubDir paths.`
        );
        break;
    }
    // In all cases: nothing is added to this.graph — component is absent from manifest.
  }

  // --------------------------------------------------------------------------
  // Managed package (1GP namespace prefix)
  // --------------------------------------------------------------------------

  private async handleManagedPackageComponent(
    current: QueueItem,
    nodeId: string,
    namespace: string
  ): Promise<void> {
    if (!this.managedPackages.has(namespace)) {
      let packageName = namespace;

      // Only attempt API name lookup in modes that allow API calls
      const mode = this.config.toolingApiMode;
      if (
        this.toolingApi &&
        (mode === 'package-names-only' ||
          mode === 'supplement' ||
          mode === 'primary')
      ) {
        packageName = await this.toolingApi.resolvePackageName(namespace);
      }

      this.managedPackages.set(namespace, {
        namespace,
        packageName,
        reason: `Referenced by ${current.parentId ?? 'seed'} via ${current.apiName}`,
      });
    }

    // Add to graph as excluded — never deployed, must be pre-installed
    const node: GraphNode = {
      id: nodeId,
      type: current.type,
      apiName: current.apiName,
      namespace,
      isManagedPackage: true,
      resolvedBy: 'text',
      policy: 'exclude',
      depth: current.depth,
    };

    this.graph.addNode(node);

    if (current.parentId) {
      this.addEdge(current.parentId, nodeId, current.referenceType);
    }
  }

  // --------------------------------------------------------------------------
  // Stub package (2GP, unlocked, or 1GP found via stub directory)
  // --------------------------------------------------------------------------

  private handleStubPackageComponent(
    current: QueueItem,
    nodeId: string,
    stub: StubPackageComponent
  ): void {
    // Track for prerequisites output
    this.stubPackageComponents.push(stub);

    // Add to graph as excluded — package must be installed in scratch org
    const node: GraphNode = {
      id: nodeId,
      type: current.type,
      apiName: current.apiName,
      namespace: stub.namespace ?? undefined,
      isManagedPackage: true, // treated the same as managed for manifest purposes
      resolvedBy: 'text',
      policy: 'exclude',
      depth: current.depth,
    };

    this.graph.addNode(node);

    if (current.parentId) {
      this.addEdge(current.parentId, nodeId, current.referenceType);
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private addEdge(fromId: string, toId: string, referenceType: string): void {
    const edge: GraphEdge = {
      from: fromId,
      to: toId,
      direction: 'forward',
      referenceType,
    };
    this.graph.addEdge(edge);
  }

  private inferSeedType(apiName: string): string {
    const triggerPath = findApexFile(apiName, this.config.localSourceDir, 'trigger');
    if (triggerPath) return 'ApexTrigger';
    return 'ApexClass';
  }
}