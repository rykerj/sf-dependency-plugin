export type PolicyValue = 'include' | 'stub' | 'exclude';
export type FieldPolicy = 'referenced-only' | 'all';
/**
 * Controls when the Tooling API is used during resolution.
 *
 * 'never'              — Local source only. Missing components are classified
 *                        (managed/inner/false-positive) and skipped. No API calls
 *                        at any point including package name lookup. Default when
 *                        useLocalSource is true.
 *
 * 'package-names-only' — Local source drives graph building. Tooling API is used
 *                        only to resolve human-readable managed package names from
 *                        namespace prefixes. No graph-building API calls.
 *
 * 'supplement'         — Tooling API runs after local text analysis to catch
 *                        dependencies that regex missed. Use when local source is
 *                        incomplete. Counts against daily API budget.
 *
 * 'primary'            — Tooling API is the primary resolution source. Local source
 *                        not used. Use when you have not done a full retrieve.
 */
export type ToolingApiMode = 'never' | 'package-names-only' | 'supplement' | 'primary';
export interface PolicyMap {
    ApexClass?: PolicyValue;
    ApexTrigger?: PolicyValue;
    CustomObject?: PolicyValue;
    CustomField?: PolicyValue;
    RecordType?: PolicyValue;
    ValidationRule?: PolicyValue;
    FlexiPage?: PolicyValue;
    ActionOverride?: PolicyValue;
    Layout?: PolicyValue;
    CompactLayout?: PolicyValue;
    ListView?: PolicyValue;
    Flow?: PolicyValue;
    CustomTab?: PolicyValue;
    [key: string]: PolicyValue | undefined;
}
export interface ResolverConfig {
    seeds: string[];
    org: string;
    useLocalSource: boolean;
    localSourceDir: string;
    maxDepth: number;
    outputDir: string;
    policies: PolicyMap;
    fieldPolicy: FieldPolicy;
    /**
     * Controls Tooling API usage. Defaults to 'never' when useLocalSource is true,
     * 'primary' when useLocalSource is false.
     */
    toolingApiMode: ToolingApiMode;
    /**
     * Optional path to a directory of Apex stub files from installed packages.
     * Used to identify package components (1GP, 2GP, and unlocked packages without
     * a namespace) that should not be included in the deployment manifest.
     *
     * Expected layout:
     *   stubDir/
     *     PackageLabel/
     *       SomeClass.cls
     *       AnotherClass.cls
     *
     * Any class or trigger found in the stub directory is treated as a package
     * dependency — excluded from the manifest and surfaced in package-prerequisites.json.
     * This is the primary mechanism for detecting 2GP and unlocked package components
     * that have no namespace prefix to identify them automatically.
     */
    stubDir?: string;
}
export declare const DEFAULT_POLICIES: PolicyMap;
export declare const DEFAULT_CONFIG: Partial<ResolverConfig>;
//# sourceMappingURL=config.d.ts.map