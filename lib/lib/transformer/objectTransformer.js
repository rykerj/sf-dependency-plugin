"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformObjectMetadata = transformObjectMetadata;
const fs = __importStar(require("fs"));
const xmlUtils_1 = require("./xmlUtils");
const stubFactory_1 = require("./stubFactory");
/**
 * Transforms a .object-meta.xml file by:
 * - Stripping actionOverrides referencing excluded FlexiPages or Apex classes
 * - Stripping compactLayouts if policy is exclude
 * - Stubbing recordTypes (removing layout/picklist assignments)
 * - Stripping or scoping listViews to resolved fields only
 * - Keeping validationRules always (per spec — never strip)
 */
function transformObjectMetadata(filePath, policies, resolvedComponents, // Set of "Type:ApiName" in manifest
resolvedFields, // Set of "ObjectName.FieldName" in manifest
log) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = (0, xmlUtils_1.parseXml)(content);
    const obj = parsed.CustomObject ?? parsed;
    const shortPath = filePath.split('/force-app')[1] ?? filePath;
    // --- ActionOverrides
    if (Array.isArray(obj.actionOverrides)) {
        obj.actionOverrides = obj.actionOverrides.filter((ao) => {
            const content = ao.content ?? '';
            const type = ao.type ?? '';
            // Strip FlexiPage action overrides if policy is exclude
            if (type === 'Flexipage' && policies.FlexiPage === 'exclude') {
                log.push({
                    file: shortPath,
                    element: `actionOverrides[${ao.actionName}]`,
                    action: 'stripped',
                    reason: `References FlexiPage '${content}' — policy: exclude`,
                });
                return false;
            }
            // Strip Apex action overrides if the class is not in the resolved manifest
            if (type === 'Default' && content) {
                const classKey = `ApexClass:${content}`;
                if (!resolvedComponents.has(classKey) && policies.ActionOverride === 'exclude') {
                    log.push({
                        file: shortPath,
                        element: `actionOverrides[${ao.actionName}]`,
                        action: 'stripped',
                        reason: `References ApexClass '${content}' not in resolved manifest — policy: exclude`,
                    });
                    return false;
                }
            }
            log.push({
                file: shortPath,
                element: `actionOverrides[${ao.actionName}]`,
                action: 'kept',
                reason: 'Component in resolved manifest or policy is include',
            });
            return true;
        });
    }
    // --- CompactLayouts
    if (Array.isArray(obj.compactLayouts) && policies.CompactLayout === 'exclude') {
        for (const cl of obj.compactLayouts) {
            log.push({
                file: shortPath,
                element: `compactLayouts[${cl.fullName ?? 'unknown'}]`,
                action: 'stripped',
                reason: 'CompactLayout policy: exclude',
            });
        }
        obj.compactLayouts = [];
    }
    // --- RecordTypes — stub if policy is stub
    if (Array.isArray(obj.recordTypes)) {
        if (policies.RecordType === 'stub') {
            obj.recordTypes = obj.recordTypes.map((rt) => {
                log.push({
                    file: shortPath,
                    element: `recordTypes[${rt.fullName}]`,
                    action: 'stubbed',
                    reason: 'RecordType policy: stub — picklist and layout assignments removed',
                });
                return (0, stubFactory_1.stubRecordType)({
                    fullName: rt.fullName,
                    label: rt.label,
                    active: rt.active !== 'false',
                });
            });
        }
        else if (policies.RecordType === 'exclude') {
            for (const rt of obj.recordTypes) {
                log.push({
                    file: shortPath,
                    element: `recordTypes[${rt.fullName}]`,
                    action: 'stripped',
                    reason: 'RecordType policy: exclude',
                });
            }
            obj.recordTypes = [];
        }
    }
    // --- ListViews — stub to only include resolved fields
    if (Array.isArray(obj.listViews)) {
        if (policies.ListView === 'stub') {
            const objectName = extractObjectName(filePath);
            obj.listViews = obj.listViews.map((lv) => {
                const allowedColumns = Array.isArray(lv.columns)
                    ? lv.columns.filter((col) => {
                        if (!col.includes('__c'))
                            return true; // Standard fields always allowed
                        return resolvedFields.has(`${objectName}.${col}`);
                    })
                    : [];
                log.push({
                    file: shortPath,
                    element: `listViews[${lv.fullName}]`,
                    action: 'stubbed',
                    reason: `ListView policy: stub — columns scoped to resolved field manifest (${allowedColumns.length} kept)`,
                });
                return (0, stubFactory_1.stubListView)({
                    fullName: lv.fullName,
                    label: lv.label,
                    filterScope: lv.filterScope,
                    allowedFields: allowedColumns,
                });
            });
        }
        else if (policies.ListView === 'exclude') {
            for (const lv of obj.listViews) {
                log.push({
                    file: shortPath,
                    element: `listViews[${lv.fullName}]`,
                    action: 'stripped',
                    reason: 'ListView policy: exclude',
                });
            }
            obj.listViews = [];
        }
    }
    // --- ValidationRules: ALWAYS kept per spec — log but never strip
    if (Array.isArray(obj.validationRules)) {
        for (const vr of obj.validationRules) {
            log.push({
                file: shortPath,
                element: `validationRules[${vr.fullName}]`,
                action: 'kept',
                reason: 'ValidationRule policy: include always — never stripped (would alter org behavior)',
            });
        }
    }
    return (0, xmlUtils_1.buildXml)({ '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' }, CustomObject: obj });
}
function extractObjectName(filePath) {
    // Extract object name from path like .../objects/MyObject__c/MyObject__c.object-meta.xml
    const parts = filePath.split('/');
    const objectsIdx = parts.indexOf('objects');
    if (objectsIdx >= 0 && parts[objectsIdx + 1]) {
        return parts[objectsIdx + 1];
    }
    return '';
}
//# sourceMappingURL=objectTransformer.js.map