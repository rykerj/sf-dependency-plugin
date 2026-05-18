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

export const DEFAULT_POLICIES: PolicyMap = {
  ApexClass: 'include',
  ApexTrigger: 'include',
  CustomObject: 'include',
  CustomField: 'include',
  RecordType: 'stub',
  ValidationRule: 'include',
  FlexiPage: 'exclude',
  ActionOverride: 'exclude',
  Layout: 'exclude',
  CompactLayout: 'exclude',
  ListView: 'stub',
  Flow: 'exclude',
  CustomTab: 'exclude',
};

export const DEFAULT_CONFIG: Partial<ResolverConfig> = {
  useLocalSource: true,
  localSourceDir: './force-app/main/default',
  maxDepth: 10,
  fieldPolicy: 'referenced-only',
  policies: DEFAULT_POLICIES,
};