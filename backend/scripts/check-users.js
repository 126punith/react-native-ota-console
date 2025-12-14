const path = require('path');

// Add backend node_modules to the module resolution path
const backendPath = __dirname.replace('/scripts', '');
if (!module.paths.includes(path.join(backendPath, 'node_modules'))) {
  module.paths.unshift(path.join(backendPath, 'node_modules'));
}

require('dotenv').config({ path: path.join(backendPath, '.env') });
const pool = require(path.join(backendPath, 'config/database'));

async function checkUsers() {
  try {
    console.log('Checking users in database...\n');
    
    const result = await pool.query('SELECT id, email, password_hash, created_at FROM users ORDER BY created_at DESC');
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database.');
      console.log('   Register a user first through the frontend or API.');
    } else {
      console.log(`✓ Found ${result.rows.length} user(s):\n`);
      
      result.rows.forEach((user, index) => {
        console.log(`User #${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Password Hash: ${user.password_hash.substring(0, 20)}... (hashed, not plain text)`);
        console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error checking users:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nDatabase connection failed. Make sure PostgreSQL is running.');
    } else if (error.code === '42P01') {
      console.error('\nUsers table not found. Run migrations: npm run migrate');
    }
    process.exit(1);
  }
}

checkUsers();

