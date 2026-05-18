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
  allowedFields: string[]; // Only columns in the resolved field manifest
}

/**
 * Generates a stubbed RecordType XML object.
 * Strips: picklistValues, layoutAssignments, compactLayoutAssignment, businessProcess.
 * Keeps: fullName, label, active.
 */
export function stubRecordType(input: RecordTypeInput): object {
  return {
    fullName: input.fullName,
    active: input.active !== false ? 'true' : 'false',
    label: input.label,
    // All picklist assignments, layout assignments, and compact layout assignments stripped
  };
}

/**
 * Generates a stubbed ListView XML object.
 * Strips columns that reference fields not in the resolved field manifest.
 */
export function stubListView(input: ListViewInput): object {
  return {
    fullName: input.fullName,
    filterScope: input.filterScope ?? 'Everything',
    label: input.label,
    columns: input.allowedFields.length > 0 ? input.allowedFields : ['NAME'],
  };
}