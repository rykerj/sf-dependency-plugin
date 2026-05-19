import { ResolverConfig } from '../../types/config';
import { ResolutionResult } from '../../types/graph';
import { ToolingApiResolver } from './toolingApi';
export declare class Resolver {
    private config;
    private toolingApi;
    private graph;
    private visited;
    private managedPackages;
    private stubPackageComponents;
    private warnings;
    private stubIndex;
    constructor(config: ResolverConfig, toolingApi: ToolingApiResolver | null);
    resolve(): Promise<ResolutionResult>;
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
    private resolveDependencies;
    private findLocalFile;
    private classifyMissingComponent;
    /**
     * Handles a component not found in local source, stub dir, or managed packages.
     *
     * Key rule: if a component is unresolvable (not in local source, not a stub,
     * not a managed package) it is NOT added to the graph at all — meaning it will
     * not appear in the manifest. It is only warned about so the developer can
     * manually add it as a seed or investigate.
     */
    private handleMissingComponent;
    private handleManagedPackageComponent;
    private handleStubPackageComponent;
    private addEdge;
    private inferSeedType;
}
//# sourceMappingURL=index.d.ts.map