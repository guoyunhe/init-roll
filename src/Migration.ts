import fg from 'fast-glob';
import fse from 'fs-extra';
import { readFile, rm } from 'fs/promises';
import latestVersion from 'latest-version';
import { join } from 'path';
import type { Template } from './Template';

export class Migration {
  public template: Template | null = null;

  constructor(
    /**
     * Migration version usually matches the package version when it is released. After released,
     * the migration should never be changed again. At next release, you should create a new
     * migration with your next package version.
     */
    public version: string,
    /**
     * Design the migration schema. Here you can create, update and delete files as you wish.
     *
     * Note: here is no way to rollback, you need to use Git to revert unexpected changes.
     */
    private runner: (migration: Migration) => Promise<void>
  ) {}

  /**
   * Execute the migration.
   *
   * Note: here is no way to rollback, you need to use Git to revert unexpected changes.
   */
  async run() {
    await this.runner(this);

    await this.updatePackageJson((oldPkg) => {
      if (!this.template) throw new Error('Migration must be added to a template');

      const newPkg = { ...oldPkg };
      if (!newPkg.scripts) {
        newPkg.scripts = {};
      }
      newPkg.scripts['template:migrate'] = this.template.command;
      if (!newPkg.devDependencies) {
        newPkg.devDependencies = {};
      }
      newPkg.devDependencies[this.template.name] = 'latest';
      newPkg.template = {
        name: this.template.name,
        version: this.version,
      };
      return newPkg;
    });
  }

  /**
   * Create a text file, override existing file or add *_new.* affix.
   */
  async createFile(
    /** File name related to project root */
    fileName: string,
    /** File content string */
    content: string,
    override?: boolean
  ) {
    if (!this.template) throw new Error('Migration must be added to a template');

    let filePath = join(this.template.project, fileName);

    // .foobar -> .foobar.new
    // foobar.ts -> foobar.new.ts
    if (
      !override &&
      (await fse.exists(filePath)) &&
      content.trim() !== (await fse.readFile(filePath, 'utf-8')).trim()
    ) {
      const dotIndex = filePath.lastIndexOf('.');
      filePath =
        dotIndex > 0
          ? filePath.substring(0, dotIndex) + '.new' + filePath.substring(dotIndex)
          : filePath + '.new';
    }

    await fse.outputFile(filePath, content, 'utf-8');
  }

  /**
   * Create a json file, override existing file or add *_new.* affix.
   */
  async createJson(
    /** File name related to project root */
    fileName: string,
    /** JSON object */
    content: any,
    override?: boolean
  ) {
    await this.createFile(fileName, JSON.stringify(content, null, 2), override);
  }

  /**
   * Update a text file
   */
  async updateFile(
    /** File name related to project root */
    fileName: string,
    /** Transform file content string */
    transform: (oldContent: string | null) => string | Promise<string>
  ) {
    if (!this.template) throw new Error('Migration must be added to a template');

    const filePath = join(this.template.project, fileName);
    let content: string | null = null;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch (e) {
      // Not exist
    }
    content = await transform(content);
    await fse.outputFile(filePath, content, 'utf-8');
  }

  /**
   * Update a json file
   */
  async updateJson(
    /** File name related to project root */
    fileName: string,
    /** Transform JSON object */
    transform: (oldContent: any) => any | Promise<any>
  ) {
    await this.updateFile(fileName, async (oldJson) => {
      let data = null;
      if (oldJson) {
        try {
          data = JSON.parse(oldJson);
        } catch (e) {
          //
        }
      }
      data = await transform(data);
      return JSON.stringify(data, null, 2);
    });
  }

  /**
   * Update package.json
   *
   * - Dependencies will be updated to latest version at run time, e.g. 8.x -> ^8.11.2
   * - Template name and version will be saved to template field
   */
  async updatePackageJson(
    /** Transform package.json object */
    transform: (oldContent: any) => any | Promise<any>
  ) {
    await this.updateJson('package.json', async (oldPkg) => {
      const newPkg = await transform(oldPkg);

      // Update dependencies to latest version
      await Promise.all([
        ...Object.keys(newPkg?.dependencies || {}).map(async (pkgName) => {
          newPkg.dependencies[pkgName] =
            '^' +
            (await latestVersion(pkgName, {
              version: newPkg.dependencies[pkgName],
            }));
        }),
        ...Object.keys(newPkg?.devDependencies || {}).map(async (pkgName) => {
          // Keep the template package as latest
          if (pkgName === this.template?.name) return;
          newPkg.devDependencies[pkgName] =
            '^' +
            (await latestVersion(pkgName, {
              version: newPkg.devDependencies[pkgName],
            }));
        }),
      ]);

      return newPkg;
    });
  }

  /**
   * Delete files by file names or glob patterns
   */
  async delete(
    /** File name(s) or glob pattern(s) */
    source: string | string[],
    options?: fg.Options
  ) {
    if (!this.template) throw new Error('Migration must be added to a template');

    const files = await fg(source, { cwd: this.template.project, ...options });
    for (const file of files) {
      await rm(file);
    }
  }
}
