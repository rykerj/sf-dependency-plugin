import { Command, Flags } from '@oclif/core';
import * as path from 'path';
import { writeExampleConfig } from '../../lib/index';

export default class DependencyInit extends Command {
  static description =
    'Scaffold a new resolver.json config file for a feature. ' +
    'Creates the config in the specified output directory.';

  static examples = [
    '$ sf dependency init --output ./scratch-manifests/loan-feature --seed LoanApplicationHandler,LoanApplicationTrigger',
    '$ sf dependency init --output ./scratch-manifests/comm-center',
  ];

  static flags = {
    output: Flags.string({
      char: 'o',
      description: 'Directory to create the resolver.json in',
      required: true,
    }),
    seed: Flags.string({
      char: 's',
      description: 'Comma-separated seed component names to pre-populate',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DependencyInit);

    const seeds = flags.seed ? flags.seed.split(',').map((s) => s.trim()) : [];
    const configPath = path.join(flags.output, 'resolver.json');

    writeExampleConfig(configPath, seeds);

    this.log(`\n✅  Created resolver.json at: ${path.resolve(configPath)}`);
    this.log(`    Edit it to configure your seeds, org alias, and resolution policies.`);
    this.log(`    Then run: sf dependency resolve --config ${configPath}\n`);
  }
}