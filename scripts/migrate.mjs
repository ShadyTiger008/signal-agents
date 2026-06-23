import fs from 'fs';
import path from 'path';
import pg from 'pg';

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: Please provide a PostgreSQL connection string.');
  console.log('Usage: node scripts/migrate.mjs "postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres"');
  process.exit(1);
}

const { Client } = pg;

async function runMigrations() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to the database successfully.');

    // Get all SQL files from migrations directory
    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Run in order (0001, 0002, 0003, etc.)

    console.log(`Found ${files.length} migration files.`);

    for (const file of files) {
      console.log(`\nExecuting migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute SQL content
      await client.query(sql);
      console.log(`Completed migration: ${file}`);
    }

    console.log('\nAll migrations executed successfully!');
  } catch (err) {
    console.error('Error executing migrations:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
