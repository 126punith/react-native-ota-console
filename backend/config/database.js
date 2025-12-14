const { Pool } = require('pg');
require('dotenv').config();

// Build connection config - prioritize connection string if provided
// On macOS with Homebrew, default user is the current macOS user
const defaultUser = process.platform === 'darwin' ? process.env.USER : 'postgres';

const config = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
} : {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ota_console',
  user: process.env.DB_USER || defaultUser,
  password: process.env.DB_PASSWORD || '',
};

const pool = new Pool(config);

// Test database connection
pool.connect()
  .then((client) => {
    console.log('✓ Connected to PostgreSQL database');
    client.release();
  })
  .catch((err) => {
    console.error('✗ Database connection error:');
    console.error('  Please ensure PostgreSQL is running and the database exists.');
    console.error(`  Connection details: ${config.host || 'connection string'}:${config.port || 'N/A'}/${config.database || 'N/A'}`);
    console.error('  Error:', err.message);
    console.error('\n  To fix:');
    console.error('  1. Start PostgreSQL: brew services start postgresql (macOS) or systemctl start postgresql (Linux)');
    console.error('  2. Create database: createdb ota_console');
    console.error('  3. Run migrations: npm run migrate (from backend directory)');
    // Don't exit - let the server start but operations will fail gracefully
  });

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
  // Don't exit on pool errors - let the app continue
});

module.exports = pool;

