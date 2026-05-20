export interface TextDependency {
    type: string;
    apiName: string;
    referenceType: string;
}
export declare function analyzeApexFile(filePath: string): TextDependency[];
export declare function findApexFile(componentName: string, sourceDir: string, extension: 'cls' | 'trigger'): string | null;
export declare function analyzeFlowFile(filePath: string): TextDependency[];
export declare function analyzeValidationRuleFile(filePath: string): TextDependency[];
//# sourceMappingURL=textAnalyzer.d.ts.map