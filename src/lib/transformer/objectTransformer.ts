import * as fs from 'fs';
import { parseXml, buildXml } from './xmlUtils';
import { stubRecordType, stubListView } from './stubFactory';
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
export function transformObjectMetadata(
  filePath: string,
  policies: PolicyMap,
  resolvedComponents: Set<string>,    // Set of "Type:ApiName" in manifest
  resolvedFields: Set<string>,        // Set of "ObjectName.FieldName" in manifest
  log: TransformationLogEntry[]
): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = parseXml(content);
  const obj = parsed.CustomObject ?? parsed;
  const shortPath = filePath.split('/force-app')[1] ?? filePath;

  // --- ActionOverrides
  if (Array.isArray(obj.actionOverrides)) {
    obj.actionOverrides = obj.actionOverrides.filter((ao: any) => {
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
      obj.recordTypes = obj.recordTypes.map((rt: any) => {
        log.push({
          file: shortPath,
          element: `recordTypes[${rt.fullName}]`,
          action: 'stubbed',
          reason: 'RecordType policy: stub — picklist and layout assignments removed',
        });
        return stubRecordType({
          fullName: rt.fullName,
          label: rt.label,
          active: rt.active !== 'false',
        });
      });
    } else if (policies.RecordType === 'exclude') {
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
      obj.listViews = obj.listViews.map((lv: any) => {
        const allowedColumns = Array.isArray(lv.columns)
          ? lv.columns.filter((col: string) => {
              if (!col.includes('__c')) return true; // Standard fields always allowed
              return resolvedFields.has(`${objectName}.${col}`);
            })
          : [];

        log.push({
          file: shortPath,
          element: `listViews[${lv.fullName}]`,
          action: 'stubbed',
          reason: `ListView policy: stub — columns scoped to resolved field manifest (${allowedColumns.length} kept)`,
        });

        return stubListView({
          fullName: lv.fullName,
          label: lv.label,
          filterScope: lv.filterScope,
          allowedFields: allowedColumns,
        });
      });
    } else if (policies.ListView === 'exclude') {
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

  return buildXml({ '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' }, CustomObject: obj });
}

function extractObjectName(filePath: string): string {
  // Extract object name from path like .../objects/MyObject__c/MyObject__c.object-meta.xml
  const parts = filePath.split('/');
  const objectsIdx = parts.indexOf('objects');
  if (objectsIdx >= 0 && parts[objectsIdx + 1]) {
    return parts[objectsIdx + 1];
  }
  return '';
}