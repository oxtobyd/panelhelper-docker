import { pool } from '../db.js';

export async function recordImport(importType, success, details) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO import_history 
        (import_type, success, filename) 
       VALUES ($1, $2, $3)`,
      [
        importType,
        success,
        details.fileName || null
      ]
    );
  } finally {
    client.release();
  }
}

export async function getImportHistory() {
  const result = await pool.query(`
    SELECT 
      import_type,
      MAX(imported_at) as last_import,
      MAX(CASE WHEN import_type = 'rawData' THEN imported_at END) as rawDataLastImport,
      MAX(CASE WHEN import_type = 'outcomes' THEN imported_at END) as outcomesLastImport
    FROM import_history
    WHERE success = true
    GROUP BY import_type
  `);
  return result.rows[0] || null;
}
