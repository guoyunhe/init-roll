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
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async migrate() {
    for (const migration of this.migrations) {
      await migration.run();
    }
  }
}
