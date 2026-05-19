import * as fs from 'fs';
import * as path from 'path';
import { ResolverConfig, DEFAULT_CONFIG, DEFAULT_POLICIES } from '../types/config';

/**
 * Loads and validates a resolver.json config file.
 * Merges with DEFAULT_CONFIG and DEFAULT_POLICIES — user config wins on conflict.
 *
 * @param configPath - Absolute or relative path to resolver.json
 * @param overrides  - CLI flag overrides (take highest priority)
 */
export function loadConfig(
  configPath: string,
  overrides: Partial<ResolverConfig> = {}
): ResolverConfig {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
  } catch (err: any) {
    throw new Error(`Failed to parse config file at ${absolutePath}: ${err.message}`);
  }

  validateRaw(raw, absolutePath);

  const useLocalSource = overrides.useLocalSource ?? raw.useLocalSource ?? DEFAULT_CONFIG.useLocalSource!;

  // Default toolingApiMode based on useLocalSource if not explicitly set
  const defaultToolingApiMode = useLocalSource ? 'never' : 'primary';

  // Merge: defaults < file config < CLI overrides
  const merged: ResolverConfig = {
    seeds: overrides.seeds ?? raw.seeds,
    org: overrides.org ?? raw.org,
    useLocalSource,
    localSourceDir: overrides.localSourceDir ?? raw.localSourceDir ?? DEFAULT_CONFIG.localSourceDir!,
    maxDepth: overrides.maxDepth ?? raw.maxDepth ?? DEFAULT_CONFIG.maxDepth!,
    outputDir: overrides.outputDir ?? raw.outputDir,
    fieldPolicy: raw.fieldPolicy ?? DEFAULT_CONFIG.fieldPolicy!,
    toolingApiMode: overrides.toolingApiMode ?? raw.toolingApiMode ?? defaultToolingApiMode,
    stubDir: overrides.stubDir ?? raw.stubDir ?? undefined,
    policies: {
      ...DEFAULT_POLICIES,
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
export function writeExampleConfig(targetPath: string, seeds: string[] = []): void {
  const example: ResolverConfig = {
    seeds: seeds.length > 0 ? seeds : ['MyApexClass', 'MyApexTrigger'],
    org: 'myDevSandbox',
    useLocalSource: true,
    localSourceDir: './force-app/main/default',
    maxDepth: 10,
    outputDir: './scratch-manifests/my-feature',
    fieldPolicy: 'referenced-only',
    toolingApiMode: 'never',
    // stubDir: './package-stubs',  // Uncomment and set to your stub directory path
    policies: { ...DEFAULT_POLICIES },
  };

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(example, null, 2), 'utf-8');
}

// --- Validation

function validateRaw(raw: any, filePath: string): void {
  const errors: string[] = [];

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

  const validToolingApiModes = ['never', 'package-names-only', 'supplement', 'primary'];
  if (raw.toolingApiMode && !validToolingApiModes.includes(raw.toolingApiMode)) {
    errors.push(`"toolingApiMode" must be one of: ${validToolingApiModes.join(', ')}`);
  }

  if (raw.stubDir && typeof raw.stubDir !== 'string') {
    errors.push('"stubDir" must be a string path to your package stub directory');
  }

  if (raw.policies) {
    const validValues = ['include', 'stub', 'exclude'];
    for (const [key, val] of Object.entries(raw.policies)) {
      if (!validValues.includes(val as string)) {
        errors.push(`policies.${key} must be one of: include, stub, exclude`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid config at ${filePath}:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}