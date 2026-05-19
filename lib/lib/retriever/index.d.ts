import { DependencyGraph } from '../../types/graph';
export interface RetrievalResult {
    retrievedDir: string;
    /** Components that were in the manifest but did not come back from the org */
    missingComponents: MissingComponent[];
}
export interface MissingComponent {
    type: string;
    apiName: string;
    reason: 'not-in-org' | 'retrieve-error';
}
/**
 * Phase 2: Retrieve metadata from the org using the resolved package.xml.
 *
 * After retrieval, diffs the requested manifest against what actually
 * came back on disk. Anything absent is returned as a missing component
 * so the graph can be pruned before transformation.
 */
export declare function retrieveAndDiff(org: string, packageXmlPath: string, retrieveDir: string): Promise<RetrievalResult>;
/**
 * Phase 2.5: Prune the dependency graph of anything that did not come back
 * from the org. This is the final ground truth pass — if the org doesn't
 * have it, it has no business being in the manifest.
 *
 * Returns the list of pruned node IDs for logging.
 */
export declare function pruneGraphFromMissing(graph: DependencyGraph, missingComponents: MissingComponent[]): string[];
//# sourceMappingURL=index.d.ts.map