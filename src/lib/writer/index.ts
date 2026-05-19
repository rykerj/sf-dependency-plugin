import * as fs from 'fs';
import * as path from 'path';
import { DependencyGraph, ManagedPackagePrerequisite, StubPackagePrerequisite } from '../../types/graph';
import { TransformationLogEntry } from '../transformer/objectTransformer';
import { ResolverConfig } from '../../types/config';

const PACKAGE_XML_VERSION = '61.0';

/**
 * Converts source-level identifiers into deployable metadata identifiers.
 */
function normalizeMetadataApiName(
  type: string,
  apiName: string
): string {

  // -------------------------------------------------------------------
  // Person Account field projections
  //
  // Apex:
  //   Account.MyField__pc
  //
  // Metadata API:
  //   Contact.MyField__c
  // -------------------------------------------------------------------

  if (
    type === 'CustomField' &&
    apiName.includes('.')
  ) {

    const [objectName, fieldName] =
      apiName.split('.');

    if (
      objectName === 'Account' &&
      fieldName.endsWith('__pc')
    ) {

      return `Contact.${fieldName.replace(/__pc$/, '__c')}`;
    }
  }

  return apiName;
}

/**
 * Groups deployable nodes by metadata type for package.xml generation.
 */
function groupByType(
  graph: DependencyGraph
): Map<string, string[]> {

  const groups = new Map<string, Set<string>>();

  for (const node of graph.nodes.values()) {

    if (node.isManagedPackage) {
      continue;
    }

    if (
      node.policy !== 'include' &&
      node.policy !== 'stub'
    ) {
      continue;
    }

    const normalizedApiName =
      normalizeMetadataApiName(
        node.type,
        node.apiName
      );

    const members =
      groups.get(node.type) ?? new Set<string>();

    members.add(normalizedApiName);

    groups.set(node.type, members);
  }

  // Convert Sets back to sorted arrays
  return new Map(
    Array.from(groups.entries()).map(
      ([type, members]) => [
        type,
        Array.from(members).sort()
      ]
    )
  );
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
 * Writes all package prerequisites to package-prerequisites.json.
 * Covers:
 *   - 1GP managed packages (identified via namespace prefix)
 *   - 2GP and unlocked packages (identified via stub directory)
 */
export function writePackagePrerequisites(
  outputDir: string,
  managedPackages: ManagedPackagePrerequisite[],
  stubPackages: StubPackagePrerequisite[]
): void {

  // Build a unified install order across both types
  const allPackageLabels = [
    ...managedPackages.map((p) => p.packageName),
    ...stubPackages.map((p) => p.packageLabel),
  ];

  const output = {
    /**
     * Managed packages identified by namespace prefix (1GP).
     * Install via: sf package install --package <PackageVersionId>
     */
    managedPackages,

    /**
     * Packages identified via stub directory (2GP, unlocked, or 1GP stubs).
     * Install via: sf package install --package <PackageVersionId>
     * The packageLabel corresponds to the subdirectory name in your stubDir.
     */
    stubPackages,

    /**
     * Suggested install order — alphabetical.
     * Review and adjust if packages have dependencies on each other.
     */
    installOrder: [...new Set(allPackageLabels)].sort(),
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