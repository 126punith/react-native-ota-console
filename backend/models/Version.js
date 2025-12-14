const pool = require('../config/database');

class Version {
  static async create(data) {
    const {
      appId,
      versionName,
      versionCode,
      updateType,
      apkPath,
      bundlePath,
      releaseNotes,
      createdBy
    } = data;

    console.log(`  [DB] Executing INSERT into versions table...`);
    console.log(`  [DB] Parameters:`, {
      appId,
      versionName,
      versionCode,
      updateType,
      apkPath: apkPath ? apkPath.substring(apkPath.lastIndexOf('/') + 1) : null,
      bundlePath: bundlePath || null,
      releaseNotesLength: releaseNotes?.length || 0,
      createdBy
    });

    const result = await pool.query(
      `INSERT INTO versions (app_id, version_name, version_code, update_type, apk_path, bundle_path, release_notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [appId, versionName, versionCode, updateType, apkPath, bundlePath, releaseNotes, createdBy]
    );
    
    console.log(`  [DB] ✓ INSERT successful, returned ${result.rows.length} row(s)`);
    console.log(`  [DB] Inserted version ID: ${result.rows[0].id}`);
    
    return result.rows[0];
  }

  static async findAll(appId = null) {
    let query = 'SELECT * FROM versions WHERE is_active = true';
    let params = [];

    if (appId) {
      query += ' AND app_id = $1';
      params.push(appId);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM versions WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0];
  }

  static async findByAppIdAndVersionCode(appId, versionCode) {
    const result = await pool.query(
      'SELECT * FROM versions WHERE app_id = $1 AND version_code = $2 AND is_active = true',
      [appId, versionCode]
    );
    return result.rows[0];
  }

  static async findLatest(appId) {
    const result = await pool.query(
      `SELECT * FROM versions 
       WHERE app_id = $1 AND is_active = true 
       ORDER BY version_code DESC 
       LIMIT 1`,
      [appId]
    );
    return result.rows[0];
  }

  static async findUpdates(appId, currentVersionCode) {
    const result = await pool.query(
      `SELECT * FROM versions 
       WHERE app_id = $1 AND version_code > $2 AND is_active = true 
       ORDER BY version_code ASC`,
      [appId, currentVersionCode]
    );
    return result.rows;
  }

  static async delete(id) {
    const result = await pool.query(
      'UPDATE versions SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Version;

