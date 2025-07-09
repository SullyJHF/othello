#!/usr/bin/env tsx

import { Database } from '../Database';
import { MigrationRunner } from './MigrationRunner';

async function runMigrations() {
  console.log('🚀 Starting database migrations...');

  // Enable database connection in test mode
  if (process.env.NODE_ENV === 'test') {
    process.env.DATABASE_TEST_MODE = 'true';
  }

  const migrationRunner = new MigrationRunner();

  try {
    await migrationRunner.runMigrations();
    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Clean up database connection
    const db = Database.getInstance();
    await db.close();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
  console.log('🔄 Rolling back last migration...');

  // Enable database connection in test mode
  if (process.env.NODE_ENV === 'test') {
    process.env.DATABASE_TEST_MODE = 'true';
  }

  const migrationRunner = new MigrationRunner();
  migrationRunner
    .rollbackLastMigration()
    .then(() => {
      console.log('✅ Rollback completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      const db = Database.getInstance();
      await db.close();
    });
} else {
  runMigrations();
}
