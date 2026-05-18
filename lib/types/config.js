"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.DEFAULT_POLICIES = void 0;
exports.DEFAULT_POLICIES = {
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
exports.DEFAULT_CONFIG = {
    useLocalSource: true,
    localSourceDir: './force-app/main/default',
    maxDepth: 10,
    fieldPolicy: 'referenced-only',
    policies: exports.DEFAULT_POLICIES,
};
//# sourceMappingURL=config.js.map