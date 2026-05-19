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
const core_1 = require("@oclif/core");
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const index_1 = require("../../lib/index");
class DependencyResolve extends core_1.Command {
    async run() {
        const { flags } = await this.parse(DependencyResolve);
        // --- Load and merge config
        const config = (0, index_1.loadConfig)(flags.config, {
            seeds: flags.seed ? flags.seed.split(',').map((s) => s.trim()) : undefined,
            org: flags.org,
            outputDir: flags['output-dir'],
            maxDepth: flags['max-depth'],
            stubDir: flags['stub-dir'],
            toolingApiMode: flags['tooling-api-mode'] ?? undefined,
        });
        this.log(`\n🔍  sf-dependency-resolver`);
        this.log(`    Seeds:    ${config.seeds.join(', ')}`);
        this.log(`    Org:      ${config.org}`);
        this.log(`    Output:   ${path.resolve(config.outputDir)}`);
        this.log(`    MaxDepth: ${config.maxDepth}`);
        this.log(`    DryRun:   ${flags['dry-run']}`);
        this.log('');
        // --- Auth and Tooling API setup
        let toolingApiResolver = null;
        if (!flags['no-tooling-api']) {
            try {
                const { connection } = await (0, index_1.getSfConnection)(config.org);
                const toolingClient = (0, index_1.buildToolingApiClient)(connection);
                toolingApiResolver = new index_1.ToolingApiResolver(toolingClient, {
                    onWarn: (msg) => this.warn(msg),
                    onConfirmPrompt: async (count) => {
                        return this.promptBudgetConfirm(count);
                    },
                });
                this.log(`✅  Connected to org: ${config.org}`);
            }
            catch (err) {
                this.warn(`Could not connect to org '${config.org}': ${err.message}\n` +
                    `Falling back to local source analysis only. Run 'sf org login' to authenticate.`);
            }
        }
        else {
            this.log(`ℹ️   Tooling API disabled — using local source analysis only`);
        }
        // --- Phase 1: Resolution
        this.log(`\n📊  Phase 1: Resolving dependency graph...`);
        const resolver = new index_1.Resolver(config, toolingApiResolver);
        const result = await resolver.resolve();
        const { graph, managedPackages, toolingApiQueryCount, warnings } = result;
        // Surface warnings
        for (const warning of warnings) {
            this.warn(warning);
        }
        const deployableNodes = graph.getDeployableNodes();
        this.log(`    ✅ Resolved ${graph.nodes.size} total nodes (${deployableNodes.length} deployable)`);
        this.log(`    📡 Tooling API queries: ${toolingApiQueryCount}`);
        if (managedPackages.length > 0) {
            this.log(`\n⚠️   Managed package prerequisites detected. Install these before deploying:`);
            managedPackages.forEach((pkg, i) => {
                this.log(`    ${i + 1}. ${pkg.packageName} (${pkg.namespace})`);
            });
        }
        if (result.stubPackages.length > 0) {
            this.log(`\n⚠️   Stub package prerequisites detected (2GP/unlocked/1GP via stub directory):`);
            result.stubPackages.forEach((pkg, i) => {
                const ns = pkg.namespace ? ` (${pkg.namespace})` : ' (no namespace — 2GP/unlocked)';
                this.log(`    ${i + 1}. ${pkg.packageLabel}${ns} — ${pkg.components.length} component(s)`);
            });
        }
        if (managedPackages.length > 0 || result.stubPackages.length > 0) {
            this.log(`    See package-prerequisites.json in output directory for details.\n`);
        }
        // --- Init output directory
        (0, index_1.initOutputDir)(config.outputDir);
        // --- Write graph and prerequisites regardless of dry-run
        (0, index_1.writeDependencyGraph)(config.outputDir, graph, {
            seeds: config.seeds,
            org: config.org,
            totalNodes: graph.nodes.size,
            maxDepth: config.maxDepth,
        });
        if (managedPackages.length > 0 || result.stubPackages.length > 0) {
            (0, index_1.writePackagePrerequisites)(config.outputDir, managedPackages, result.stubPackages);
        }
        (0, index_1.writeConfigSnapshot)(config.outputDir, config);
        if (flags['dry-run']) {
            this.log(`🏁  Dry run complete. Graph written to ${config.outputDir}/dependency-graph.json`);
            this.log(`    Skipping retrieval and transformation (--dry-run).`);
            return;
        }
        // --- Phase 2: Retrieval
        this.log(`\n📥  Phase 2: Retrieving metadata from org...`);
        await this.retrieve(config);
        // --- Phase 3: Transformation
        this.log(`\n🔧  Phase 3: Transforming metadata...`);
        const retrievedSourceDir = path.join(config.outputDir, '_retrieved', 'force-app');
        const transformedSourceDir = path.join(config.outputDir, 'force-app');
        const transformer = new index_1.Transformer(config.policies, graph);
        const transformResult = await transformer.transform(retrievedSourceDir, transformedSourceDir);
        (0, index_1.writeTransformationLog)(config.outputDir, transformResult.log);
        this.log(`    ✅ ${transformResult.log.length} transformations applied. See transformation-log.json.`);
        // --- Phase 4: Write final package.xml
        this.log(`\n📦  Phase 4: Writing output...`);
        (0, index_1.writePackageXml)(config.outputDir, graph);
        this.log(`\n✅  Done! Output written to: ${path.resolve(config.outputDir)}`);
        this.log(`    package.xml                — deploy with: sf project deploy start --manifest package.xml`);
        this.log(`    dependency-graph.json      — full graph for visualization`);
        this.log(`    transformation-log.json    — review all metadata mutations before deploying`);
        if (managedPackages.length > 0) {
            this.log(`    package-prerequisites.json — install these packages in scratch org first`);
        }
        this.log('');
    }
    /**
     * Shells out to sf project retrieve using the resolved manifest.
     * Retrieves into a temporary _retrieved directory before transformation.
     */
    async retrieve(config) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { execSync } = require('child_process');
        const retrieveDir = path.join(config.outputDir, '_retrieved');
        try {
            execSync(`sf project retrieve start ` +
                `--target-org ${config.org} ` +
                `--manifest ${path.join(config.outputDir, 'package.xml')} ` +
                `--output-dir ${retrieveDir}`, { stdio: 'inherit' });
        }
        catch (err) {
            throw new Error(`Retrieval failed: ${err.message}`);
        }
    }
    /**
     * Interactive confirmation prompt for Tooling API budget threshold.
     */
    promptBudgetConfirm(count) {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl.question(`\n⚠️  Warning: ${count} Tooling API queries executed — this is your full daily budget.\n` +
                `   Continuing may exhaust your org's daily API limit.\n` +
                `   Continue? (y/n): `, (answer) => {
                rl.close();
                resolve(answer.trim().toLowerCase() === 'y');
            });
        });
    }
}
DependencyResolve.description = 'Resolve all dependencies of one or more Salesforce components and produce a scoped, deployable package for scratch org development.';
DependencyResolve.examples = [
    '$ sf dependency resolve --config ./scratch-manifests/loan-feature/resolver.json',
    '$ sf dependency resolve --config ./resolver.json --seed MyClass,MyTrigger --org myDevSandbox',
    '$ sf dependency resolve --config ./resolver.json --dry-run',
];
DependencyResolve.flags = {
    config: core_1.Flags.string({
        char: 'c',
        description: 'Path to resolver.json config file',
        default: './resolver.json',
    }),
    seed: core_1.Flags.string({
        char: 's',
        description: 'Override seeds (comma-separated component API names)',
        required: false,
    }),
    org: core_1.Flags.string({
        char: 'o',
        description: 'Override org alias from config',
        required: false,
    }),
    'output-dir': core_1.Flags.string({
        description: 'Override outputDir from config',
        required: false,
    }),
    'max-depth': core_1.Flags.integer({
        description: 'Override maxDepth from config',
        required: false,
    }),
    'dry-run': core_1.Flags.boolean({
        description: 'Resolve and output graph only — skip retrieval and transformation',
        default: false,
    }),
    'no-tooling-api': core_1.Flags.boolean({
        description: 'Disable Tooling API entirely — use local source analysis only',
        default: false,
    }),
    'stub-dir': core_1.Flags.string({
        description: 'Path to directory of Apex stubs from installed packages (2GP, unlocked, 1GP)',
        required: false,
    }),
    'tooling-api-mode': core_1.Flags.string({
        description: 'Tooling API usage mode: never | package-names-only | supplement | primary',
        required: false,
    }),
};
exports.default = DependencyResolve;
//# sourceMappingURL=resolve.js.map