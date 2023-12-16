#!/usr/bin/env node

import { Command } from 'commander';
import { action } from '..';

const program = new Command('init-roll');

program
  .argument('[word]', 'Word to print on console')
  .option('--repeat <times>', 'Print repeat times, 1 by default', parseInt)
  .action(action);

program.helpOption('-h, --help', 'Show full help');

program.version(PACKAGE_VERSION, '-v, --version', 'Show version number');

program.parse();
