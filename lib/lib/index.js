"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pruneGraphFromMissing = exports.retrieveAndDiff = exports.buildStubPackagePrerequisites = exports.findInStubIndex = exports.buildStubDirectoryIndex = exports.ToolingApiResolver = exports.writeExampleConfig = exports.loadConfig = exports.buildToolingApiClient = exports.getSfConnection = exports.initOutputDir = exports.writeConfigSnapshot = exports.writeTransformationLog = exports.writePackagePrerequisites = exports.writeDependencyGraph = exports.writePackageXml = exports.Transformer = exports.Resolver = void 0;
var index_1 = require("./resolver/index");
Object.defineProperty(exports, "Resolver", { enumerable: true, get: function () { return index_1.Resolver; } });
var index_2 = require("./transformer/index");
Object.defineProperty(exports, "Transformer", { enumerable: true, get: function () { return index_2.Transformer; } });
var index_3 = require("./writer/index");
Object.defineProperty(exports, "writePackageXml", { enumerable: true, get: function () { return index_3.writePackageXml; } });
Object.defineProperty(exports, "writeDependencyGraph", { enumerable: true, get: function () { return index_3.writeDependencyGraph; } });
Object.defineProperty(exports, "writePackagePrerequisites", { enumerable: true, get: function () { return index_3.writePackagePrerequisites; } });
Object.defineProperty(exports, "writeTransformationLog", { enumerable: true, get: function () { return index_3.writeTransformationLog; } });
Object.defineProperty(exports, "writeConfigSnapshot", { enumerable: true, get: function () { return index_3.writeConfigSnapshot; } });
Object.defineProperty(exports, "initOutputDir", { enumerable: true, get: function () { return index_3.initOutputDir; } });
var index_4 = require("./auth/index");
Object.defineProperty(exports, "getSfConnection", { enumerable: true, get: function () { return index_4.getSfConnection; } });
Object.defineProperty(exports, "buildToolingApiClient", { enumerable: true, get: function () { return index_4.buildToolingApiClient; } });
var configLoader_1 = require("./configLoader");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return configLoader_1.loadConfig; } });
Object.defineProperty(exports, "writeExampleConfig", { enumerable: true, get: function () { return configLoader_1.writeExampleConfig; } });
var toolingApi_1 = require("./resolver/toolingApi");
Object.defineProperty(exports, "ToolingApiResolver", { enumerable: true, get: function () { return toolingApi_1.ToolingApiResolver; } });
var stubDirectory_1 = require("./resolver/stubDirectory");
Object.defineProperty(exports, "buildStubDirectoryIndex", { enumerable: true, get: function () { return stubDirectory_1.buildStubDirectoryIndex; } });
Object.defineProperty(exports, "findInStubIndex", { enumerable: true, get: function () { return stubDirectory_1.findInStubIndex; } });
Object.defineProperty(exports, "buildStubPackagePrerequisites", { enumerable: true, get: function () { return stubDirectory_1.buildStubPackagePrerequisites; } });
var index_5 = require("./retriever/index");
Object.defineProperty(exports, "retrieveAndDiff", { enumerable: true, get: function () { return index_5.retrieveAndDiff; } });
Object.defineProperty(exports, "pruneGraphFromMissing", { enumerable: true, get: function () { return index_5.pruneGraphFromMissing; } });
//# sourceMappingURL=index.js.map