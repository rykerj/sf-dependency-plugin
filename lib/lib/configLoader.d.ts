import { ResolverConfig } from '../types/config';
/**
 * Loads and validates a resolver.json config file.
 * Merges with DEFAULT_CONFIG and DEFAULT_POLICIES — user config wins on conflict.
 *
 * @param configPath - Absolute or relative path to resolver.json
 * @param overrides  - CLI flag overrides (take highest priority)
 */
export declare function loadConfig(configPath: string, overrides?: Partial<ResolverConfig>): ResolverConfig;
/**
 * Writes an example resolver.json to the given path.
 * Used by `sf dependency init` to scaffold a new config.
 */
export declare function writeExampleConfig(targetPath: string, seeds?: string[]): void;
//# sourceMappingURL=configLoader.d.ts.map