import fs from 'fs';
import path from 'path';
import { Database } from '../Database';

interface Migration {
  id: number;
  name: string;
  filename: string;
  executed: boolean;
  executedAt?: Date;
}

export class MigrationRunner {
  private db: Database;
  private migrationsPath: string;

  constructor() {
    this.db = Database.getInstance();
    this.migrationsPath = path.join(__dirname, './');
  }

  public async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async runMigrations(): Promise<void> {
    await this.initialize();

    const migrationFiles = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();

    console.log(`📋 Found ${migrationFiles.length} migration files`);
    console.log(`✅ ${executedMigrations.length} migrations already executed`);

    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file.name)) {
        console.log(`🚀 Running migration: ${file.name}`);
        await this.executeMigration(file);
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  private getMigrationFiles(): Array<{ name: string; filename: string }> {
    const files = fs
      .readdirSync(this.migrationsPath)
      .filter((file) => file.endsWith('.sql') && file.match(/^\d{3}_/))
      .sort()
      .map((filename) => ({
        name: filename.replace('.sql', ''),
        filename,
      }));

    return files;
  }

  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.db.query('SELECT name FROM schema_migrations ORDER BY id');
      return result.rows.map((row: any) => row.name);
    } catch (error) {
      console.warn('Migration table might not exist yet, will be created');
      return [];
    }
  }

  private async executeMigration(migration: { name: string; filename: string }): Promise<void> {
    const filePath = path.join(this.migrationsPath, migration.filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    await this.db.transaction(async (client) => {
      // Execute the migration SQL
      await client.query(sql);

      // Record the migration as executed
      await client.query('INSERT INTO schema_migrations (name, filename) VALUES ($1, $2)', [
        migration.name,
        migration.filename,
      ]);
    });

    console.log(`✅ Migration completed: ${migration.name}`);
  }

  public async rollbackLastMigration(): Promise<void> {
    // Get the last executed migration
    const result = await this.db.query('SELECT name, filename FROM schema_migrations ORDER BY id DESC LIMIT 1');

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0];
    const rollbackFile = lastMigration.filename.replace('.sql', '.rollback.sql');
    const rollbackPath = path.join(this.migrationsPath, rollbackFile);

    if (!fs.existsSync(rollbackPath)) {
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }

    const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

    await this.db.transaction(async (client) => {
      // Execute rollback SQL
      await client.query(rollbackSql);

      // Remove migration record
      await client.query('DELETE FROM schema_migrations WHERE name = $1', [lastMigration.name]);
    });

    console.log(`🔄 Rollback completed: ${lastMigration.name}`);
  }
}
