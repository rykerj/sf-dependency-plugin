export interface TextDependency {
    type: string;
    apiName: string;
    referenceType: string;
}
/**
 * Analyzes a local Apex class or trigger file for dependencies.
 * Uses regex-based AST approximation — not a full parser.
 * Known gaps: Type.forName(), dynamic SOQL, property chains > 2 deep.
 */
export declare function analyzeApexFile(filePath: string): TextDependency[];
/**
 * Analyzes a Flow metadata XML file for object and field references.
 * NOTE: Flow dependency data from MetadataComponentDependency is unreliable,
 * so we parse the XML directly when useLocalSource is true.
 */
export declare function analyzeFlowFile(filePath: string): TextDependency[];
/**
 * Analyzes a ValidationRule XML for field references.
 * Validation rules are always included (never stripped), but their
 * field references are added to the object's field inclusion list.
 */
export declare function analyzeValidationRuleFile(filePath: string): TextDependency[];
/**
 * Scans a directory recursively for Apex files matching a component name.
 */
export declare function findApexFile(componentName: string, sourceDir: string, extension: 'cls' | 'trigger'): string | null;
//# sourceMappingURL=textAnalyzer.d.ts.map