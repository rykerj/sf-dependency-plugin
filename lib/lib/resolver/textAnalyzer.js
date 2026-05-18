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
exports.analyzeApexFile = analyzeApexFile;
exports.analyzeFlowFile = analyzeFlowFile;
exports.analyzeValidationRuleFile = analyzeValidationRuleFile;
exports.findApexFile = findApexFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
function analyzeApexFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const raw = fs.readFileSync(filePath, 'utf-8');
    // Strip comments first to avoid matching identifiers inside commented-out code
    const source = stripComments(raw);
    let match;
    // -------------------------------------------------------------------------
    // FIX Bug 3: Class declarations — extends and implements
    // Handles: public [abstract|virtual] class Foo extends Bar implements IFoo, IBar
    // -------------------------------------------------------------------------
    const classDeclarationRegex = /\bclass\s+\w[\w]*(?:\s+extends\s+([\w]+))?(?:\s+implements\s+([\w\s,]+))?(?:\s*\{)/g;
    while ((match = classDeclarationRegex.exec(source)) !== null) {
        if (match[1] && !isApexKeyword(match[1]) && !isCustomMetadataName(match[1])) {
            deps.push({ type: 'ApexClass', apiName: match[1].trim(), referenceType: 'Extends' });
        }
        if (match[2]) {
            for (const iface of match[2].split(',')) {
                const name = iface.trim();
                if (name && !isApexKeyword(name) && !isCustomMetadataName(name)) {
                    deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Implements' });
                }
            }
        }
    }
    // -------------------------------------------------------------------------
    // Apex class instantiation: new MyClass() or new MyClass{
    // FIX Bug 1: Skip __c/__r names — those are SObject constructors
    // -------------------------------------------------------------------------
    const instantiationRegex = /\bnew\s+([\w]+)\s*[({]/g;
    while ((match = instantiationRegex.exec(source)) !== null) {
        const name = match[1];
        if (isCustomMetadataName(name))
            continue;
        if (!isApexKeyword(name)) {
            deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Instantiation' });
        }
    }
    // -------------------------------------------------------------------------
    // Static method calls: MyClass.someMethod(
    // FIX Bug 2: Guard against __c/__r names and SF namespaces
    // -------------------------------------------------------------------------
    const staticCallRegex = /\b([A-Z][\w]*)\.[\w]+\s*\(/g;
    while ((match = staticCallRegex.exec(source)) !== null) {
        const className = match[1];
        if (isCustomMetadataName(className))
            continue;
        if (isApexKeyword(className))
            continue;
        if (isSalesforceNamespace(className))
            continue;
        deps.push({ type: 'ApexClass', apiName: className, referenceType: 'StaticMethodCall' });
    }
    // -------------------------------------------------------------------------
    // Generic type parameters: List<MyClass>, Map<String, MyClass>
    // FIX Bug 4: __c/__r names emit as CustomObject not ApexClass
    // -------------------------------------------------------------------------
    const genericTypeRegex = /\b(?:List|Set|Map|Iterable|Iterator)<([\w,\s]+)>/g;
    while ((match = genericTypeRegex.exec(source)) !== null) {
        for (const param of match[1].split(',')) {
            const name = param.trim();
            if (!name)
                continue;
            if (isCustomMetadataName(name)) {
                deps.push({ type: 'CustomObject', apiName: name, referenceType: 'GenericTypeObject' });
            }
            else if (!isApexKeyword(name) && !isPrimitiveType(name)) {
                deps.push({ type: 'ApexClass', apiName: name, referenceType: 'GenericTypeClass' });
            }
        }
    }
    // -------------------------------------------------------------------------
    // 1. Map Variables to Object Types
    // -------------------------------------------------------------------------
    // We must track variable declarations so we know `myVar` = `MyObject__c`
    const varMap = new Map();
    // Single declarations: MyObject__c myVar = ...
    const objectTypeRegex = /\b([\w]+__c)\s+([a-zA-Z_]\w*)\b/g;
    while ((match = objectTypeRegex.exec(source)) !== null) {
        varMap.set(match[2], match[1]);
        deps.push({ type: 'CustomObject', apiName: match[1], referenceType: 'TypeDeclaration' });
    }
    // Collection declarations: List<MyObject__c> myVars = ...
    const listDecRegex = /(?:List|Set)<([\w]+__c)>\s+([a-zA-Z_]\w*)\b/g;
    while ((match = listDecRegex.exec(source)) !== null) {
        varMap.set(match[2], match[1]);
    }
    // -------------------------------------------------------------------------
    // 2. SOQL SELECT & FROM — Contextualized
    // -------------------------------------------------------------------------
    // Capture BOTH the select body and the target object in one go
    const soqlSelectRegex = /\bSELECT\s+([\s\S]*?)\s+FROM\s+([\w]+)/gi;
    while ((match = soqlSelectRegex.exec(source)) !== null) {
        const selectBody = match[1];
        const fromObject = match[2];
        // Push the object dependency
        if (fromObject.endsWith('__c')) {
            deps.push({ type: 'CustomObject', apiName: fromObject, referenceType: 'SoqlFrom' });
        }
        // Parse the fields and strictly format as ObjectName.FieldName__c
        for (const field of selectBody.split(',')) {
            const cleanField = field.trim().split(/\s+/)[0];
            if (cleanField.endsWith('__c') || cleanField.endsWith('__r')) {
                deps.push({
                    type: 'CustomField',
                    apiName: `${fromObject}.${cleanField}`,
                    referenceType: 'SoqlSelect'
                });
            }
        }
    }
    // -------------------------------------------------------------------------
    // 3. Dot-notation field access (Contextualized)
    // -------------------------------------------------------------------------
    // Capture the variable name and the field: someVar.MyField__c
    const dotFieldRegex = /\b([a-zA-Z_]\w*)\.([\w]+__(?:c|r))\b/g;
    while ((match = dotFieldRegex.exec(source)) !== null) {
        const varName = match[1];
        const fieldName = match[2];
        // Look up the object type from our mapping
        const objectName = varMap.get(varName);
        if (objectName) {
            deps.push({
                type: 'CustomField',
                apiName: `${objectName}.${fieldName}`,
                referenceType: 'FieldAccess'
            });
        }
        else {
            // NOTE: If we can't find the variable type (e.g., generic SObject or Trigger.new), 
            // we bypass it here. The Tooling API fallback (Phase 2) will catch it.
        }
    }
    return deduplicateDeps(deps);
}
/**
 * Analyzes a Flow metadata XML file for object and field references.
 */
function analyzeFlowFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const source = fs.readFileSync(filePath, 'utf-8');
    let match;
    const objectRegex = /<object>([\w]+(?:__c)?)<\/object>/g;
    while ((match = objectRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomObject', apiName: match[1], referenceType: 'FlowObject' });
    }
    const fieldRegex = /<field>([\w]+__c)<\/field>/g;
    while ((match = fieldRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'FlowField' });
    }
    return deduplicateDeps(deps);
}
/**
 * Analyzes a ValidationRule XML for field references.
 */
function analyzeValidationRuleFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const source = fs.readFileSync(filePath, 'utf-8');
    let match;
    const formulaFieldRegex = /\b([\w]+__c)\b/g;
    while ((match = formulaFieldRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'ValidationFormula' });
    }
    return deduplicateDeps(deps);
}
/**
 * Scans a directory recursively for Apex files matching a component name.
 */
