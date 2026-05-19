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
exports.retrieveAndDiff = retrieveAndDiff;
exports.pruneGraphFromMissing = pruneGraphFromMissing;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const xmlUtils_1 = require("../transformer/xmlUtils");
/**
 * Phase 2: Retrieve metadata from the org using the resolved package.xml.
 *
 * After retrieval, diffs the requested manifest against what actually
 * came back on disk. Anything absent is returned as a missing component
 * so the graph can be pruned before transformation.
 */
async function retrieveAndDiff(org, packageXmlPath, retrieveDir) {
    fs.mkdirSync(retrieveDir, { recursive: true });
    try {
        (0, child_process_1.execSync)(`sf project retrieve start ` +
            `--target-org ${org} ` +
            `--manifest ${packageXmlPath} ` +
            `--output-dir ${retrieveDir}`, { stdio: 'inherit' });
    }
    catch (err) {
        throw new Error(`Retrieval failed: ${err.message}`);
    }
    // Parse the requested manifest to know what we asked for
    const requestedComponents = parsePackageXml(packageXmlPath);
    // Diff against what actually landed on disk
    const missingComponents = [];
    for (const { type, apiName } of requestedComponents) {
        const present = isComponentPresentOnDisk(type, apiName, retrieveDir);
        if (!present) {
            missingComponents.push({ type, apiName, reason: 'not-in-org' });
        }
    }
    return { retrievedDir: retrieveDir, missingComponents };
}
/**
 * Phase 2.5: Prune the dependency graph of anything that did not come back
 * from the org. This is the final ground truth pass — if the org doesn't
 * have it, it has no business being in the manifest.
 *
 * Returns the list of pruned node IDs for logging.
 */
function pruneGraphFromMissing(graph, missingComponents) {
    const pruned = [];
    for (const { type, apiName } of missingComponents) {
        const nodeId = `${type}:${apiName}`;
        if (graph.nodes.has(nodeId)) {
            graph.nodes.delete(nodeId);
            pruned.push(nodeId);
        }
    }
    // Prune edges that reference deleted nodes
    const remainingIds = new Set(graph.nodes.keys());
    graph.edges = graph.edges.filter((e) => remainingIds.has(e.from) && remainingIds.has(e.to));
    return pruned;
}
function parsePackageXml(packageXmlPath) {
    const content = fs.readFileSync(packageXmlPath, 'utf-8');
    const parsed = (0, xmlUtils_1.parseXml)(content);
    const pkg = parsed.Package ?? parsed;
    const components = [];
    const types = Array.isArray(pkg.types) ? pkg.types : pkg.types ? [pkg.types] : [];
    for (const typeBlock of types) {
        const typeName = typeBlock.name;
        const members = Array.isArray(typeBlock.members)
            ? typeBlock.members
            : typeBlock.members
                ? [typeBlock.members]
                : [];
        for (const member of members) {
            components.push({ type: typeName, apiName: String(member) });
        }
    }
    return components;
}
/**
 * Checks whether a retrieved component is present on disk after retrieval.
 * Covers common SFDX source format paths. Unknown types fall back to a
 * directory walk.
 */
function isComponentPresentOnDisk(type, apiName, retrieveDir) {
    const root = path.join(retrieveDir, 'force-app', 'main', 'default');
    switch (type) {
        case 'ApexClass':
            return fs.existsSync(path.join(root, 'classes', `${apiName}.cls`));
        case 'ApexTrigger':
            return fs.existsSync(path.join(root, 'triggers', `${apiName}.trigger`));
        case 'CustomObject':
            return fs.existsSync(path.join(root, 'objects', apiName, `${apiName}.object-meta.xml`));
        case 'CustomField': {
            const parts = apiName.split('.');
            if (parts.length !== 2)
                return false;
            return fs.existsSync(path.join(root, 'objects', parts[0], 'fields', `${parts[1]}.field-meta.xml`));
        }
        case 'ValidationRule': {
            const parts = apiName.split('.');
            if (parts.length !== 2)
                return false;
            return fs.existsSync(path.join(root, 'objects', parts[0], 'validationRules', `${parts[1]}.validationRule-meta.xml`));
        }
        case 'RecordType': {
            const parts = apiName.split('.');
            if (parts.length !== 2)
                return false;
            return fs.existsSync(path.join(root, 'objects', parts[0], 'recordTypes', `${parts[1]}.recordType-meta.xml`));
        }
        case 'FlexiPage':
            return fs.existsSync(path.join(root, 'flexipages', `${apiName}.flexipage-meta.xml`));
        case 'Flow':
            return fs.existsSync(path.join(root, 'flows', `${apiName}.flow-meta.xml`));
        case 'Layout':
            return fs.existsSync(path.join(root, 'layouts', `${apiName}.layout-meta.xml`));
        case 'PermissionSet':
            return fs.existsSync(path.join(root, 'permissionsets', `${apiName}.permissionset-meta.xml`));
        case 'CustomTab':
            return fs.existsSync(path.join(root, 'tabs', `${apiName}.tab-meta.xml`));
        case 'StaticResource':
            return (fs.existsSync(path.join(root, 'staticresources', `${apiName}.resource-meta.xml`)) ||
                fs.existsSync(path.join(root, 'staticresources', apiName)));
        default:
            // Unknown type — walk and look for any file containing the apiName
            return fileExistsAnywhere(root, apiName);
    }
}
function fileExistsAnywhere(dir, apiName) {
    if (!fs.existsSync(dir))
        return false;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (fileExistsAnywhere(full, apiName))
                return true;
        }
        else if (entry.name.includes(apiName)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=index.js.map