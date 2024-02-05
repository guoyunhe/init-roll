import chalk from 'chalk';
import merge from 'deepmerge';
import ejs from 'ejs';
import glob from 'fast-glob';
import { access, chmod, mkdir, readFile, rm, writeFile } from 'fs/promises';
import JSON5 from 'json5';
import { getPackageJsonFromGit } from 'package-json-from-git';
import { dirname, join } from 'path';
import sortPackageJson from 'sort-package-json';
import { arrayMerge } from './private/arrayMerge';
import { bumpDependencies } from './private/bumpDependencies';
import { deleteMerge } from './private/deleteMerge';

export interface InitOptions {
  /** Used to fetch the latest version of dependencies */
  registryUrl?: string;
}

export async function init(
  /** Absolute path to template folder */
  templateDir: string,
  /** Absolute path to project folder */
  projectDir: string,
  /** Parameters to inject to template files */
  params: Record<string, any>,
  /** Options */
  options?: InitOptions
) {
  // Delete files defined by *.delete
  await Promise.all(
    (
      await glob(['**/*.delete'], { cwd: templateDir, dot: true })
    ).map(async (template) => {
      const output = template.replace(/\.delete$/, '');
      try {
        await rm(join(projectDir, output), { recursive: true });
        console.log(chalk.red('[deleted]'), output);
      } catch (e) {
        // Skip
      }
    })
  );

  // Create or update files defined by *.ejs
  await Promise.all(
    (
      await glob(['**/*.ejs'], { cwd: templateDir, dot: true })
    ).map(async (template) => {
      const templateStr = await readFile(join(templateDir, template), 'utf-8');
      const outputStr = ejs.render(templateStr, params);
      const outputFile = ejs.render(template.replace(/\.ejs$/, ''), params);
      const outputFullPath = join(projectDir, outputFile);
      await mkdir(dirname(outputFullPath), { recursive: true });
      let exist = false;
      try {
        await access(outputFullPath);
        exist = true;
      } catch (e) {
        exist = false;
      }
      await writeFile(outputFullPath, outputStr, 'utf-8');

      if (outputStr.startsWith('#!')) {
        // Add x mode to executable scripts
        await chmod(outputFullPath, '755');
      }

      if (exist) {
        console.log(chalk.blue('[updated]'), outputFile);
      } else {
        console.log(chalk.green('[created]'), outputFile);
      }
    })
  );

  // Delete keys from JSON files, defined by *.delete.json
  await Promise.all(
    (
      await glob(['**/*.delete.json'], { cwd: templateDir, dot: true })
    ).map(async (template) => {
      const templateJson = JSON5.parse(await readFile(join(templateDir, template), 'utf-8'));
      const outputFile = template.replace(/\.delete\.json$/, '.json');
      const outputFullPath = join(projectDir, outputFile);
      try {
        const outputJson = JSON5.parse(await readFile(outputFullPath, 'utf-8'));
        deleteMerge(outputJson, templateJson);
        console.log(chalk.blue('[updated]'), outputFile);
      } catch (e) {
        // Skip
      }
    })
  );

  // Override keys of JSON files, defined by *.merge.json
  await Promise.all(
    (
      await glob(['**/*.merge.json'], { cwd: templateDir, dot: true })
    ).map(async (template) => {
      const templateStr = await readFile(join(templateDir, template), 'utf-8');
      const templateJsonStr = ejs.render(templateStr, params);
      const templateJson = JSON5.parse(templateJsonStr);
      const outputFile = template.replace(/\.merge\.json$/, '.json');
      const outputFullPath = join(projectDir, outputFile);
      await mkdir(dirname(outputFullPath), { recursive: true });

      let outputJson: any = {};
      let exist = false;

      try {
        outputJson = JSON5.parse(await readFile(outputFullPath, 'utf-8'));
        exist = true;
      } catch (e) {
        // Skip
      }

      outputJson = merge(outputJson, templateJson, { arrayMerge });

      // Special process for package.json
      if (outputFile === 'package.json' || outputFile.endsWith('/package.json')) {
        const repoData = await getPackageJsonFromGit(projectDir);
        await bumpDependencies(outputJson.dependencies, options.registryUrl);
        await bumpDependencies(outputJson.devDependencies, options.registryUrl);
        outputJson = merge(repoData, outputJson);
        outputJson = sortPackageJson(outputJson);
      }

      await writeFile(outputFullPath, JSON.stringify(outputJson, null, 2), 'utf-8');

      if (exist) {
        console.log(chalk.blue('[updated]'), outputFile);
      } else {
        console.log(chalk.green('[created]'), outputFile);
      }
    })
  );
}
