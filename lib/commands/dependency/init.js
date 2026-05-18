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
const index_1 = require("../../lib/index");
class DependencyInit extends core_1.Command {
    async run() {
        const { flags } = await this.parse(DependencyInit);
        const seeds = flags.seed ? flags.seed.split(',').map((s) => s.trim()) : [];
        const configPath = path.join(flags.output, 'resolver.json');
        (0, index_1.writeExampleConfig)(configPath, seeds);
        this.log(`\n✅  Created resolver.json at: ${path.resolve(configPath)}`);
        this.log(`    Edit it to configure your seeds, org alias, and resolution policies.`);
        this.log(`    Then run: sf dependency resolve --config ${configPath}\n`);
    }
}
DependencyInit.description = 'Scaffold a new resolver.json config file for a feature. ' +
    'Creates the config in the specified output directory.';
DependencyInit.examples = [
    '$ sf dependency init --output ./scratch-manifests/loan-feature --seed LoanApplicationHandler,LoanApplicationTrigger',
    '$ sf dependency init --output ./scratch-manifests/comm-center',
];
DependencyInit.flags = {
    output: core_1.Flags.string({
        char: 'o',
        description: 'Directory to create the resolver.json in',
        required: true,
    }),
    seed: core_1.Flags.string({
        char: 's',
        description: 'Comma-separated seed component names to pre-populate',
        required: false,
    }),
};
exports.default = DependencyInit;
//# sourceMappingURL=init.js.map