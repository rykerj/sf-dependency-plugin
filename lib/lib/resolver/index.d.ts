import { ResolverConfig } from '../../types/config';
import { ResolutionResult } from '../../types/graph';
import { ToolingApiResolver } from './toolingApi';
export declare class Resolver {
    private config;
    private toolingApi;
    private graph;
    private visited;
    private managedPackages;
    private warnings;
    constructor(config: ResolverConfig, toolingApi: ToolingApiResolver | null);
    resolve(): Promise<ResolutionResult>;
    /**
     * Resolves dependencies for a given component using text analysis (preferred)
     * with Tooling API as supplement/fallback.
     */
    private resolveDependencies;
    private resolveFromText;
    private handleManagedPackageComponent;
    private addEdge;
    /**
     * Infers the metadata type of a seed component by checking file system.
     * Defaults to ApexClass if ambiguous.
     */
    private inferSeedType;
}
//# sourceMappingURL=index.d.ts.map