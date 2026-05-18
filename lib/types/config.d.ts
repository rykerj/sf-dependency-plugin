export type PolicyValue = 'include' | 'stub' | 'exclude';
export type FieldPolicy = 'referenced-only' | 'all';
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
}
export declare const DEFAULT_POLICIES: PolicyMap;
export declare const DEFAULT_CONFIG: Partial<ResolverConfig>;
//# sourceMappingURL=config.d.ts.map