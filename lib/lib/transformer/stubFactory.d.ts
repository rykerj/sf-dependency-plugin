/**
 * Generates minimum viable stub structures for components with policy 'stub'.
 * Stubs satisfy Salesforce deployment validation without pulling in
 * the full dependency tree of the stubbed component.
 */
export interface RecordTypeInput {
    fullName: string;
    label: string;
    active?: boolean;
}
export interface ListViewInput {
    fullName: string;
    label: string;
    filterScope?: string;
    allowedFields: string[];
}
/**
 * Generates a stubbed RecordType XML object.
 * Strips: picklistValues, layoutAssignments, compactLayoutAssignment, businessProcess.
 * Keeps: fullName, label, active.
 */
export declare function stubRecordType(input: RecordTypeInput): object;
/**
 * Generates a stubbed ListView XML object.
 * Strips columns that reference fields not in the resolved field manifest.
 */
export declare function stubListView(input: ListViewInput): object;
//# sourceMappingURL=stubFactory.d.ts.map