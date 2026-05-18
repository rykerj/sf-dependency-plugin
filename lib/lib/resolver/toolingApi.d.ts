import { TextDependency } from './textAnalyzer';
export interface ToolingApiClient {
    query<T>(soql: string): Promise<{
        records: T[];
    }>;
}
export interface MetadataComponentDependencyRecord {
    MetadataComponentId: string;
    MetadataComponentName: string;
    MetadataComponentType: string;
    RefMetadataComponentId: string;
    RefMetadataComponentName: string;
    RefMetadataComponentType: string;
}
export interface InstalledPackageRecord {
    SubscriberPackage: {
        Name: string;
        NamespacePrefix: string;
    };
}
export declare const BUDGET_WARN = 500;
export declare const BUDGET_CONFIRM = 1000;
export declare const BUDGET_ABORT = 2000;
export declare class ToolingApiResolver {
    private client;
    private queryCount;
    private onConfirmPrompt;
    private onWarn;
    constructor(client: ToolingApiClient, options: {
        onConfirmPrompt: (count: number) => Promise<boolean>;
        onWarn: (message: string) => void;
    });
    getQueryCount(): number;
    /**
     * Fetches direct forward dependencies for a component from MetadataComponentDependency.
     * Handles budget thresholds: warn at 500, confirm at 1000, hard abort at 2000.
     */
    getDependencies(componentName: string, componentType: string): Promise<TextDependency[]>;
    /**
     * Resolves a managed package name from its namespace prefix
     * using InstalledSubscriberPackage.
     */
    resolvePackageName(namespace: string): Promise<string>;
    private checkBudget;
}
//# sourceMappingURL=toolingApi.d.ts.map