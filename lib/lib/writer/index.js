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
exports.writePackageXml = writePackageXml;
exports.writeDependencyGraph = writeDependencyGraph;
exports.writePackagePrerequisites = writePackagePrerequisites;
exports.writeTransformationLog = writeTransformationLog;
exports.writeConfigSnapshot = writeConfigSnapshot;
exports.initOutputDir = initOutputDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PACKAGE_XML_VERSION = '61.0';
/**
 * Converts source-level identifiers into deployable metadata identifiers.
 */
function normalizeMetadataApiName(type, apiName) {
    // -------------------------------------------------------------------
    // Person Account field projections
    //
    // Apex:
    //   Account.MyField__pc
    //
    // Metadata API:
    //   Contact.MyField__c
    // -------------------------------------------------------------------
    if (type === 'CustomField' &&
        apiName.includes('.')) {
        const [objectName, fieldName] = apiName.split('.');
        if (objectName === 'Account' &&
            fieldName.endsWith('__pc')) {
            return `Contact.${fieldName.replace(/__pc$/, '__c')}`;
        }
    }
    return apiName;
}
/**
 * Groups deployable nodes by metadata type for package.xml generation.
 */
function groupByType(graph) {
    const groups = new Map();
    for (const node of graph.nodes.values()) {
        if (node.isManagedPackage) {
            continue;
        }
        if (node.policy !== 'include' &&
            node.policy !== 'stub') {
            continue;
        }
        const normalizedApiName = normalizeMetadataApiName(node.type, node.apiName);
        const members = groups.get(node.type) ?? new Set();
        members.add(normalizedApiName);
        groups.set(node.type, members);
    }
    // Convert Sets back to sorted arrays
    return new Map(Array.from(groups.entries()).map(([type, members]) => [
        type,
        Array.from(members).sort()
    ]));
}
/**
 * Generates the final package.xml from the resolved dependency graph.
 */
function writePackageXml(outputDir, graph) {
    const groups = groupByType(graph);
    const typesXml = Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, members]) => {
        const membersXml = members
            .sort()
            .map((m) => `        <members>${m}</members>`)
            .join('\n');
        return `    <types>\n${membersXml}\n        <name>${type}</name>\n    </types>`;
    })
        .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${typesXml}
    <version>${PACKAGE_XML_VERSION}</version>
</Package>`;
    fs.writeFileSync(path.join(outputDir, 'package.xml'), xml, 'utf-8');
}
/**
 * Writes the dependency graph as JSON for visualization and auditing.
 */
function writeDependencyGraph(outputDir, graph, meta) {
    const output = {
        meta: {
            generatedAt: new Date().toISOString(),
            ...meta,
        },
        nodes: Array.from(graph.nodes.values()),
        edges: graph.edges,
    };
    fs.writeFileSync(path.join(outputDir, 'dependency-graph.json'), JSON.stringify(output, null, 2), 'utf-8');
}
/**
 * Writes all package prerequisites to package-prerequisites.json.
 * Covers:
 *   - 1GP managed packages (identified via namespace prefix)
 *   - 2GP and unlocked packages (identified via stub directory)
 */
function writePackagePrerequisites(outputDir, managedPackages, stubPackages) {
    // Build a unified install order across both types
    const allPackageLabels = [
        ...managedPackages.map((p) => p.packageName),
        ...stubPackages.map((p) => p.packageLabel),
    ];
    const output = {
        /**
         * Managed packages identified by namespace prefix (1GP).
         * Install via: sf package install --package <PackageVersionId>
         */
        managedPackages,
        /**
         * Packages identified via stub directory (2GP, unlocked, or 1GP stubs).
         * Install via: sf package install --package <PackageVersionId>
         * The packageLabel corresponds to the subdirectory name in your stubDir.
         */
        stubPackages,
        /**
         * Suggested install order — alphabetical.
         * Review and adjust if packages have dependencies on each other.
         */
        installOrder: [...new Set(allPackageLabels)].sort(),
    };
    fs.writeFileSync(path.join(outputDir, 'package-prerequisites.json'), JSON.stringify(output, null, 2), 'utf-8');
}
/**
 * Writes the transformation log to transformation-log.json.
 */
function writeTransformationLog(outputDir, log) {
    const output = {
        generatedAt: new Date().toISOString(),
        totalTransformations: log.length,
        transformations: log,
    };
    fs.writeFileSync(path.join(outputDir, 'transformation-log.json'), JSON.stringify(output, null, 2), 'utf-8');
}
/**
 * Writes a snapshot of the config used for this run.
 * Useful for reproducibility — commit alongside output.
 */
function writeConfigSnapshot(outputDir, config) {
    fs.writeFileSync(path.join(outputDir, 'resolver-config-snapshot.json'), JSON.stringify(config, null, 2), 'utf-8');
}
/**
 * Ensures the output directory and standard subdirectories exist.
 */
function initOutputDir(outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
}
//# sourceMappingURL=index.js.map