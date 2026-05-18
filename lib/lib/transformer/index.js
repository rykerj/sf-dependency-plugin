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
exports.Transformer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const objectTransformer_1 = require("./objectTransformer");
/**
 * Orchestrates Phase 3 transformation.
 * Walks the retrieved source directory and applies transformations
 * to metadata files based on the resolved graph and configured policies.
 */
class Transformer {
    constructor(policies, graph) {
        this.policies = policies;
        this.graph = graph;
        this.log = [];
    }
    /**
     * Transforms all metadata files in sourceDir and writes results to outputDir.
     */
    async transform(sourceDir, outputDir) {
        const resolvedComponents = this.buildResolvedComponentSet();
        const resolvedFields = this.buildResolvedFieldSet();
        fs.mkdirSync(outputDir, { recursive: true });
        this.copyAndTransform(sourceDir, outputDir, resolvedComponents, resolvedFields);
        return { log: this.log };
    }
    copyAndTransform(srcDir, destDir, resolvedComponents, resolvedFields) {
        if (!fs.existsSync(srcDir))
            return;
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                this.copyAndTransform(srcPath, destPath, resolvedComponents, resolvedFields);
            }
            else if (entry.name.endsWith('.object-meta.xml')) {
                // Apply object transformation
                const transformed = (0, objectTransformer_1.transformObjectMetadata)(srcPath, this.policies, resolvedComponents, resolvedFields, this.log);
                fs.writeFileSync(destPath, transformed, 'utf-8');
            }
            else {
                // Copy all other files as-is
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    /**
     * Builds a set of "Type:ApiName" strings for all resolved (include/stub) components.
     * Used to check if a referenced component is in the manifest.
     */
    buildResolvedComponentSet() {
        const set = new Set();
        for (const node of this.graph.nodes.values()) {
            if (node.policy === 'include' || node.policy === 'stub') {
                set.add(node.id); // id is already "Type:ApiName"
            }
        }
        return set;
    }
    /**
     * Builds a set of "ObjectName.FieldName" strings for all resolved fields.
     * Used to scope listView columns and similar field references.
     */
    buildResolvedFieldSet() {
        const set = new Set();
        for (const node of this.graph.nodes.values()) {
            if (node.type === 'CustomField' && node.policy === 'include') {
                // CustomField apiName format is "ObjectName.FieldName" or just "FieldName__c"
                set.add(node.apiName);
            }
        }
        return set;
    }
}
exports.Transformer = Transformer;
//# sourceMappingURL=index.js.map