/**
 * Fix APK paths in database that point to old project directory
 * 
 * This script updates APK paths from /console_project/ to /react-native-ota-console/
 * Run with: node scripts/fix-apk-paths.js
 */

const Version = require('../models/Version');
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function fixApkPaths() {
  try {
    console.log('🔍 Checking for APK paths with incorrect directory...\n');
    
    // Get all versions
    const versions = await pool.query('SELECT * FROM versions WHERE apk_path IS NOT NULL');
    
    if (versions.rows.length === 0) {
      console.log('✅ No versions with APK paths found');
      return;
    }
    
    let fixedCount = 0;
    let notFoundCount = 0;
    
    for (const version of versions.rows) {
      const oldPath = version.apk_path;
      
      // Check if path contains old directory
      if (oldPath.includes('/console_project/')) {
        const newPath = oldPath.replace('/console_project/', '/react-native-ota-console/');
        
        console.log(`📦 Version ${version.id} (${version.version_name}):`);
        console.log(`   Old: ${oldPath}`);
        console.log(`   New: ${newPath}`);
        
        // Check if file exists at new path
        if (fs.existsSync(newPath)) {
          // Update database
          await pool.query(
            'UPDATE versions SET apk_path = $1 WHERE id = $2',
            [newPath, version.id]
          );
          console.log(`   ✅ Updated path in database\n`);
          fixedCount++;
        } else {
          console.log(`   ❌ File not found at new path\n`);
          notFoundCount++;
        }
      } else {
        // Verify current path exists
        if (!fs.existsSync(oldPath)) {
          console.log(`⚠️  Version ${version.id} (${version.version_name}):`);
          console.log(`   Path: ${oldPath}`);
          console.log(`   ❌ File not found (but path looks correct)\n`);
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Fixed: ${fixedCount}`);
    console.log(`   ❌ Not found: ${notFoundCount}`);
    console.log(`   ✅ Total checked: ${versions.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing APK paths:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixApkPaths()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = fixApkPaths;


