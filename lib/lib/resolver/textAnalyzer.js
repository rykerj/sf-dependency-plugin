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
 * Known gaps: Type.forName(), dynamic SOQL, property chains > 2 deep.
 */
function analyzeApexFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const source = fs.readFileSync(filePath, 'utf-8');
    // --- Apex class instantiation: new MyClass() or new namespace__MyClass()
    const instantiationRegex = /new\s+([A-Za-z][A-Za-z0-9_]*)\s*[({]/g;
    let match;
    while ((match = instantiationRegex.exec(source)) !== null) {
        const name = match[1];
        if (!isApexKeyword(name)) {
            deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Instantiation' });
        }
    }
    // --- Static method calls: MyClass.someMethod(
    const staticCallRegex = /([A-Z][A-Za-z0-9_]*)\.([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g;
    while ((match = staticCallRegex.exec(source)) !== null) {
        const className = match[1];
        if (!isApexKeyword(className) && !isSalesforceNamespace(className)) {
            deps.push({ type: 'ApexClass', apiName: className, referenceType: 'StaticMethodCall' });
        }
    }
    // --- Type declarations: MyClass varName or List<MyClass>
    const typeRegex = /(?:List|Set|Map)<([A-Za-z][A-Za-z0-9_]*)>/g;
    while ((match = typeRegex.exec(source)) !== null) {
        const name = match[1];
        if (!isApexKeyword(name) && !isPrimitiveType(name)) {
            deps.push({ type: 'ApexClass', apiName: name, referenceType: 'TypeReference' });
        }
    }
    // --- SOQL object references: FROM ObjectName or FROM namespace__ObjectName__c
    const soqlFromRegex = /\bFROM\s+([A-Za-z][A-Za-z0-9_]*)/gi;
    while ((match = soqlFromRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomObject', apiName: match[1], referenceType: 'SoqlFrom' });
    }
    // --- SOQL SELECT field references
    // Captures SELECT field1, field2 FROM — stops at FROM
    const soqlSelectRegex = /SELECT\s+([\s\S]*?)\s+FROM/gi;
    while ((match = soqlSelectRegex.exec(source)) !== null) {
        const fieldList = match[1];
        const fields = fieldList.split(',').map((f) => f.trim());
        for (const field of fields) {
            const cleanField = field.split(' ')[0]; // handle aliases
            if (cleanField.includes('__c') || cleanField.includes('__r')) {
                deps.push({ type: 'CustomField', apiName: cleanField, referenceType: 'SoqlSelect' });
            }
        }
    }
    // --- Dot-notation field access: someVar.MyField__c
    const dotFieldRegex = /\.([A-Za-z][A-Za-z0-9_]*__c)\b/g;
    while ((match = dotFieldRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'FieldAccess' });
    }
    // --- Custom object type variables: MyObject__c varName
    const objectTypeRegex = /\b([A-Za-z][A-Za-z0-9_]*__c)\s+[a-z]/g;
    while ((match = objectTypeRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomObject', apiName: match[1], referenceType: 'TypeDeclaration' });
    }
    // Deduplicate
    return deduplicateDeps(deps);
}
/**
 * Analyzes a Flow metadata XML file for object and field references.
 * NOTE: Flow dependency data from MetadataComponentDependency is unreliable,
 * so we parse the XML directly when useLocalSource is true.
 */
function analyzeFlowFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const source = fs.readFileSync(filePath, 'utf-8');
    // Object references in Flow XML
    const objectRegex = /<object>([A-Za-z][A-Za-z0-9_]*(?:__c)?)<\/object>/g;
    let match;
    while ((match = objectRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomObject', apiName: match[1], referenceType: 'FlowObject' });
    }
    // Field references in Flow XML
    const fieldRegex = /<field>([A-Za-z][A-Za-z0-9_]*__c)<\/field>/g;
    while ((match = fieldRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'FlowField' });
    }
    return deduplicateDeps(deps);
}
/**
 * Analyzes a ValidationRule XML for field references.
 * Validation rules are always included (never stripped), but their
 * field references are added to the object's field inclusion list.
 */
function analyzeValidationRuleFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const source = fs.readFileSync(filePath, 'utf-8');
    // Field references in validation formula: ISBLANK(MyField__c) or obj.MyField__c
    const formulaFieldRegex = /\b([A-Za-z][A-Za-z0-9_]*__c)\b/g;
    let match;
    while ((match = formulaFieldRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'ValidationFormula' });
    }
    return deduplicateDeps(deps);
}
/**
 * Scans a directory recursively for Apex files matching a component name.
 */
function findApexFile(componentName, sourceDir, extension) {
    const fileName = `${componentName}.${extension}-meta.xml`;
    const classFile = `${componentName}.${extension}`;
    // Try direct path first
    const directPath = path.join(sourceDir, extension === 'cls' ? 'classes' : 'triggers', classFile);
    if (fs.existsSync(directPath))
        return directPath;
    // Walk directory
    return walkDir(sourceDir, (f) => path.basename(f) === classFile);
}
// --- Helpers
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
        const key = `${d.type}:${d.apiName}:${d.referenceType}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function isApexKeyword(name) {
    const keywords = new Set([
        'String', 'Integer', 'Long', 'Double', 'Boolean', 'Date', 'DateTime',
        'Time', 'Blob', 'ID', 'Object', 'Decimal', 'void', 'null', 'true', 'false',
        'System', 'Math', 'JSON', 'Limits', 'UserInfo', 'Schema', 'Database',
        'Test', 'Assert', 'Exception', 'SObject', 'List', 'Set', 'Map', 'Iterator',
        'Iterable', 'Type', 'Trigger', 'ApexPages', 'PageReference',
    ]);
    return keywords.has(name);
}
function isSalesforceNamespace(name) {
    const namespaces = new Set([
        'System', 'Schema', 'Database', 'Test', 'Math', 'JSON', 'Limits',
        'UserInfo', 'ApexPages', 'Messaging', 'ConnectApi', 'EventBus',
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