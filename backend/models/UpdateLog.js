const pool = require('../config/database');

class UpdateLog {
  static async create(data) {
    const {
      appId,
      fromVersion,
      toVersion,
      updateType,
      deviceId,
      status
    } = data;

    const result = await pool.query(
      `INSERT INTO update_logs (app_id, from_version, to_version, update_type, device_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [appId, fromVersion, toVersion, updateType, deviceId, status]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status, errorMessage = null) {
    const result = await pool.query(
      `UPDATE update_logs 
       SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, errorMessage, id]
    );
    return result.rows[0];
  }

  static async findByAppId(appId, limit = 100) {
    const result = await pool.query(
      `SELECT * FROM update_logs 
       WHERE app_id = $1 
       ORDER BY updated_at DESC 
       LIMIT $2`,
      [appId, limit]
    );
    return result.rows;
  }
}

module.exports = UpdateLog;

