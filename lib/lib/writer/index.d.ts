import { DependencyGraph, ManagedPackagePrerequisite } from '../../types/graph';
import { TransformationLogEntry } from '../transformer/objectTransformer';
import { ResolverConfig } from '../../types/config';
/**
 * Generates the final package.xml from the resolved dependency graph.
 */
export declare function writePackageXml(outputDir: string, graph: DependencyGraph): void;
/**
 * Writes the dependency graph as JSON for visualization and auditing.
 */
export declare function writeDependencyGraph(outputDir: string, graph: DependencyGraph, meta: {
    seeds: string[];
    org: string;
    totalNodes: number;
    maxDepth: number;
}): void;
/**
 * Writes managed package prerequisites to package-prerequisites.json.
 */
export declare function writePackagePrerequisites(outputDir: string, prerequisites: ManagedPackagePrerequisite[]): void;
/**
 * Writes the transformation log to transformation-log.json.
 */
export declare function writeTransformationLog(outputDir: string, log: TransformationLogEntry[]): void;
/**
 * Writes a snapshot of the config used for this run.
 * Useful for reproducibility — commit alongside output.
 */
export declare function writeConfigSnapshot(outputDir: string, config: ResolverConfig): void;
/**
 * Ensures the output directory and standard subdirectories exist.
 */
export declare function initOutputDir(outputDir: string): void;
//# sourceMappingURL=index.d.ts.map