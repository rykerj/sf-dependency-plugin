import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a package component discovered via the stub directory.
 * Covers 1GP (namespace prefix), 2GP (no namespace, identified by stub),
 * and unlocked packages (no namespace).
 */
export interface StubPackageComponent {
  apiName: string;
  type: 'ApexClass' | 'ApexTrigger';
  /**
   * Package label — derived from the stub subdirectory name.
   * Stub directories should be organized as:
   *   stubDir/
   *     FinancialServicesCloud/    <- package label
   *       FinServClass.cls
   *     ApexEnterprisePatterns/
   *       fflib_Application.cls
   *     MyUnlockedPackage/         <- 2GP / unlocked — no namespace needed
   *       SomeClass.cls
   */
  packageLabel: string;
  /**
   * Namespace prefix if detectable from the filename (e.g. fflib__ prefix).
   * Null for 2GP / unlocked packages with no namespace.
   */
  namespace: string | null;
}

export interface StubDirectoryIndex {
  /** Map of lowercased class/trigger name → StubPackageComponent */
  byName: Map<string, StubPackageComponent>;
  /** Map of package label → list of components in that package */
  byPackage: Map<string, StubPackageComponent[]>;
}

/**
 * Scans a stub directory and builds an index of all package components.
 *
 * Expected layout:
 *   stubDir/
 *     PackageName/
 *       MyClass.cls
 *       MyClass.cls-meta.xml   (optional — ignored)
 *       MyTrigger.trigger
 *
 * The top-level subdirectory name becomes the packageLabel.
 * Namespace is inferred from the filename if it contains __ with no __c suffix.
 */
export function buildStubDirectoryIndex(stubDir: string): StubDirectoryIndex {
  const index: StubDirectoryIndex = {
    byName: new Map(),
    byPackage: new Map(),
  };

  if (!stubDir || !fs.existsSync(stubDir)) {
    return index;
  }

  const packageDirs = fs.readdirSync(stubDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  for (const pkgDir of packageDirs) {
    const packageLabel = pkgDir.name;
    const pkgPath = path.join(stubDir, packageLabel);
    const components: StubPackageComponent[] = [];

    const files = fs.readdirSync(pkgPath, { withFileTypes: true })
      .filter((e) => e.isFile());

    for (const file of files) {
      const ext = path.extname(file.name);
      const baseName = path.basename(file.name, ext);

      // Skip meta XML files
      if (file.name.endsWith('-meta.xml')) continue;

      let type: 'ApexClass' | 'ApexTrigger' | null = null;
      if (ext === '.cls') type = 'ApexClass';
      else if (ext === '.trigger') type = 'ApexTrigger';
      else continue;

      // Infer namespace from filename:
      //   fflib__Application.cls   -> namespace = 'fflib'
      //   SomeClass.cls            -> namespace = null (2GP / unlocked)
      const parts = baseName.split('__');
      const namespace =
        parts.length >= 2 && !baseName.endsWith('__c')
          ? parts[0]
          : null;

      const component: StubPackageComponent = {
        apiName: baseName,
        type,
        packageLabel,
        namespace,
      };

      // Index by lowercased name for case-insensitive lookup
      index.byName.set(baseName.toLowerCase(), component);

      components.push(component);
    }

    if (components.length > 0) {
      index.byPackage.set(packageLabel, components);
    }
  }

  return index;
}

/**
 * Looks up a component by name in the stub index.
 * Case-insensitive.
 */
export function findInStubIndex(
  apiName: string,
  index: StubDirectoryIndex
): StubPackageComponent | null {
  return index.byName.get(apiName.toLowerCase()) ?? null;
}

/**
 * Summarizes which packages are required based on the components
 * found in the stub index during resolution.
 */
export function buildStubPackagePrerequisites(
  requiredComponents: StubPackageComponent[]
): Array<{ packageLabel: string; namespace: string | null; components: string[] }> {
  const grouped = new Map<string, { namespace: string | null; components: string[] }>();

  for (const comp of requiredComponents) {
    const existing = grouped.get(comp.packageLabel);
    if (existing) {
      existing.components.push(comp.apiName);
    } else {
      grouped.set(comp.packageLabel, {
        namespace: comp.namespace,
        components: [comp.apiName],
      });
    }
  }

  return Array.from(grouped.entries()).map(([packageLabel, info]) => ({
    packageLabel,
    namespace: info.namespace,
    components: info.components.sort(),
  }));
}