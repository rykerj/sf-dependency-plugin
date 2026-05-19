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
    if (!fs.existsSync(filePath)) {
        return deps;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    // Strip comments first so we don't match commented-out code
    const source = stripComments(raw);
    let match;
    // -------------------------------------------------------------------------
    // Salesforce Standard Objects
    // -------------------------------------------------------------------------
    const STANDARD_OBJECTS = new Set([
        'Account',
        'Contact',
        'Lead',
        'Opportunity',
        'Case',
        'Task',
        'Event',
        'User',
        'Group',
        'Campaign',
        'Asset',
        'Contract',
        'Order',
        'OrderItem',
        'Pricebook2',
        'PricebookEntry',
        'Product2',
        'Quote',
        'QuoteLineItem',
        'Attachment',
        'Note',
        'FeedItem',
        'FeedComment',
        'ContentDocument',
        'ContentVersion',
        'ContentDocumentLink',
        'RecordType',
        'PermissionSet',
        'PermissionSetAssignment',
        'Profile',
        'CustomNotificationType',
        'EmailTemplate',
        'Pattern',
    ]);
    // -------------------------------------------------------------------------
    // Apex / Salesforce System Types
    // -------------------------------------------------------------------------
    const SYSTEM_TYPES = new Set([
        'System',
        'Database',
        'Schema',
        'Limits',
        'Messaging',
        'JSON',
        'Math',
        'Test',
        'Crypto',
        'EncodingUtil',
        'UserInfo',
        'RestContext',
        'RestRequest',
        'RestResponse',
        'Http',
        'HttpRequest',
        'HttpResponse',
        'XmlStreamReader',
        'XmlStreamWriter',
        'String',
        'Integer',
        'Long',
        'Double',
        'Decimal',
        'Boolean',
        'Date',
        'Datetime',
        'Time',
        'Blob',
        'Id',
        'Object',
        'Type'
    ]);
    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    function isStandardObject(name) {
        return STANDARD_OBJECTS.has(name);
    }
    function isSystemType(name) {
        return SYSTEM_TYPES.has(name);
    }
    function isCustomField(name) {
        return /__(c|r|pc)$/.test(name);
    }
    function isConstantLike(name) {
        return /^[A-Z][A-Z0-9_]*$/.test(name);
    }
    function classifySymbol(name) {
        if (!name) {
            return null;
        }
        if (isApexKeyword(name)) {
            return null;
        }
        if (isSalesforceNamespace(name)) {
            return null;
        }
        if (isSystemType(name)) {
            return null;
        }
        // Custom object / metadata / platform-ish names
        if (name.endsWith('__c') ||
            name.endsWith('__mdt') ||
            name.endsWith('__e') ||
            name.endsWith('__b') ||
            name.endsWith('__x') ||
            name.endsWith('__kav')) {
            return 'CustomObject';
        }
        if (isStandardObject(name)) {
            return 'StandardObject';
        }
        return 'ApexClass';
    }
    /**
   * True if this looks like an Apex inner class reference:
   *   Outer.Inner
   */
    function isInnerClassReference(name) {
        return /^[A-Z]\w*\.[A-Z]\w*$/.test(name);
    }
    /**
     * Converts:
     *   Outer.Inner -> Outer
     */
    function normalizeApexTypeName(name) {
        if (isInnerClassReference(name)) {
            return name.split('.')[0];
        }
        return name;
    }
    // -------------------------------------------------------------------------
    // Class declarations
    // Handles:
    //   class MyClass extends BaseClass implements IFoo, IBar
    // -------------------------------------------------------------------------
    const classDeclarationRegex = /\bclass\s+\w[\w]*(?:\s+extends\s+([\w]+))?(?:\s+implements\s+([\w\s,]+))?(?:\s*\{)/g;
    while ((match = classDeclarationRegex.exec(source)) !== null) {
        // extends
        if (match[1]) {
            const parentClass = match[1].trim();
            const symbolType = classifySymbol(parentClass);
            if (symbolType === 'ApexClass') {
                deps.push({
                    type: 'ApexClass',
                    apiName: parentClass,
                    referenceType: 'Extends'
                });
            }
        }
        // implements
        if (match[2]) {
            for (const iface of match[2].split(',')) {
                const ifaceName = iface.trim();
                const symbolType = classifySymbol(ifaceName);
                if (symbolType === 'ApexClass') {
                    deps.push({
                        type: 'ApexClass',
                        apiName: ifaceName,
                        referenceType: 'Implements'
                    });
                }
            }
        }
    }
    // -------------------------------------------------------------------------
    // Instantiation
    // Handles:
    //   new MyClass()
    //   new Account()
    //   new CustomObj__c()
    // -------------------------------------------------------------------------
    const instantiationRegex = /\bnew\s+([\w.]+)\s*[({]/g;
    while ((match = instantiationRegex.exec(source)) !== null) {
        const name = match[1];
        const symbolType = classifySymbol(name);
        if (symbolType) {
            deps.push({
                type: symbolType,
                apiName: name,
                referenceType: 'Instantiation'
            });
        }
    }
    // -------------------------------------------------------------------------
    // Static method calls
    // Handles:
    //   MyClass.someMethod()
    // Excludes:
    //   System.debug()
    //   Database.query()
    // -------------------------------------------------------------------------
    const staticCallRegex = /\b([A-Z][\w]*(?:\.[A-Z][\w]*)?)\.[\w]+\s*\(/g;
    while ((match = staticCallRegex.exec(source)) !== null) {
        const rawName = match[1];
        // ❌ Skip constants like DISTRIBUTION_LEAD_QUAL
        if (isConstantLike(rawName)) {
            continue;
        }
        const className = normalizeApexTypeName(rawName);
        const symbolType = classifySymbol(className);
        if (symbolType === 'ApexClass') {
            deps.push({
                type: 'ApexClass',
                apiName: className,
                referenceType: 'StaticMethodCall'
            });
        }
    }
    // -------------------------------------------------------------------------
    // Generic Types
    // Handles:
    //   List<Account>
    //   Set<MyObj__c>
    //   Map<Id, Account>
    // -------------------------------------------------------------------------
    const genericTypeRegex = /\b(?:List|Set|Iterable|Iterator)<([\w.]+)>|\bMap<([\w.]+)\s*,\s*([\w.]+)>/g;
    ;
    while ((match = genericTypeRegex.exec(source)) !== null) {
        const discoveredTypes = [];
        // List<T>, Set<T>, Iterable<T>, Iterator<T>
        if (match[1]) {
            discoveredTypes.push(match[1]);
        }
        // Map<K,V>
        if (match[2]) {
            discoveredTypes.push(match[2]);
        }
        if (match[3]) {
            discoveredTypes.push(match[3]);
        }
        for (const name of discoveredTypes) {
            if (!name) {
                continue;
            }
            if (isPrimitiveType(name)) {
                continue;
            }
            const symbolType = classifySymbol(name);
            if (symbolType) {
                deps.push({
                    type: symbolType,
                    apiName: name,
                    referenceType: 'GenericType'
                });
            }
        }
    }
    // -------------------------------------------------------------------------
    // Variable Type Tracking
    // Handles:
    //   Account acc;
    //   MyClass svc;
    //   MyObj__c obj;
    // -------------------------------------------------------------------------
    const varMap = new Map();
    const typeDeclarationRegex = /\b([A-Z][\w]*(?:\.[A-Z][\w]*)?)\s+([a-zA-Z_]\w*)\b/g;
    while ((match = typeDeclarationRegex.exec(source)) !== null) {
        const typeName = match[1];
        const variableName = match[2];
        varMap.set(variableName, typeName);
        const symbolType = classifySymbol(typeName);
        if (symbolType === 'CustomObject' ||
            symbolType === 'StandardObject') {
            deps.push({
                type: symbolType,
                apiName: typeName,
                referenceType: 'TypeDeclaration'
            });
        }
    }
    // -------------------------------------------------------------------------
    // Collection Variable Tracking
    // Handles:
    //   List<Account> accounts;
    //   Set<MyObj__c> objs;
    // -------------------------------------------------------------------------
    const collectionDeclarationRegex = /(?:List|Set|Iterable|Iterator)<([\w]+)>\s+([a-zA-Z_]\w*)\b/g;
    while ((match = collectionDeclarationRegex.exec(source)) !== null) {
        const typeName = match[1];
        const variableName = match[2];
        varMap.set(variableName, typeName);
        const symbolType = classifySymbol(typeName);
        if (symbolType === 'CustomObject' ||
            symbolType === 'StandardObject') {
            deps.push({
                type: symbolType,
                apiName: typeName,
                referenceType: 'CollectionDeclaration'
            });
        }
    }
    // -------------------------------------------------------------------------
    // SOQL SELECT / FROM
    // -------------------------------------------------------------------------
    const soqlSelectRegex = /\bSELECT\s+([\s\S]*?)\s+FROM\s+([\w]+)/gi;
    while ((match = soqlSelectRegex.exec(source)) !== null) {
        const selectBody = match[1];
        const fromObject = match[2];
        const objectType = classifySymbol(fromObject);
        if (objectType === 'CustomObject' ||
            objectType === 'StandardObject') {
            deps.push({
                type: objectType,
                apiName: fromObject,
                referenceType: 'SoqlFrom'
            });
        }
        for (const field of selectBody.split(',')) {
            const cleanField = field.trim().split(/\s+/)[0];
            if (isCustomField(cleanField)) {
                deps.push({
                    type: 'CustomField',
                    apiName: `${fromObject}.${cleanField}`,
                    referenceType: 'SoqlSelect'
                });
            }
        }
    }
    // -------------------------------------------------------------------------
    // Dot-notation field access
    // Handles:
    //   acc.CustomField__c
    //   acc.CustomField__pc
    //   obj.Parent__r
    // -------------------------------------------------------------------------
    const dotFieldRegex = /\b([a-zA-Z_]\w*)\.([\w]+__(?:c|r|pc))\b/g;
    while ((match = dotFieldRegex.exec(source)) !== null) {
        const variableName = match[1];
        const fieldName = match[2];
        const objectName = varMap.get(variableName);
        if (objectName) {
            deps.push({
                type: 'CustomField',
                apiName: `${objectName}.${fieldName}`,
                referenceType: 'FieldAccess'
            });
        }
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
        'string', 'integer', 'long', 'double', 'boolean', 'date', 'datetime',
        'time', 'blob', 'id', 'object', 'decimal', 'void', 'null', 'true', 'false',
        'system', 'math', 'json', 'limits', 'userinfo', 'schema', 'database',
        'test', 'assert', 'exception', 'sobject', 'list', 'set', 'map', 'iterator',
        'iterable', 'type', 'trigger', 'apexpages', 'pagereference',
        'httprequest', 'httpresponse', 'http', 'url', 'label', 'flow'
    ]);
    return keywords.has(name.toLowerCase());
}
function isSalesforceNamespace(name) {
    const namespaces = new Set([
        'system', 'schema', 'database', 'test', 'math', 'json', 'limits',
        'userinfo', 'apexpages', 'messaging', 'connectapi', 'eventbus',
        'triggeroperation', 'logginglevel', 'statuscode'
    ]);
    return namespaces.has(name.toLowerCase());
}
function isPrimitiveType(name) {
    const primitives = new Set([
        'string', 'integer', 'long', 'double', 'boolean', 'date',
        'datetime', 'time', 'blob', 'id', 'object', 'decimal', 'sobject'
    ]);
    return primitives.has(name.toLowerCase());
}
//# sourceMappingURL=textAnalyzer.js.map