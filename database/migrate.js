const fs = require('fs');
const path = require('path');

// Add backend node_modules to the module resolution path
const backendPath = path.join(__dirname, '../backend');
if (!module.paths.includes(path.join(backendPath, 'node_modules'))) {
  module.paths.unshift(path.join(backendPath, 'node_modules'));
}

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(backendPath, '.env') });

// Now require backend modules
const pool = require(path.join(backendPath, 'config/database'));

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log('Starting database migrations...');

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`✓ Migrated: ${file}`);
    } catch (error) {
      console.error(`✗ Error migrating ${file}:`, error.message);
      throw error;
    }
  }

  console.log('All migrations completed successfully!');
  await pool.end();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

