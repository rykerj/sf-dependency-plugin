export interface TextDependency {
    type: string;
    apiName: string;
    referenceType: string;
}
/**
 * Analyzes a local Apex class or trigger file for dependencies.
 * Uses regex-based AST approximation — not a full parser.
 *
 * Fixed bugs:
 *   - __c/__r names no longer misclassified as ApexClass
 *   - Variable names no longer confused with class names
 *   - extends / implements now captured
 *   - List<MyObject__c> correctly emitted as CustomObject not ApexClass
 *
 * Known remaining gaps:
 *   - Type.forName() dynamic instantiation
 *   - String-concatenated or dynamic SOQL
 *   - Property chains deeper than two levels
 */
export declare function analyzeApexFile(filePath: string): TextDependency[];
/**
 * Analyzes a ValidationRule XML for field references.
 */
export declare function analyzeValidationRuleFile(filePath: string): TextDependency[];
/**
 * Scans a directory recursively for Apex files matching a component name.
 */
export declare function findApexFile(componentName: string, sourceDir: string, extension: 'cls' | 'trigger'): string | null;
//# sourceMappingURL=textAnalyzer.d.ts.map