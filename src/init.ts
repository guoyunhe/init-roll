import chalk from 'chalk';
import merge from 'deepmerge';
import ejs from 'ejs';
import glob from 'fast-glob';
import { access, chmod, readFile, rm, writeFile } from 'fs/promises';
import JSON5 from 'json5';
import { getPackageJsonFromGit } from 'package-json-from-git';
import { join } from 'path';
import sortPackageJson from 'sort-package-json';
import { arrayMerge } from './private/arrayMerge';
import { deleteMerge } from './private/deleteMerge';

export async function init(
  /** Absolute path to template folder */
  templateDir: string,
  /** Absolute path to project folder */
  projectDir: string,
  /** Parameters to inject to template files */
  params: Record<string, any>
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
      const outputFile = template.replace(/\.ejs$/, '');
      const outputFullPath = join(projectDir, outputFile);
      let exist = false;
      try {
        await access(outputFullPath);
        exist = true;
      } catch (e) {
        exist = false;
      }
      await writeFile(outputFullPath, outputStr, 'utf-8');

      if (outputStr.startsWith('#!')) {
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
      const templateJson = JSON5.parse(
        await readFile(join(templateDir, template), 'utf-8')
      );
      const outputFile = template.replace(/\.delete\.json$/, 'json');
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
      const templateJson = JSON5.parse(
        await readFile(join(templateDir, template), 'utf-8')
      );
      const outputFile = template.replace(/\.merge\.json$/, 'json');
      const outputFullPath = join(projectDir, outputFile);
      let outputJson: any = {};
      let exist = false;

      try {
        outputJson = JSON5.parse(await readFile(outputFullPath, 'utf-8'));
        exist = true;
      } catch (e) {
        // Skip
      }

      outputJson = merge(outputJson, templateJson, { arrayMerge });

      if (
        outputFile === 'package.json' ||
        outputFile.endsWith('/package.json')
      ) {
        outputJson = sortPackageJson(outputJson);
        const repoData = await getPackageJsonFromGit(projectDir);
        outputJson = merge(repoData, outputJson);
      }

      await writeFile(
        outputFullPath,
        JSON.stringify(outputJson, null, 2),
        'utf-8'
      );

      if (exist) {
        console.log(chalk.blue('[updated]'), outputFile);
      } else {
        console.log(chalk.green('[created]'), outputFile);
      }
    })
  );
}