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
 * Groups deployable nodes by metadata type for package.xml generation.
 */
function groupByType(graph) {
    const groups = new Map();
    for (const node of graph.nodes.values()) {
        if (node.isManagedPackage)
            continue;
        if (node.policy !== 'include' && node.policy !== 'stub')
            continue;
        const members = groups.get(node.type) ?? [];
        members.push(node.apiName);
        groups.set(node.type, members);
    }
    return groups;
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
 * Writes managed package prerequisites to package-prerequisites.json.
 */
function writePackagePrerequisites(outputDir, prerequisites) {
    const output = {
        managedPackages: prerequisites,
        // Simple install order: alphabetical by package name
        // A future version could topologically sort based on package dependencies
        installOrder: [...new Set(prerequisites.map((p) => p.packageName))].sort(),
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