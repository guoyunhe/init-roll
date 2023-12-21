import fse from 'fs-extra';
import { join } from 'path';
import { Migration } from './Migration';

export class Template {
  private migrations: Migration[] = [];

  constructor(
    /**
     * Relative or absolute path to project root, where package.json is located.
     */
    public projectPath: string,
    /**
     * Package name of your `create-xxx` package.
     */
    public pkgName: string,
    /**
     * Migration command. e.g. create-xxx --no-interaction
     */
    public command: string
  ) {}

  addMigration(migration: Migration) {
    this.migrations.push(migration);
    migration.template = this;
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async migrate() {
    await fse.mkdirp(this.projectPath);
    const packageJson = await fse.readJSON(join(this.projectPath, 'package.json'));

    for (const migration of this.migrations) {
      // skip migrated version
      if (
        packageJson?.template?.name === this.pkgName &&
        packageJson?.template?.version <= migration.version
      ) {
        continue;
      }
      // migrate a version
      await migration.run();
    }
  }
}
