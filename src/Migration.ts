import fg from 'fast-glob';
import latestVersion from 'latest-version';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { Template } from './Template';

export interface MigrationOptions {
  /**
   * Migration version (not package version).
   *
   * You can use increments like 1, 2, 3, ...
   * Or use dates like 20230103, 20230713, 20231208, ...
   */
  version: number;

  /**
   * Execute migration
   */
  run: () => Promise<void>;

  /**
   * Should execute migration or not.
   */
  shouldRun?: () => boolean | Promise<boolean>;
}

export class Migration {
  constructor(
    /**
     * Link migration to your controller
     */
    private parent: Template,
    /**
     * Migration version (not package version).
     */
    public version: number,
    /**
     * Design the migration schema. Here you can create, update and delete files as you wish.
     *
     * Note: here is no way to rollback, you need to use Git to revert unexpected changes.
     */
    private runner: (migration: Migration) => Promise<void>
  ) {
    parent.addMigration(this);
  }

  /**
   * Execute the migration.
   *
   * Note: here is no way to rollback, you need to use Git to revert unexpected changes.
   */
  run() {
    return this.runner(this);
  }

  /**
   * Update a text file
   */
  async updateFile(
    /** File name related to project root */
    fileName: string,
    /** Transform file content string */
    transform: (oldContent: string | null) => Promise<string>
  ) {
    let content: string | null = null;
    const fileStat = await stat(fileName);
    if (fileStat.isFile()) {
      content = await readFile(fileName, 'utf-8');
    }
    content = await transform(content);
    await writeFile(fileName, content, 'utf-8');
  }

  /**
   * Update a json file
   */
  async updateJson(
    /** File name related to project root */
    fileName: string,
    /** Transform JSON object */
    transform: (oldContent: any) => Promise<any>
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
      return JSON.stringify(data);
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
    transform: (oldContent: any) => Promise<any>
  ) {
    await this.updateJson('package.json', async (oldPkg) => {
      const newPkg = await transform(oldPkg);

      // Update dependencies to latest version
      await Promise.all([
        ...Object.keys(newPkg?.dependencies).map(async (pkgName) => {
          newPkg.dependencies[pkgName] =
            '^' +
            (await latestVersion(pkgName, {
              version: newPkg.dependencies[pkgName],
            }));
        }),
        ...Object.keys(newPkg?.devDependencies).map(async (pkgName) => {
          newPkg.devDependencies[pkgName] =
            '^' +
            (await latestVersion(pkgName, {
              version: newPkg.devDependencies[pkgName],
            }));
        }),
      ]);

      newPkg.template = {
        name: this.parent.name,
        version: this.version,
      };

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
    const files = await fg(source, options);
    for (const file of files) {
      await rm(file);
    }
  }
}
