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
exports.buildStubDirectoryIndex = buildStubDirectoryIndex;
exports.findInStubIndex = findInStubIndex;
exports.buildStubPackagePrerequisites = buildStubPackagePrerequisites;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Scans a stub directory and builds an index of all package components.
 *
 * Expected layout:
 *   stubDir/
 *     PackageName/
 *       MyClass.cls
 *       MyClass.cls-meta.xml   (optional — ignored)
 *       MyTrigger.trigger
 *
 * The top-level subdirectory name becomes the packageLabel.
 * Namespace is inferred from the filename if it contains __ with no __c suffix.
 */
function buildStubDirectoryIndex(stubDir) {
    const index = {
        byName: new Map(),
        byPackage: new Map(),
    };
    if (!stubDir || !fs.existsSync(stubDir)) {
        return index;
    }
    const packageDirs = fs.readdirSync(stubDir, { withFileTypes: true })
        .filter((e) => e.isDirectory());
    for (const pkgDir of packageDirs) {
        const packageLabel = pkgDir.name;
        const pkgPath = path.join(stubDir, packageLabel);
        const components = [];
        const files = fs.readdirSync(pkgPath, { withFileTypes: true })
            .filter((e) => e.isFile());
        for (const file of files) {
            const ext = path.extname(file.name);
            const baseName = path.basename(file.name, ext);
            // Skip meta XML files
            if (file.name.endsWith('-meta.xml'))
                continue;
            let type = null;
            if (ext === '.cls')
                type = 'ApexClass';
            else if (ext === '.trigger')
                type = 'ApexTrigger';
            else
                continue;
            // Infer namespace from filename:
            //   fflib__Application.cls   -> namespace = 'fflib'
            //   SomeClass.cls            -> namespace = null (2GP / unlocked)
            const parts = baseName.split('__');
            const namespace = parts.length >= 2 && !baseName.endsWith('__c')
                ? parts[0]
                : null;
            const component = {
                apiName: baseName,
                type,
                packageLabel,
                namespace,
            };
            // Index by lowercased name for case-insensitive lookup
            index.byName.set(baseName.toLowerCase(), component);
            components.push(component);
        }
        if (components.length > 0) {
            index.byPackage.set(packageLabel, components);
        }
    }
    return index;
}
/**
 * Looks up a component by name in the stub index.
 * Case-insensitive.
 */
function findInStubIndex(apiName, index) {
    return index.byName.get(apiName.toLowerCase()) ?? null;
}
/**
 * Summarizes which packages are required based on the components
 * found in the stub index during resolution.
 */
function buildStubPackagePrerequisites(requiredComponents) {
    const grouped = new Map();
    for (const comp of requiredComponents) {
        const existing = grouped.get(comp.packageLabel);
        if (existing) {
            existing.components.push(comp.apiName);
        }
        else {
            grouped.set(comp.packageLabel, {
                namespace: comp.namespace,
                components: [comp.apiName],
            });
        }
    }
    return Array.from(grouped.entries()).map(([packageLabel, info]) => ({
        packageLabel,
        namespace: info.namespace,
        components: info.components.sort(),
    }));
}
//# sourceMappingURL=stubDirectory.js.map