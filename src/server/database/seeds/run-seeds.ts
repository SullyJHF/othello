#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { Database } from '../Database';

async function runSeeds() {
  console.log('🌱 Starting database seeding...');

  // Enable database connection in test mode
  if (process.env.NODE_ENV === 'test') {
    process.env.DATABASE_TEST_MODE = 'true';
  }

  const db = Database.getInstance();

  try {
    // Get all seed files
    const seedsPath = path.join(__dirname, './');
    const seedFiles = fs
      .readdirSync(seedsPath)
      .filter((file) => file.endsWith('.sql') && file.match(/^\d{3}_/))
      .sort();

    console.log(`📋 Found ${seedFiles.length} seed files`);

    // Execute each seed file
    for (const file of seedFiles) {
      console.log(`🌱 Running seed: ${file}`);
      const filePath = path.join(seedsPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await db.transaction(async (client) => {
        await client.query(sql);
      });

      console.log(`✅ Seed completed: ${file}`);
    }

    console.log('✅ All seeds completed successfully!');
    process.exit(0);
  } catch (error: any) {
    // Handle duplicate key errors gracefully - this is expected when re-running seeds
    if (error.code === '23505') {
      console.log(`⚠️  Seed data already exists - this is normal when re-running the setup`);
      console.log(`💡 Database is already seeded with initial data`);
      process.exit(0);
    }

    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Clean up database connection
    await db.close();
  }
}

runSeeds();
