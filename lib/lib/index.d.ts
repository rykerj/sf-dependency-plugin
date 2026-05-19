/**
 * sf-dependency-resolver — core library
 *
 * This is the public API surface consumed by:
 *   - The SF CLI plugin (src/commands/dependency/resolve.ts)
 *   - A future VS Code extension
 *   - Any other tooling that wants to drive resolution programmatically
 *
 * Import from this file only — do not import from internal modules directly.
 */
export { Resolver } from './resolver/index';
export { Transformer } from './transformer/index';
export { writePackageXml, writeDependencyGraph, writePackagePrerequisites, writeTransformationLog, writeConfigSnapshot, initOutputDir, } from './writer/index';
export { getSfConnection, buildToolingApiClient } from './auth/index';
export { loadConfig, writeExampleConfig } from './configLoader';
export { ToolingApiResolver } from './resolver/toolingApi';
export { buildStubDirectoryIndex, findInStubIndex, buildStubPackagePrerequisites } from './resolver/stubDirectory';
export { retrieveAndDiff, pruneGraphFromMissing } from './retriever/index';
export type { RetrievalResult, MissingComponent } from './retriever/index';
export type { StubPackageComponent, StubDirectoryIndex } from './resolver/stubDirectory';
export type { ResolutionResult, DependencyGraph, GraphNode, GraphEdge, ManagedPackagePrerequisite, StubPackagePrerequisite } from '../types/graph';
export type { ResolverConfig, PolicyMap, PolicyValue, FieldPolicy } from '../types/config';
//# sourceMappingURL=index.d.ts.map