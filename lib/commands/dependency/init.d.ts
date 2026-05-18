import { Command } from '@oclif/core';
export default class DependencyInit extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        output: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
        seed: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    run(): Promise<void>;
}
//# sourceMappingURL=init.d.ts.map