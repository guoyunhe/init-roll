import chalk from 'chalk';
import merge from 'deepmerge';
import ejs from 'ejs';
import glob from 'fast-glob';
import { access, chmod, mkdir, readFile, rm, writeFile } from 'fs/promises';
import JSON5 from 'json5';
import { getPackageJsonFromGit } from 'package-json-from-git';
import { basename, dirname, join } from 'path';
import { Options as PrettierOptions, format } from 'prettier';
import sortPackageJson from 'sort-package-json';
import { arrayMerge } from './private/arrayMerge';
import { bumpDependencies } from './private/bumpDependencies';
import { deleteMerge } from './private/deleteMerge';

export interface InitOptions {
  /** Bump dependencies to latest version */
  bumpDependencies?: boolean;
  /** Used to fetch the latest version of dependencies */
  registryUrl?: string;
  /** Disable console.log output */
  disableLog?: boolean;
  /** Enable Prettier and set options */
  prettier?: PrettierOptions;
}

export async function init(
  /** Absolute path to template folder */
  templateDir: string,
  /** Absolute path to project folder */
  projectDir: string,
  /** Parameters to inject to template files */
  params: Record<string, any>,
  /** Options */
  options?: InitOptions | undefined,
) {
  // Delete files defined by *.delete
  await Promise.all(
    (await glob(['**/*.delete'], { cwd: templateDir, dot: true })).map(async (template) => {
      const output = template.replace(/\.delete$/, '');
      try {
        await rm(join(projectDir, output), { recursive: true });
        if (!options?.disableLog) {
          console.log(chalk.red('[deleted]'), output);
        }
      } catch {
        // Skip
      }
    }),
  );

  // Create files defined by *.default
  await Promise.all(
    (await glob(['**/*.default'], { cwd: templateDir, dot: true })).map(async (template) => {
      const templateStr = await readFile(join(templateDir, template), 'utf-8');
      let outputStr = ejs.render(templateStr, params);
      const outputFile = ejs.render(template.replace(/\.default$/, ''), params);
      const outputFullPath = join(projectDir, outputFile);
      try {
        // exist, skip
        await access(outputFullPath);
        return;
      } catch {
        // not exist, continue
      }

      await mkdir(dirname(outputFullPath), { recursive: true });
      if (options?.prettier) {
        try {
          outputStr = await format(outputStr, { ...options.prettier, filepath: outputFile });
        } catch {
          // skip if no parser is found for the file
        }
      }
      await writeFile(outputFullPath, outputStr, 'utf-8');

      if (outputStr.startsWith('#!')) {
        // Add x mode to executable scripts
        await chmod(outputFullPath, '755');
      }
      if (!options?.disableLog) {
        console.log(chalk.green('[created]'), outputFile);
      }
    }),
  );

  // Create or update files defined by *.override or *.ejs (deprecated)
  await Promise.all(
    (await glob(['**/*.override', '**/*.ejs'], { cwd: templateDir, dot: true })).map(
      async (template) => {
        const templateStr = await readFile(join(templateDir, template), 'utf-8');
        let outputStr = ejs.render(templateStr, params);
        const outputFile = ejs.render(template.replace(/\.(override|ejs)$/, ''), params);
        const outputFullPath = join(projectDir, outputFile);
        await mkdir(dirname(outputFullPath), { recursive: true });
        let exist = false;
        try {
          await access(outputFullPath);
          exist = true;
        } catch {
          exist = false;
        }
        if (options?.prettier) {
          try {
            outputStr = await format(outputStr, { ...options.prettier, filepath: outputFile });
          } catch {
            // skip if no parser is found for the file
          }
        }
        await writeFile(outputFullPath, outputStr, 'utf-8');

        if (outputStr.startsWith('#!')) {
          // Add x mode to executable scripts
          await chmod(outputFullPath, '755');
        }
        if (!options?.disableLog) {
          if (exist) {
            console.log(chalk.blue('[updated]'), outputFile);
          } else {
            console.log(chalk.green('[created]'), outputFile);
          }
        }
      },
    ),
  );

  // Delete keys from JSON files, defined by *.delete.json
  await Promise.all(
    (await glob(['**/*.delete.json'], { cwd: templateDir, dot: true })).map(async (template) => {
      const templateJson = JSON5.parse(await readFile(join(templateDir, template), 'utf-8'));
      const outputFile = template.replace(/\.delete\.json$/, '.json');
      const outputFullPath = join(projectDir, outputFile);
      try {
        const outputJson = JSON5.parse(await readFile(outputFullPath, 'utf-8'));
        deleteMerge(outputJson, templateJson);
        let outputStr = JSON.stringify(outputJson, null, 2);
        if (options?.prettier) {
          try {
            outputStr = await format(outputStr, { ...options.prettier, filepath: outputFile });
          } catch {
            // skip if no parser is found for the file
          }
        }
        await writeFile(outputFullPath, outputStr, 'utf-8');
        if (!options?.disableLog) {
          console.log(chalk.blue('[updated]'), outputFile);
        }
      } catch {
        // Skip
      }
    }),
  );

  // Override keys of JSON files, defined by *.merge.json
  await Promise.all(
    (await glob(['**/*.merge.json'], { cwd: templateDir, dot: true })).map(async (template) => {
      const templateStr = await readFile(join(templateDir, template), 'utf-8');
      const templateJsonStr = ejs.render(templateStr, params);
      const templateJson = JSON5.parse(templateJsonStr);

      const outputFile = template.replace(/\.merge\.json$/, '.json');
      const outputFullPath = join(projectDir, outputFile);
      await mkdir(dirname(outputFullPath), { recursive: true });

      // bump dependencies of package.json template
      if (basename(outputFullPath) === 'package.json' && options?.bumpDependencies) {
        if (templateJson.dependencies) {
          await bumpDependencies(templateJson.dependencies, options?.registryUrl);
        }
        if (templateJson.devDependencies) {
          await bumpDependencies(templateJson.devDependencies, options?.registryUrl);
        }
      }

      let outputJson: any = {};
      let exist = false;

      try {
        outputJson = JSON5.parse(await readFile(outputFullPath, 'utf-8'));
        exist = true;
      } catch {
        // Skip
      }

      outputJson = merge(outputJson, templateJson, { arrayMerge });

      // format package.json output
      if (outputFile === 'package.json' || outputFile.endsWith('/package.json')) {
        const repoData = await getPackageJsonFromGit(projectDir);
        outputJson = merge(repoData, outputJson);
        outputJson = sortPackageJson(outputJson);
      }

      let outputStr = JSON.stringify(outputJson, null, 2);
      if (options?.prettier) {
        try {
          outputStr = await format(outputStr, { ...options.prettier, filepath: outputFile });
        } catch {
          // skip if no parser is found for the file
        }
      }
      await writeFile(outputFullPath, outputStr, 'utf-8');

      if (!options?.disableLog) {
        if (exist) {
          console.log(chalk.blue('[updated]'), outputFile);
        } else {
          console.log(chalk.green('[created]'), outputFile);
        }
      }
    }),
  );
}
