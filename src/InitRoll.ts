import { InitRollMigration } from './InitRollMigration';

export interface InitRollOptions {
  version: string;
}

export class InitRoll {
  private migrations: InitRollMigration[] = [];

  constructor(options: InitRollOptions) {
    return;
  }

  addMigration(migration: InitRollMigration) {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async migrate() {
    for (const migration of this.migrations) {
      await migration.run();
    }
  }
}
