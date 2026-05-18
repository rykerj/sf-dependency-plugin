import { PolicyMap } from '../../types/config';
import { DependencyGraph } from '../../types/graph';
import { TransformationLogEntry } from './objectTransformer';
export interface TransformResult {
    log: TransformationLogEntry[];
}
/**
 * Orchestrates Phase 3 transformation.
 * Walks the retrieved source directory and applies transformations
 * to metadata files based on the resolved graph and configured policies.
 */
export declare class Transformer {
    private policies;
    private graph;
    private log;
    constructor(policies: PolicyMap, graph: DependencyGraph);
    /**
     * Transforms all metadata files in sourceDir and writes results to outputDir.
     */
    transform(sourceDir: string, outputDir: string): Promise<TransformResult>;
    private copyAndTransform;
    /**
     * Builds a set of "Type:ApiName" strings for all resolved (include/stub) components.
     * Used to check if a referenced component is in the manifest.
     */
    private buildResolvedComponentSet;
    /**
     * Builds a set of "ObjectName.FieldName" strings for all resolved fields.
     * Used to scope listView columns and similar field references.
     */
    private buildResolvedFieldSet;
}
//# sourceMappingURL=index.d.ts.map