"use strict";
/**
 * Generates minimum viable stub structures for components with policy 'stub'.
 * Stubs satisfy Salesforce deployment validation without pulling in
 * the full dependency tree of the stubbed component.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stubRecordType = stubRecordType;
exports.stubListView = stubListView;
/**
 * Generates a stubbed RecordType XML object.
 * Strips: picklistValues, layoutAssignments, compactLayoutAssignment, businessProcess.
 * Keeps: fullName, label, active.
 */
function stubRecordType(input) {
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
function stubListView(input) {
    return {
        fullName: input.fullName,
        filterScope: input.filterScope ?? 'Everything',
        label: input.label,
        columns: input.allowedFields.length > 0 ? input.allowedFields : ['NAME'],
    };
}
//# sourceMappingURL=stubFactory.js.map