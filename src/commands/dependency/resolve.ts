import { Command, Flags } from '@oclif/core';
import * as path from 'path';
import * as readline from 'readline';
import {
  loadConfig,
  getSfConnection,
  buildToolingApiClient,
  ToolingApiResolver,
  Resolver,
  Transformer,
  initOutputDir,
  writePackageXml,
  writeDependencyGraph,
  writePackagePrerequisites,
  writeTransformationLog,
  writeConfigSnapshot,
  ResolverConfig,
  ManagedPackagePrerequisite,
  StubPackagePrerequisite,
} from '../../lib/index';

export default class DependencyResolve extends Command {
  static description =
    'Resolve all dependencies of one or more Salesforce components and produce a scoped, deployable package for scratch org development.';

  static examples = [
    '$ sf dependency resolve --config ./scratch-manifests/loan-feature/resolver.json',
    '$ sf dependency resolve --config ./resolver.json --seed MyClass,MyTrigger --org myDevSandbox',
    '$ sf dependency resolve --config ./resolver.json --dry-run',
  ];

  static flags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to resolver.json config file',
      default: './resolver.json',
    }),
    seed: Flags.string({
      char: 's',
      description: 'Override seeds (comma-separated component API names)',
      required: false,
    }),
    org: Flags.string({
      char: 'o',
      description: 'Override org alias from config',
      required: false,
    }),
    'output-dir': Flags.string({
      description: 'Override outputDir from config',
      required: false,
    }),
    'max-depth': Flags.integer({
      description: 'Override maxDepth from config',
      required: false,
    }),
    'dry-run': Flags.boolean({
      description: 'Resolve and output graph only — skip retrieval and transformation',
      default: false,
    }),
    'no-tooling-api': Flags.boolean({
      description: 'Disable Tooling API entirely — use local source analysis only',
      default: false,
    }),
    'stub-dir': Flags.string({
      description: 'Path to directory of Apex stubs from installed packages (2GP, unlocked, 1GP)',
      required: false,
    }),
    'tooling-api-mode': Flags.string({
      description: 'Tooling API usage mode: never | package-names-only | supplement | primary',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DependencyResolve);

    // --- Load and merge config
    const config = loadConfig(flags.config, {
      seeds: flags.seed ? flags.seed.split(',').map((s: string) => s.trim()) : undefined,
      org: flags.org,
      outputDir: flags['output-dir'],
      maxDepth: flags['max-depth'],
      stubDir: flags['stub-dir'],
      toolingApiMode: flags['tooling-api-mode'] as any ?? undefined,
    });

    this.log(`\n🔍  sf-dependency-resolver`);
    this.log(`    Seeds:    ${config.seeds.join(', ')}`);
    this.log(`    Org:      ${config.org}`);
    this.log(`    Output:   ${path.resolve(config.outputDir)}`);
    this.log(`    MaxDepth: ${config.maxDepth}`);
    this.log(`    DryRun:   ${flags['dry-run']}`);
    this.log('');

    // --- Auth and Tooling API setup
    let toolingApiResolver: ToolingApiResolver | null = null;

    if (!flags['no-tooling-api']) {
      try {
        const { connection } = await getSfConnection(config.org);
        const toolingClient = buildToolingApiClient(connection);

        toolingApiResolver = new ToolingApiResolver(toolingClient, {
          onWarn: (msg: string) => this.warn(msg),
          onConfirmPrompt: async (count: number) => {
            return this.promptBudgetConfirm(count);
          },
        });

        this.log(`✅  Connected to org: ${config.org}`);
      } catch (err: any) {
        this.warn(
          `Could not connect to org '${config.org}': ${err.message}\n` +
            `Falling back to local source analysis only. Run 'sf org login' to authenticate.`
        );
      }
    } else {
      this.log(`ℹ️   Tooling API disabled — using local source analysis only`);
    }

    // --- Phase 1: Resolution
    this.log(`\n📊  Phase 1: Resolving dependency graph...`);
    const resolver = new Resolver(config, toolingApiResolver);
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
      managedPackages.forEach((pkg: ManagedPackagePrerequisite, i: number) => {
        this.log(`    ${i + 1}. ${pkg.packageName} (${pkg.namespace})`);
      });
    }

    if (result.stubPackages.length > 0) {
      this.log(`\n⚠️   Stub package prerequisites detected (2GP/unlocked/1GP via stub directory):`);
      result.stubPackages.forEach((pkg, i: number) => {
        const ns = pkg.namespace ? ` (${pkg.namespace})` : ' (no namespace — 2GP/unlocked)';
        this.log(`    ${i + 1}. ${pkg.packageLabel}${ns} — ${pkg.components.length} component(s)`);
      });
    }

    if (managedPackages.length > 0 || result.stubPackages.length > 0) {
      this.log(`    See package-prerequisites.json in output directory for details.\n`);
    }

    // --- Init output directory
    initOutputDir(config.outputDir);

    // --- Write graph and prerequisites regardless of dry-run
    writeDependencyGraph(config.outputDir, graph, {
      seeds: config.seeds,
      org: config.org,
      totalNodes: graph.nodes.size,
      maxDepth: config.maxDepth,
    });

    if (managedPackages.length > 0 || result.stubPackages.length > 0) {
      writePackagePrerequisites(config.outputDir, managedPackages, result.stubPackages);
    }

    writeConfigSnapshot(config.outputDir, config);

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

    const transformer = new Transformer(config.policies, graph);
    const transformResult = await transformer.transform(retrievedSourceDir, transformedSourceDir);

    writeTransformationLog(config.outputDir, transformResult.log);
    this.log(
      `    ✅ ${transformResult.log.length} transformations applied. See transformation-log.json.`
    );

    // --- Phase 4: Write final package.xml
    this.log(`\n📦  Phase 4: Writing output...`);
    writePackageXml(config.outputDir, graph);

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
  private async retrieve(config: ResolverConfig): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process');
    const retrieveDir = path.join(config.outputDir, '_retrieved');

    try {
      execSync(
        `sf project retrieve start ` +
          `--target-org ${config.org} ` +
          `--manifest ${path.join(config.outputDir, 'package.xml')} ` +
          `--output-dir ${retrieveDir}`,
        { stdio: 'inherit' }
      );
    } catch (err: any) {
      throw new Error(`Retrieval failed: ${err.message}`);
    }
  }

  /**
   * Interactive confirmation prompt for Tooling API budget threshold.
   */
  private promptBudgetConfirm(count: number): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        `\n⚠️  Warning: ${count} Tooling API queries executed — this is your full daily budget.\n` +
          `   Continuing may exhaust your org's daily API limit.\n` +
          `   Continue? (y/n): `,
        (answer: string) => {
          rl.close();
          resolve(answer.trim().toLowerCase() === 'y');
        }
      );
    });
  }
}