function findApexFile(componentName, sourceDir, extension) {
    const classFile = `${componentName}.${extension}`;
    const directPath = path.join(sourceDir, extension === 'cls' ? 'classes' : 'triggers', classFile);
    if (fs.existsSync(directPath))
        return directPath;
    return walkDir(sourceDir, (f) => path.basename(f) === classFile);
}
// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------
/**
 * Strips // single-line and block comments from Apex source.
 * Preserves newlines for accurate line count.
 * Skips string literal content to avoid false positives.
 */
function stripComments(source) {
    let result = '';
    let i = 0;
    const len = source.length;
    while (i < len) {
        // String literal — skip interior
        if (source[i] === "'") {
            result += source[i++];
            while (i < len && source[i] !== "'") {
                if (source[i] === '\\')
                    result += source[i++];
                result += source[i++];
            }
            if (i < len)
                result += source[i++];
            continue;
        }
        // Block comment /* ... */
        if (source[i] === '/' && source[i + 1] === '*') {
            i += 2;
            while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
                result += source[i] === '\n' ? '\n' : ' ';
                i++;
            }
            i += 2;
            continue;
        }
        // Single-line comment // ...
        if (source[i] === '/' && source[i + 1] === '/') {
            while (i < len && source[i] !== '\n')
                i++;
            continue;
        }
        result += source[i++];
    }
    return result;
}
function walkDir(dir, predicate) {
    if (!fs.existsSync(dir))
        return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const result = walkDir(full, predicate);
            if (result)
                return result;
        }
        else if (predicate(full)) {
            return full;
        }
    }
    return null;
}
function deduplicateDeps(deps) {
    const seen = new Set();
    return deps.filter((d) => {
        const key = `${d.type}:${d.apiName}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
/**
 * True if the name contains __ — indicates custom/managed SObject, field,
 * or custom metadata type rather than a plain Apex class name.
 */
function isCustomMetadataName(name) {
    return name.includes('__');
}
function isApexKeyword(name) {
    const keywords = new Set([
        'String', 'Integer', 'Long', 'Double', 'Boolean', 'Date', 'DateTime',
        'Time', 'Blob', 'ID', 'Object', 'Decimal', 'void', 'null', 'true', 'false',
        'System', 'Math', 'JSON', 'Limits', 'UserInfo', 'Schema', 'Database',
        'Test', 'Assert', 'Exception', 'SObject', 'List', 'Set', 'Map', 'Iterator',
        'Iterable', 'Type', 'Trigger', 'ApexPages', 'PageReference',
        'HttpRequest', 'HttpResponse', 'Http', 'Url', 'Label', 'Flow',
    ]);
    return keywords.has(name);
}
function isSalesforceNamespace(name) {
    const namespaces = new Set([
        'System', 'Schema', 'Database', 'Test', 'Math', 'JSON', 'Limits',
        'UserInfo', 'ApexPages', 'Messaging', 'ConnectApi', 'EventBus',
        'TriggerOperation', 'LoggingLevel', 'StatusCode',
    ]);
    return namespaces.has(name);
}
function isPrimitiveType(name) {
    const primitives = new Set([
        'String', 'Integer', 'Long', 'Double', 'Boolean', 'Date',
        'DateTime', 'Time', 'Blob', 'ID', 'Object', 'Decimal', 'SObject',
    ]);
    return primitives.has(name);
}
//# sourceMappingURL=textAnalyzer.js.map