import latestVersion from 'latest-version';
import { readFile, stat, writeFile } from 'node:fs/promises';

export interface InitRollMigrationOptions {
  /**
   * Migration version (not package version).
   *
   * You can use increments like 1, 2, 3, ...
   * Or use dates like 20230103, 20230713, 20231208, ...
   */
  version: number;
}

export class InitRollMigration {
  /**
   * Migration version (not package version).
   */
  public version: number;

  constructor(options: InitRollMigrationOptions) {
    this.version = options.version;
  }

  /**
   * Execute the migration.
   *
   * Note: here is no way to rollback, you need to use Git to revert unexpected changes.
   */
  async run() {
    // TODO
  }

  /**
   * Update a text file
   */
  async updateFile(fileName: string, transform: (oldContent: string | null) => Promise<string>) {
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
  async updateJson(fileName: string, transform: (oldContent: any) => Promise<any>) {
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
   */
  async updatePackageJson(fileName: string, transform: (oldContent: any) => Promise<any>) {
    await this.updateJson(fileName, async (oldPkg) => {
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

      return newPkg;
    });
  }
}
