import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...');
  console.log('📊 Database URL:', databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
    });
    
    // Read and run SQL migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const sqlFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of sqlFiles) {
      console.log(`📄 Running migration: ${file}`);
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      
      // Split by statement-breakpoint and execute each statement
      const statements = sql.split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await pool.query(statement);
          console.log(`  ✅ Statement executed successfully`);
        } catch (error) {
          // Ignore "already exists" errors for idempotent migrations
          if (error.code === '42P07') { // duplicate_table
            console.log(`  ⚠️  Table already exists, skipping`);
          } else if (error.code === '42710') { // duplicate_object (constraint/index)
            console.log(`  ⚠️  Constraint/index already exists, skipping`);
          } else if (error.code === '42701') { // duplicate_column
            console.log(`  ⚠️  Column already exists, skipping`);
          } else {
            throw error;
          }
        }
      }
      
      console.log(`✅ Completed: ${file}`);
    }
    
    console.log('✅ All migrations completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  }
}

runMigrations();
