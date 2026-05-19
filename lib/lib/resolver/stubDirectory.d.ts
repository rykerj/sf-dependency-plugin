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
export declare function buildStubDirectoryIndex(stubDir: string): StubDirectoryIndex;
/**
 * Looks up a component by name in the stub index.
 * Case-insensitive.
 */
export declare function findInStubIndex(apiName: string, index: StubDirectoryIndex): StubPackageComponent | null;
/**
 * Summarizes which packages are required based on the components
 * found in the stub index during resolution.
 */
export declare function buildStubPackagePrerequisites(requiredComponents: StubPackageComponent[]): Array<{
    packageLabel: string;
    namespace: string | null;
    components: string[];
}>;
//# sourceMappingURL=stubDirectory.d.ts.map