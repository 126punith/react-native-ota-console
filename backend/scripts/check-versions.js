const path = require('path');

// Add backend node_modules to the module resolution path
const backendPath = __dirname.replace('/scripts', '');
if (!module.paths.includes(path.join(backendPath, 'node_modules'))) {
  module.paths.unshift(path.join(backendPath, 'node_modules'));
}

require('dotenv').config({ path: path.join(backendPath, '.env') });
const pool = require(path.join(backendPath, 'config/database'));
const fs = require('fs');

async function checkVersions() {
  try {
    console.log('Checking APK versions in database...\n');
    
    const result = await pool.query(`
      SELECT v.*, u.email as created_by_email 
      FROM versions v 
      LEFT JOIN users u ON v.created_by = u.id 
      WHERE v.is_active = true 
      ORDER BY v.created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No versions found in database.');
      console.log('   Upload an APK first through the frontend or API.');
    } else {
      console.log(`✓ Found ${result.rows.length} version(s):\n`);
      
      result.rows.forEach((version, index) => {
        console.log(`Version #${index + 1}:`);
        console.log(`  ID: ${version.id}`);
        console.log(`  App ID: ${version.app_id}`);
        console.log(`  Version Name: ${version.version_name}`);
        console.log(`  Version Code: ${version.version_code}`);
        console.log(`  Update Type: ${version.update_type}`);
        console.log(`  APK Path: ${version.apk_path}`);
        
        // Check if file exists
        const fileExists = version.apk_path ? fs.existsSync(version.apk_path) : false;
        const fileStatus = fileExists ? '✓ EXISTS' : '❌ MISSING';
        console.log(`  APK File Status: ${fileStatus}`);
        
        if (fileExists && version.apk_path) {
          try {
            const stats = fs.statSync(version.apk_path);
            console.log(`  APK File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          } catch (err) {
            console.log(`  APK File Size: Could not read`);
          }
        }
        
        if (version.bundle_path) {
          console.log(`  Bundle Path: ${version.bundle_path}`);
        }
        
        if (version.release_notes) {
          const notes = version.release_notes.length > 50 
            ? version.release_notes.substring(0, 50) + '...' 
            : version.release_notes;
          console.log(`  Release Notes: ${notes}`);
        }
        
        console.log(`  Created By: ${version.created_by_email || `User ID: ${version.created_by}`}`);
        console.log(`  Created At: ${new Date(version.created_at).toLocaleString()}`);
        console.log('');
      });
      
      // Summary
      console.log('Summary:');
      const byApp = {};
      result.rows.forEach(v => {
        byApp[v.app_id] = (byApp[v.app_id] || 0) + 1;
      });
      
      console.log(`  Total Versions: ${result.rows.length}`);
      console.log(`  Apps: ${Object.keys(byApp).length}`);
      Object.entries(byApp).forEach(([appId, count]) => {
        console.log(`    - ${appId}: ${count} version(s)`);
      });
      
      const missingFiles = result.rows.filter(v => v.apk_path && !fs.existsSync(v.apk_path));
      if (missingFiles.length > 0) {
        console.log(`\n⚠️  Warning: ${missingFiles.length} version(s) have missing APK files`);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error checking versions:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nDatabase connection failed. Make sure PostgreSQL is running.');
    } else if (error.code === '42P01') {
      console.error('\nVersions table not found. Run migrations: npm run migrate');
    }
    process.exit(1);
  }
}

checkVersions();

