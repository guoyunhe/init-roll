import { Migration } from './Migration';

export class Template {
  private migrations: Migration[] = [];

  constructor(
    /**
     * Template name, usually the same as package name.
     */
    public name: string,
    /**
     * Migration command
     */
    public command: string,
    /**
     * Package name that contains the migration command
     */
    public pkgName: string
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
