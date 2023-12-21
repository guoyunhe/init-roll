import fse from 'fs-extra';
import { join } from 'path';
import { compare, lte } from 'semver';
import { Migration } from './Migration';

export class Template {
  public project = '.';

  private migrations: Migration[] = [];

  constructor(
    /**
     * Package name of your `create-xxx` package.
     */
    public name: string,
    /**
     * Migration command. e.g. create-xxx --no-interaction
     */
    public command: string
  ) {}

  addMigration(migration: Migration) {
    this.migrations.push(migration);
    migration.template = this;
    this.migrations.sort((a, b) => compare(a.version, b.version));
  }

  async migrate(
    /**
     * Relative or absolute path to project root, where package.json is located.
     */
    project: string
  ) {
    this.project = project;
    await fse.mkdirp(this.project);
    const packageJson = await fse.readJSON(join(this.project, 'package.json'));

    for (const migration of this.migrations) {
      // skip migrated version
      if (
        packageJson?.template?.name &&
        packageJson.template.name === this.name &&
        packageJson?.template?.version &&
        lte(packageJson.template.version, migration.version)
      ) {
        continue;
      }
      // migrate a version
      await migration.run();
    }
  }
}
