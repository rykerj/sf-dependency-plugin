import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { DependencyGraph } from '../../types/graph';
import { parseXml } from '../transformer/xmlUtils';

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
export async function retrieveAndDiff(
  org: string,
  packageXmlPath: string,
  retrieveDir: string
): Promise<RetrievalResult> {

  fs.mkdirSync(retrieveDir, { recursive: true });

  try {
    execSync(
      `sf project retrieve start ` +
        `--target-org ${org} ` +
        `--manifest ${packageXmlPath} ` +
        `--output-dir ${retrieveDir}`,
      { stdio: 'inherit' }
    );
  } catch (err: any) {
    throw new Error(`Retrieval failed: ${err.message}`);
  }

  // Parse the requested manifest to know what we asked for
  const requestedComponents = parsePackageXml(packageXmlPath);

  // Diff against what actually landed on disk
  const missingComponents: MissingComponent[] = [];

  for (const { type, apiName } of requestedComponents) {
    const present = isComponentPresentOnDisk(type, apiName, retrieveDir);
    if (!present) {
      missingComponents.push({ type, apiName, reason: 'not-in-org' });
    }
  }

  return { retrievedDir: retrieveDir, missingComponents };
}

/**
 * Phase 2.5: Prune the dependency graph of anything that did not come back
 * from the org. This is the final ground truth pass — if the org doesn't
 * have it, it has no business being in the manifest.
 *
 * Returns the list of pruned node IDs for logging.
 */
export function pruneGraphFromMissing(
  graph: DependencyGraph,
  missingComponents: MissingComponent[]
): string[] {
  const pruned: string[] = [];

  for (const { type, apiName } of missingComponents) {
    const nodeId = `${type}:${apiName}`;
    if (graph.nodes.has(nodeId)) {
      graph.nodes.delete(nodeId);
      pruned.push(nodeId);
    }
  }

  // Prune edges that reference deleted nodes
  const remainingIds = new Set(graph.nodes.keys());
  (graph as any).edges = graph.edges.filter(
    (e) => remainingIds.has(e.from) && remainingIds.has(e.to)
  );

  return pruned;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RequestedComponent {
  type: string;
  apiName: string;
}

function parsePackageXml(packageXmlPath: string): RequestedComponent[] {
  const content = fs.readFileSync(packageXmlPath, 'utf-8');
  const parsed = parseXml(content);
  const pkg = parsed.Package ?? parsed;
  const components: RequestedComponent[] = [];

  const types = Array.isArray(pkg.types) ? pkg.types : pkg.types ? [pkg.types] : [];

  for (const typeBlock of types) {
    const typeName = typeBlock.name;
    const members = Array.isArray(typeBlock.members)
      ? typeBlock.members
      : typeBlock.members
      ? [typeBlock.members]
      : [];

    for (const member of members) {
      components.push({ type: typeName, apiName: String(member) });
    }
  }

  return components;
}

/**
 * Checks whether a retrieved component is present on disk after retrieval.
 * Covers common SFDX source format paths. Unknown types fall back to a
 * directory walk.
 */
function isComponentPresentOnDisk(
  type: string,
  apiName: string,
  retrieveDir: string
): boolean {
  const root = path.join(retrieveDir, 'force-app', 'main', 'default');

  switch (type) {
    case 'ApexClass':
      return fs.existsSync(path.join(root, 'classes', `${apiName}.cls`));

    case 'ApexTrigger':
      return fs.existsSync(path.join(root, 'triggers', `${apiName}.trigger`));

    case 'CustomObject':
      return fs.existsSync(
        path.join(root, 'objects', apiName, `${apiName}.object-meta.xml`)
      );

    case 'CustomField': {
      const parts = apiName.split('.');
      if (parts.length !== 2) return false;
      return fs.existsSync(
        path.join(root, 'objects', parts[0], 'fields', `${parts[1]}.field-meta.xml`)
      );
    }

    case 'ValidationRule': {
      const parts = apiName.split('.');
      if (parts.length !== 2) return false;
      return fs.existsSync(
        path.join(root, 'objects', parts[0], 'validationRules', `${parts[1]}.validationRule-meta.xml`)
      );
    }

    case 'RecordType': {
      const parts = apiName.split('.');
      if (parts.length !== 2) return false;
      return fs.existsSync(
        path.join(root, 'objects', parts[0], 'recordTypes', `${parts[1]}.recordType-meta.xml`)
      );
    }

    case 'FlexiPage':
      return fs.existsSync(path.join(root, 'flexipages', `${apiName}.flexipage-meta.xml`));

    case 'Flow':
      return fs.existsSync(path.join(root, 'flows', `${apiName}.flow-meta.xml`));

    case 'Layout':
      return fs.existsSync(path.join(root, 'layouts', `${apiName}.layout-meta.xml`));

    case 'PermissionSet':
      return fs.existsSync(
        path.join(root, 'permissionsets', `${apiName}.permissionset-meta.xml`)
      );

    case 'CustomTab':
      return fs.existsSync(path.join(root, 'tabs', `${apiName}.tab-meta.xml`));

    case 'StaticResource':
      return (
        fs.existsSync(path.join(root, 'staticresources', `${apiName}.resource-meta.xml`)) ||
        fs.existsSync(path.join(root, 'staticresources', apiName))
      );

    default:
      // Unknown type — walk and look for any file containing the apiName
      return fileExistsAnywhere(root, apiName);
  }
}

function fileExistsAnywhere(dir: string, apiName: string): boolean {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fileExistsAnywhere(full, apiName)) return true;
    } else if (entry.name.includes(apiName)) {
      return true;
    }
  }
  return false;
}