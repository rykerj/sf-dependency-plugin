import { Command } from '@oclif/core';
export default class DependencyResolve extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        config: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
        seed: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        org: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'output-dir': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'max-depth': import("@oclif/core/lib/interfaces").OptionFlag<number | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'dry-run': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'no-tooling-api': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'stub-dir': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'tooling-api-mode': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    run(): Promise<void>;
    /**
     * Interactive confirmation prompt for Tooling API budget threshold.
     */
    private promptBudgetConfirm;
}
//# sourceMappingURL=resolve.d.ts.map