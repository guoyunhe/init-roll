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
}
