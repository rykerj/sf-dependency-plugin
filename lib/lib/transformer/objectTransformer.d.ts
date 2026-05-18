import { PolicyMap } from '../../types/config';
export interface TransformationLogEntry {
    file: string;
    element: string;
    action: 'stripped' | 'stubbed' | 'kept';
    reason: string;
}
/**
 * Transforms a .object-meta.xml file by:
 * - Stripping actionOverrides referencing excluded FlexiPages or Apex classes
 * - Stripping compactLayouts if policy is exclude
 * - Stubbing recordTypes (removing layout/picklist assignments)
 * - Stripping or scoping listViews to resolved fields only
 * - Keeping validationRules always (per spec — never strip)
 */
export declare function transformObjectMetadata(filePath: string, policies: PolicyMap, resolvedComponents: Set<string>, // Set of "Type:ApiName" in manifest
resolvedFields: Set<string>, // Set of "ObjectName.FieldName" in manifest
log: TransformationLogEntry[]): string;
//# sourceMappingURL=objectTransformer.d.ts.map