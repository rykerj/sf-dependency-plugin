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
exports.loadConfig = loadConfig;
exports.writeExampleConfig = writeExampleConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("../types/config");
/**
 * Loads and validates a resolver.json config file.
 * Merges with DEFAULT_CONFIG and DEFAULT_POLICIES — user config wins on conflict.
 *
 * @param configPath - Absolute or relative path to resolver.json
 * @param overrides  - CLI flag overrides (take highest priority)
 */
function loadConfig(configPath, overrides = {}) {
    const absolutePath = path.resolve(configPath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Config file not found: ${absolutePath}`);
    }
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
    }
    catch (err) {
        throw new Error(`Failed to parse config file at ${absolutePath}: ${err.message}`);
    }
    validateRaw(raw, absolutePath);
    // Merge: defaults < file config < CLI overrides
    const merged = {
        seeds: overrides.seeds ?? raw.seeds,
        org: overrides.org ?? raw.org,
        useLocalSource: overrides.useLocalSource ?? raw.useLocalSource ?? config_1.DEFAULT_CONFIG.useLocalSource,
        localSourceDir: overrides.localSourceDir ?? raw.localSourceDir ?? config_1.DEFAULT_CONFIG.localSourceDir,
        maxDepth: overrides.maxDepth ?? raw.maxDepth ?? config_1.DEFAULT_CONFIG.maxDepth,
        outputDir: overrides.outputDir ?? raw.outputDir,
        fieldPolicy: raw.fieldPolicy ?? config_1.DEFAULT_CONFIG.fieldPolicy,
        policies: {
            ...config_1.DEFAULT_POLICIES,
            ...(raw.policies ?? {}),
            ...(overrides.policies ?? {}),
        },
    };
    return merged;
}
/**
 * Writes an example resolver.json to the given path.
 * Used by `sf dependency init` to scaffold a new config.
 */
function writeExampleConfig(targetPath, seeds = []) {
    const example = {
        seeds: seeds.length > 0 ? seeds : ['MyApexClass', 'MyApexTrigger'],
        org: 'myDevSandbox',
        useLocalSource: true,
        localSourceDir: './force-app/main/default',
        maxDepth: 10,
        outputDir: './scratch-manifests/my-feature',
        fieldPolicy: 'referenced-only',
        policies: { ...config_1.DEFAULT_POLICIES },
    };
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(example, null, 2), 'utf-8');
}
// --- Validation
function validateRaw(raw, filePath) {
    const errors = [];
    if (!raw.seeds || !Array.isArray(raw.seeds) || raw.seeds.length === 0) {
        errors.push('"seeds" must be a non-empty array of component API names');
    }
    if (!raw.org || typeof raw.org !== 'string') {
        errors.push('"org" must be a string SF CLI org alias or username');
    }
    if (!raw.outputDir || typeof raw.outputDir !== 'string') {
        errors.push('"outputDir" must be a string path');
    }
    if (raw.maxDepth !== undefined && typeof raw.maxDepth !== 'number') {
        errors.push('"maxDepth" must be a number');
    }
    if (raw.fieldPolicy && !['referenced-only', 'all'].includes(raw.fieldPolicy)) {
        errors.push('"fieldPolicy" must be "referenced-only" or "all"');
    }
    if (raw.policies) {
        const validValues = ['include', 'stub', 'exclude'];
        for (const [key, val] of Object.entries(raw.policies)) {
            if (!validValues.includes(val)) {
                errors.push(`policies.${key} must be one of: include, stub, exclude`);
            }
        }
    }
    if (errors.length > 0) {
        throw new Error(`Invalid config at ${filePath}:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }
}
//# sourceMappingURL=configLoader.js.map