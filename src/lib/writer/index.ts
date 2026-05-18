import * as fs from 'fs';
import * as path from 'path';
import { DependencyGraph, ManagedPackagePrerequisite } from '../../types/graph';
import { TransformationLogEntry } from '../transformer/objectTransformer';
import { ResolverConfig } from '../../types/config';

const PACKAGE_XML_VERSION = '61.0';

/**
 * Groups deployable nodes by metadata type for package.xml generation.
 */
function groupByType(graph: DependencyGraph): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const node of graph.nodes.values()) {
    if (node.isManagedPackage) continue;
    if (node.policy !== 'include' && node.policy !== 'stub') continue;

    const members = groups.get(node.type) ?? [];
    members.push(node.apiName);
    groups.set(node.type, members);
  }

  return groups;
}

/**
 * Generates the final package.xml from the resolved dependency graph.
 */
export function writePackageXml(outputDir: string, graph: DependencyGraph): void {
  const groups = groupByType(graph);

  const typesXml = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, members]) => {
      const membersXml = members
        .sort()
        .map((m) => `        <members>${m}</members>`)
        .join('\n');
      return `    <types>\n${membersXml}\n        <name>${type}</name>\n    </types>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${typesXml}
    <version>${PACKAGE_XML_VERSION}</version>
</Package>`;

  fs.writeFileSync(path.join(outputDir, 'package.xml'), xml, 'utf-8');
}

/**
 * Writes the dependency graph as JSON for visualization and auditing.
 */
export function writeDependencyGraph(
  outputDir: string,
  graph: DependencyGraph,
  meta: {
    seeds: string[];
    org: string;
    totalNodes: number;
    maxDepth: number;
  }
): void {
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      ...meta,
    },
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
  };

  fs.writeFileSync(
    path.join(outputDir, 'dependency-graph.json'),
    JSON.stringify(output, null, 2),
    'utf-8'
  );
}

/**
 * Writes managed package prerequisites to package-prerequisites.json.
 */
export function writePackagePrerequisites(
  outputDir: string,
  prerequisites: ManagedPackagePrerequisite[]
): void {
  const output = {
    managedPackages: prerequisites,
    // Simple install order: alphabetical by package name
    // A future version could topologically sort based on package dependencies
    installOrder: [...new Set(prerequisites.map((p) => p.packageName))].sort(),
  };

  fs.writeFileSync(
    path.join(outputDir, 'package-prerequisites.json'),
    JSON.stringify(output, null, 2),
    'utf-8'
  );
}

/**
 * Writes the transformation log to transformation-log.json.
 */
export function writeTransformationLog(
  outputDir: string,
  log: TransformationLogEntry[]
): void {
  const output = {
    generatedAt: new Date().toISOString(),
    totalTransformations: log.length,
    transformations: log,
  };

  fs.writeFileSync(
    path.join(outputDir, 'transformation-log.json'),
    JSON.stringify(output, null, 2),
    'utf-8'
  );
}

/**
 * Writes a snapshot of the config used for this run.
 * Useful for reproducibility — commit alongside output.
 */
export function writeConfigSnapshot(outputDir: string, config: ResolverConfig): void {
  fs.writeFileSync(
    path.join(outputDir, 'resolver-config-snapshot.json'),
    JSON.stringify(config, null, 2),
    'utf-8'
  );
}

/**
 * Ensures the output directory and standard subdirectories exist.
 */
export function initOutputDir(outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
}